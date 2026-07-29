import logging
from typing import Any, Callable, Dict, List
from collections import defaultdict

logger = logging.getLogger(__name__)


class EventBus:
    _instance = None
    _handlers: Dict[str, List[Callable]] = defaultdict(list)

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def subscribe(self, event_type: str, handler: Callable):
        if handler not in self._handlers[event_type]:
            self._handlers[event_type].append(handler)
            logger.debug('Handler %s registrado para evento %s', handler.__name__, event_type)

    def unsubscribe(self, event_type: str, handler: Callable):
        if handler in self._handlers.get(event_type, []):
            self._handlers[event_type].remove(handler)

    def publish(self, event_type: str, data: Dict[str, Any], source: str = ''):
        from apps.events.models import Event, EventStatus, EventType
        import traceback
        logger.warning('EVENTBUS_PUBLISH: event_type=%s source=%s data_keys=%s caller=%s',
                        event_type, source, list(data.keys() if data else []),
                        traceback.format_stack()[-2].strip())
        Event.objects.create(
            event_type=event_type,
            data=data,
            source=source or 'event_bus',
        )
        handlers = list(self._handlers.get(event_type, []))
        logger.warning('EVENTBUS_HANDLERS: event_type=%s handlers=%s', event_type, [h.__name__ for h in handlers])
        for handler in handlers:
            try:
                handler(event_type=event_type, data=data, source=source)
            except Exception as e:
                logger.exception('Erro no handler %s para evento %s: %s', handler.__name__, event_type, e)


event_bus = EventBus()
