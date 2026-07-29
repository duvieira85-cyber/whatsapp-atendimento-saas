import logging
from typing import Optional
from django.db import transaction
from django.utils import timezone

from ..models import Transfer, TransferStatus, Conversation, Participant
from ..state_machine import ConversationStateMachine
from .conversation_service import ConversationService
from apps.core.event_bus import event_bus
from apps.core.domain_events import ConversationTransferred

logger = logging.getLogger(__name__)


class TransferService:

    def __init__(self, user=None, company=None):
        self.user = user
        self.company = company
        self.conversation_service = ConversationService(user, company)

    def _get_from_attendant(self, conversation):
        return conversation.attendant

    def _get_from_department(self, conversation):
        return conversation.department

    @transaction.atomic
    def request_transfer(self, conversation, to_attendant=None, to_department=None, reason=''):
        transfer = Transfer.objects.create(
            company=self.company,
            conversation=conversation,
            requested_by=self.user,
            from_attendant=self._get_from_attendant(conversation),
            to_attendant=to_attendant,
            from_department=self._get_from_department(conversation),
            to_department=to_department,
            reason=reason,
            status=TransferStatus.PENDING,
        )

        self.conversation_service.transfer(
            conversation,
            to_attendant=to_attendant,
            to_department=to_department,
            reason=reason,
            requested_by=self.user,
        )
        transfer.status = TransferStatus.ACCEPTED
        transfer.save(update_fields=['status'])

        return transfer

    @transaction.atomic
    def accept_transfer(self, transfer):
        if transfer.status != TransferStatus.PENDING:
            raise ValueError(f'Transferência já {transfer.get_status_display()}')

        conversation = transfer.conversation
        self.conversation_service.transfer(
            conversation,
            to_attendant=self.user,
            to_department=transfer.to_department,
            reason=transfer.reason,
            requested_by=transfer.requested_by,
        )

        transfer.status = TransferStatus.ACCEPTED
        transfer.resolved_at = timezone.now()
        transfer.save(update_fields=['status', 'resolved_at'])

    @transaction.atomic
    def reject_transfer(self, transfer):
        if transfer.status != TransferStatus.PENDING:
            raise ValueError(f'Transferência já {transfer.get_status_display()}')

        conversation = transfer.conversation
        conversation.status = ConversationStatus.ACTIVE
        conversation.save(update_fields=['status', 'updated_at'])

        transfer.status = TransferStatus.REJECTED
        transfer.resolved_at = timezone.now()
        transfer.save(update_fields=['status', 'resolved_at'])

    @transaction.atomic
    def cancel_transfer(self, transfer):
        if transfer.status != TransferStatus.PENDING:
            raise ValueError(f'Transferência já {transfer.get_status_display()}')

        conversation = transfer.conversation
        conversation.status = ConversationStatus.ACTIVE
        conversation.save(update_fields=['status', 'updated_at'])

        transfer.status = TransferStatus.CANCELLED
        transfer.resolved_at = timezone.now()
        transfer.save(update_fields=['status', 'resolved_at'])

    def get_pending_transfers(self, user):
        return Transfer.objects.filter(
            company=self.company,
            to_attendant=user,
            status=TransferStatus.PENDING,
        ).select_related('conversation', 'conversation__client', 'from_attendant')
