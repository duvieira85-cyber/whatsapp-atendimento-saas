import json
import logging
from django.http import JsonResponse, HttpRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from apps.integrations.models import Integration
from apps.channels.models import ChannelStatus
from apps.integrations.services.evolution_service import EvolutionService
from apps.conversations.services.inbound import InboundPipeline, Normalizer

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def evolution_webhook(request: HttpRequest, integration_id: str | None = None):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid_json'}, status=400)

    if integration_id is None:
        instance_field = data.get('instance', '')
        if not instance_field:
            return JsonResponse({'error': 'instance_name_required'}, status=400)
        qs = Integration.objects.select_related('company').filter(is_active=True)
        integration = qs.filter(name=instance_field).first() or qs.filter(
            config__instance_name=instance_field
        ).first()
        if not integration:
            return JsonResponse({'error': 'integration_not_found'}, status=404)
        integration_id = str(integration.id)
    else:
        try:
            integration = Integration.objects.select_related('company').get(id=integration_id)
        except Integration.DoesNotExist:
            return JsonResponse({'error': 'integration_not_found'}, status=404)

    if not integration.is_active:
        return JsonResponse({'error': 'integration_inactive'}, status=400)

    logger.info('Evolution webhook received for integration %s', integration_id)

    svc = EvolutionService(integration)
    event_type = data.get('event', data.get('type', ''))

    if event_type in ('connection.update', 'status.update', 'STATE_CHANGE'):
        svc.handle_webhook_status(data)
        return JsonResponse({'status': 'ok'})

    if event_type in ('messages.upsert', 'message.create', 'MESSAGE_CREATE'):
        message_data = data.get('data', data.get('message', {})) or data

        if isinstance(message_data, dict):
            message_key = message_data.get('key', {})
            remote_jid = message_key.get('remoteJid', '')
            push_name = message_data.get('pushName', '')
            msg_content = message_data.get('message', {})

            text = ''
            msg_type = 'text'
            if 'conversation' in msg_content:
                text = msg_content['conversation']
            elif 'extendedTextMessage' in msg_content:
                text = msg_content['extendedTextMessage'].get('text', '')
            elif 'imageMessage' in msg_content:
                text = msg_content['imageMessage'].get('caption', '')
                msg_type = 'image'

            if not remote_jid or not text:
                return JsonResponse({'error': 'ignored'})

            phone = remote_jid.split('@')[0]

            normalized_data = {
                'channel_id': str(svc._get_or_create_channel().id),
                'messageId': message_key.get('id', ''),
                'sender': phone,
                'senderName': push_name or phone,
                'message': {
                    'text': text,
                    'type': msg_type,
                },
                'timestamp': str(message_data.get('messageTimestamp', '')),
            }

            normalized = Normalizer.evolution(normalized_data)
            if not normalized:
                return JsonResponse({'error': 'normalization_failed'}, status=400)

            pipeline = InboundPipeline(company=integration.company)
            result = pipeline.process(normalized)
            return JsonResponse(result)

    return JsonResponse({'status': 'ignored', 'event': event_type})
