from dataclasses import dataclass, field, asdict
from typing import Any, Dict, Optional
from datetime import datetime


@dataclass
class DomainEvent:
    event_type: str
    aggregate_id: str
    company_id: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ConversationCreated(DomainEvent):
    def __init__(self, conversation_id: str, company_id: str, client_id: str, channel_id: str, **kwargs):
        super().__init__('conversation.created', conversation_id, company_id,
                         metadata={'client_id': client_id, 'channel_id': channel_id, **kwargs})


class ConversationAssigned(DomainEvent):
    def __init__(self, conversation_id: str, company_id: str, attendant_id: str, **kwargs):
        super().__init__('conversation.assigned', conversation_id, company_id,
                         metadata={'attendant_id': attendant_id, **kwargs})


class ConversationTransferred(DomainEvent):
    def __init__(self, conversation_id: str, company_id: str, from_attendant_id: Optional[str],
                 to_attendant_id: Optional[str], from_department_id: Optional[str],
                 to_department_id: Optional[str], reason: str = '', **kwargs):
        super().__init__('conversation.transferred', conversation_id, company_id,
                         metadata={'from_attendant_id': from_attendant_id,
                                   'to_attendant_id': to_attendant_id,
                                   'from_department_id': from_department_id,
                                   'to_department_id': to_department_id,
                                   'reason': reason, **kwargs})


class ConversationClosed(DomainEvent):
    def __init__(self, conversation_id: str, company_id: str, closed_by_id: str, **kwargs):
        super().__init__('conversation.closed', conversation_id, company_id,
                         metadata={'closed_by_id': closed_by_id, **kwargs})


class ConversationReopened(DomainEvent):
    def __init__(self, conversation_id: str, company_id: str, reopened_by_id: str, **kwargs):
        super().__init__('conversation.reopened', conversation_id, company_id,
                         metadata={'reopened_by_id': reopened_by_id, **kwargs})


class MessageReceived(DomainEvent):
    def __init__(self, message_id: str, company_id: str, conversation_id: str,
                 client_id: str, content: str, message_type: str, **kwargs):
        super().__init__('message.received', message_id, company_id,
                         metadata={'conversation_id': conversation_id, 'client_id': client_id,
                                   'content': content, 'message_type': message_type, **kwargs})


class MessageSent(DomainEvent):
    def __init__(self, message_id: str, company_id: str, conversation_id: str,
                 attendant_id: str, content: str, message_type: str, **kwargs):
        super().__init__('message.sent', message_id, company_id,
                         metadata={'conversation_id': conversation_id, 'attendant_id': attendant_id,
                                   'content': content, 'message_type': message_type, **kwargs})


class QueueEntered(DomainEvent):
    def __init__(self, conversation_id: str, company_id: str, queue_id: str, **kwargs):
        super().__init__('queue.entered', conversation_id, company_id,
                         metadata={'queue_id': queue_id, **kwargs})


class QueueLeft(DomainEvent):
    def __init__(self, conversation_id: str, company_id: str, queue_id: str, **kwargs):
        super().__init__('queue.left', conversation_id, company_id,
                         metadata={'queue_id': queue_id, **kwargs})


class UserOnline(DomainEvent):
    def __init__(self, user_id: str, company_id: str, **kwargs):
        super().__init__('user.online', user_id, company_id, **kwargs)


class UserOffline(DomainEvent):
    def __init__(self, user_id: str, company_id: str, **kwargs):
        super().__init__('user.offline', user_id, company_id, **kwargs)


class SLAExpired(DomainEvent):
    def __init__(self, conversation_id: str, company_id: str, queue_id: str,
                 wait_time: int, **kwargs):
        super().__init__('sla.expired', conversation_id, company_id,
                         metadata={'queue_id': queue_id, 'wait_time': wait_time, **kwargs})


class ChannelDisconnected(DomainEvent):
    def __init__(self, channel_id: str, company_id: str, **kwargs):
        super().__init__('channel.disconnected', channel_id, company_id, **kwargs)
