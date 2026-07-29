import logging
from typing import Optional
from django.db import transaction

from ..models import Queue, Conversation, ConversationStatus
from ..state_machine import ConversationStateMachine
from .timeline_service import TimelineService
from apps.core.domain_events import QueueEntered, QueueLeft
from apps.core.event_bus import event_bus

logger = logging.getLogger(__name__)


class QueueService:

    def __init__(self, company):
        self.company = company

    @transaction.atomic
    def enqueue(self, conversation: Conversation, queue: Queue):
        if conversation.queue_id == queue.id:
            return conversation

        old_queue_id = str(conversation.queue_id) if conversation.queue_id else None
        conversation.queue = queue
        conversation.status = ConversationStatus.WAITING
        conversation.attendant = None
        conversation.save(update_fields=['queue', 'status', 'attendant', 'updated_at'])

        TimelineService(conversation).queue_entered(queue.name, queue_id=str(queue.id))

        if old_queue_id:
            transaction.on_commit(lambda: event_bus.publish('queue.left', QueueLeft(
                conversation_id=str(conversation.id),
                company_id=str(self.company.id),
                queue_id=old_queue_id,
            ).to_dict(), source='queue_service'))

        transaction.on_commit(lambda: event_bus.publish('queue.entered', QueueEntered(
            conversation_id=str(conversation.id),
            company_id=str(self.company.id),
            queue_id=str(queue.id),
        ).to_dict(), source='queue_service'))

        return conversation

    @transaction.atomic
    def dequeue(self, conversation: Conversation):
        if not conversation.queue:
            return conversation

        queue_id = str(conversation.queue.id)
        conversation.queue = None
        conversation.save(update_fields=['queue', 'updated_at'])

        TimelineService(conversation).queue_left(queue.name)

        transaction.on_commit(lambda: event_bus.publish('queue.left', QueueLeft(
            conversation_id=str(conversation.id),
            company_id=str(self.company.id),
            queue_id=queue_id,
        ).to_dict(), source='queue_service'))

    def get_queue_position(self, conversation: Conversation) -> Optional[int]:
        if not conversation.queue_id:
            return None
        older = Conversation.objects.filter(
            company=self.company,
            queue=conversation.queue,
            status=ConversationStatus.WAITING,
            created_at__lt=conversation.created_at,
        ).count()
        return older + 1

    def get_waiting_count(self, queue: Queue) -> int:
        return Conversation.objects.filter(
            company=self.company,
            queue=queue,
            status=ConversationStatus.WAITING,
        ).count()

    def get_next_from_queue(self, queue: Queue):
        return Conversation.objects.filter(
            company=self.company,
            queue=queue,
            status=ConversationStatus.WAITING,
        ).order_by('created_at').first()
