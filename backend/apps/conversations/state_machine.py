from django.utils.translation import gettext_lazy as _
from .models import ConversationStatus


class InvalidTransitionError(Exception):
    def __init__(self, from_status: str, to_status: str):
        self.from_status = from_status
        self.to_status = to_status
        super().__init__(_('Transição inválida: %(from)s → %(to)s') % {'from': from_status, 'to': to_status})


STATUS_FLOW = {
    ConversationStatus.WAITING: [ConversationStatus.WAITING, ConversationStatus.ACTIVE, ConversationStatus.CLOSED],
    ConversationStatus.ACTIVE: [ConversationStatus.WAITING, ConversationStatus.TRANSFERRED, ConversationStatus.CLOSED],
    ConversationStatus.TRANSFERRED: [ConversationStatus.ACTIVE, ConversationStatus.WAITING, ConversationStatus.CLOSED],
    ConversationStatus.CLOSED: [ConversationStatus.WAITING],
}


class ConversationStateMachine:

    @classmethod
    def can_transition(cls, from_status: str, to_status: str) -> bool:
        allowed = STATUS_FLOW.get(from_status, [])
        return to_status in allowed

    @classmethod
    def get_allowed_transitions(cls, current_status: str) -> list:
        return STATUS_FLOW.get(current_status, [])

    @classmethod
    def validate(cls, from_status: str, to_status: str):
        if not cls.can_transition(from_status, to_status):
            raise InvalidTransitionError(from_status, to_status)

    @classmethod
    def assign(cls, conversation):
        cls.validate(conversation.status, ConversationStatus.ACTIVE)
        conversation.status = ConversationStatus.ACTIVE

    @classmethod
    def transfer(cls, conversation):
        cls.validate(conversation.status, ConversationStatus.TRANSFERRED)
        conversation.status = ConversationStatus.TRANSFERRED

    @classmethod
    def close(cls, conversation):
        cls.validate(conversation.status, ConversationStatus.CLOSED)
        conversation.status = ConversationStatus.CLOSED

    @classmethod
    def reopen(cls, conversation):
        cls.validate(conversation.status, ConversationStatus.WAITING)
        conversation.status = ConversationStatus.WAITING

    @classmethod
    def start_waiting(cls, conversation):
        cls.validate(conversation.status, ConversationStatus.WAITING)
        conversation.status = ConversationStatus.WAITING
