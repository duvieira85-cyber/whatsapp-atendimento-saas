import logging
from typing import Any, Dict
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from apps.core.event_bus import event_bus

logger = logging.getLogger(__name__)

channel_layer = get_channel_layer()

EVENT_GROUP_MAP = {
    'conversation.created': ['company.{company_id}', 'queue.{queue_id}'],
    'conversation.assigned': ['company.{company_id}', 'conversation.{conversation_id}', 'user.{attendant_id}'],
    'conversation.transferred': ['company.{company_id}', 'conversation.{conversation_id}'],
    'conversation.closed': ['company.{company_id}', 'conversation.{conversation_id}'],
    'conversation.reopened': ['company.{company_id}', 'conversation.{conversation_id}', 'queue.{queue_id}'],
    'message.received': ['company.{company_id}', 'conversation.{conversation_id}', 'queue.{queue_id}'],
    'message.sent': ['company.{company_id}', 'conversation.{conversation_id}'],
    'queue.entered': ['company.{company_id}', 'queue.{queue_id}'],
    'queue.left': ['company.{company_id}', 'queue.{queue_id}'],
    'user.online': ['company.{company_id}'],
    'user.offline': ['company.{company_id}'],
    'channel.disconnected': ['company.{company_id}'],
    'sla.expired': ['company.{company_id}', 'queue.{queue_id}'],
}


def _extract(data: Dict[str, Any], keys: list) -> Dict[str, str]:
    result = {}
    meta = data.get('metadata', {})
    for key in keys:
        val = meta.get(key) or data.get(key) or data.get('aggregate_id', '')
        if val:
            result[key] = str(val)
    return result


def dispatch_event(event_type: str, data: Dict[str, Any], source: str = ''):
    logger.warning('DISPATCHER_CALLED: event_type=%s source=%s', event_type, source)
    if event_type not in EVENT_GROUP_MAP:
        logger.warning('DISPATCHER_SKIP: event_type=%s not in EVENT_GROUP_MAP', event_type)
        return

    meta = data.get('metadata', {})
    company_id = data.get('company_id', '')
    conversation_id = meta.get('conversation_id', data.get('aggregate_id', ''))
    queue_id = meta.get('queue_id', '')
    attendant_id = meta.get('attendant_id', '')

    groups = []
    for pattern in EVENT_GROUP_MAP[event_type]:
        group = pattern.format(
            company_id=company_id,
            conversation_id=conversation_id,
            queue_id=queue_id,
            attendant_id=attendant_id,
        )
        groups.append(group)

    if company_id and 'company.global' not in groups:
        groups.append('company.global')

    message = {
        'type': 'event.notify',
        'data': {
            'event_type': event_type,
            'conversation_id': conversation_id,
            'company_id': company_id,
            'metadata': meta,
            'timestamp': data.get('timestamp', ''),
        },
    }

    logger.warning('DISPATCHER_SENDING: event_type=%s groups=%s message_type=%s',
                    event_type, groups, message['type'])
    logger.warning('DISPATCHER_CHANNEL_LAYER: type=%s', type(channel_layer).__name__)

    for group in groups:
        try:
            async_to_sync(channel_layer.group_send)(group, message)
            logger.warning('DISPATCHER_SENT: group=%s OK', group)
        except Exception as e:
            logger.exception('DISPATCHER_ERROR: group=%s error=%s', group, e)

    logger.warning('DISPATCHER_DONE: event_type=%s groups=%s', event_type, groups)


def register_handlers():
    event_bus.subscribe('*', dispatch_event)

    event_types = list(EVENT_GROUP_MAP.keys())
    for event_type in event_types:
        event_bus.subscribe(event_type, dispatch_event)
        logger.debug('Dispatcher registrado para evento: %s', event_type)

    logger.info('WebSocket Dispatcher inicializado com %d tipos de evento', len(event_types))


register_handlers()
