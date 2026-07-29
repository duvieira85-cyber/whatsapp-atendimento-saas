import logging
from typing import Optional
from django.utils import timezone
from django.db import transaction

from ..models import Conversation, ConversationStatus, ConversationPriority, Participant
from ..state_machine import ConversationStateMachine
from .timeline_service import TimelineService
from apps.core.domain_events import (
    ConversationCreated, ConversationAssigned, ConversationTransferred,
    ConversationClosed, ConversationReopened, QueueEntered, QueueLeft,
)
from apps.core.event_bus import event_bus

logger = logging.getLogger(__name__)


class ConversationService:

    def __init__(self, user=None, company=None):
        self.user = user
        self.company = company

    @transaction.atomic
    def create_conversation(self, client, channel=None, queue=None, department=None,
                            priority=ConversationPriority.NORMAL, metadata=None):
        from ..models import Conversation
        conversation = Conversation.objects.create(
            company=self.company,
            client=client,
            channel=channel,
            queue=queue,
            department=department,
            priority=priority,
            status=ConversationStatus.WAITING,
            metadata=metadata or {},
        )
        timeline = TimelineService(conversation)
        timeline.conversation_created(client_id=str(client.id))

        if queue:
            timeline.queue_entered(queue.name, queue_id=str(queue.id))

        transaction.on_commit(lambda: event_bus.publish(
            'conversation.created',
            ConversationCreated(
                conversation_id=str(conversation.id),
                company_id=str(self.company.id) if self.company else '',
                client_id=str(client.id),
                channel_id=str(channel.id) if channel else '',
            ).to_dict(),
            source='conversation_service',
        ))
        return conversation

    @transaction.atomic
    def assign(self, conversation, attendant):
        ConversationStateMachine.assign(conversation)
        conversation.attendant = attendant
        conversation.save(update_fields=['status', 'attendant', 'updated_at'])

        self._add_participant(conversation, attendant)
        TimelineService(conversation).assigned(attendant.get_full_name() or attendant.email)

        if conversation.queue:
            transaction.on_commit(lambda: event_bus.publish('queue.left', QueueLeft(
                conversation_id=str(conversation.id),
                company_id=str(self.company.id) if self.company else '',
                queue_id=str(conversation.queue.id),
            ).to_dict(), source='conversation_service'))
            TimelineService(conversation).queue_left(conversation.queue.name)

        transaction.on_commit(lambda: event_bus.publish('conversation.assigned', ConversationAssigned(
            conversation_id=str(conversation.id),
            company_id=str(self.company.id) if self.company else '',
            attendant_id=str(attendant.id),
        ).to_dict(), source='conversation_service'))

    @transaction.atomic
    def transfer(self, conversation, to_attendant=None, to_department=None, reason='', requested_by=None):
        from_attendant = conversation.attendant
        from_department = conversation.department
        from_queue = conversation.queue

        if to_attendant:
            ConversationStateMachine.transfer(conversation)
            conversation.attendant = to_attendant
            conversation.status = ConversationStatus.ACTIVE
            if to_department:
                conversation.department = to_department
            conversation.save(update_fields=['status', 'attendant', 'department', 'updated_at'])
        elif to_department:
            ConversationStateMachine.start_waiting(conversation)
            conversation.attendant = None
            conversation.department = to_department
            from ..models import Queue
            queue = Queue.objects.filter(department=to_department, is_active=True).first()
            if queue:
                conversation.queue = queue
            conversation.save(update_fields=['status', 'attendant', 'department', 'queue', 'updated_at'])

            if queue:
                TimelineService(conversation).queue_entered(queue.name, queue_id=str(queue.id))
                transaction.on_commit(lambda: event_bus.publish('queue.entered', QueueEntered(
                    conversation_id=str(conversation.id),
                    company_id=str(self.company.id) if self.company else '',
                    queue_id=str(queue.id),
                ).to_dict(), source='conversation_service'))

            if from_queue and from_queue != queue:
                TimelineService(conversation).queue_left(from_queue.name)
                transaction.on_commit(lambda: event_bus.publish('queue.left', QueueLeft(
                    conversation_id=str(conversation.id),
                    company_id=str(self.company.id) if self.company else '',
                    queue_id=str(from_queue.id),
                ).to_dict(), source='conversation_service'))

        TimelineService(conversation).transferred(
            from_name=from_attendant.get_full_name() if from_attendant else 'sistema',
            to_name=to_attendant.get_full_name() if to_attendant else (to_department.name if to_department else 'fila'),
            reason=reason,
            from_attendant_id=str(from_attendant.id) if from_attendant else None,
            to_attendant_id=str(to_attendant.id) if to_attendant else None,
        )

        transaction.on_commit(lambda: event_bus.publish('conversation.transferred', ConversationTransferred(
            conversation_id=str(conversation.id),
            company_id=str(self.company.id) if self.company else '',
            from_attendant_id=str(from_attendant.id) if from_attendant else None,
            to_attendant_id=str(to_attendant.id) if to_attendant else None,
            from_department_id=str(from_department.id) if from_department else None,
            to_department_id=str(to_department.id) if to_department else None,
            reason=reason,
        ).to_dict(), source='conversation_service'))

    @transaction.atomic
    def close(self, conversation, closed_by=None):
        ConversationStateMachine.close(conversation)
        conversation.closed_at = timezone.now()
        conversation.closed_by = closed_by or self.user
        conversation.save(update_fields=['status', 'closed_at', 'closed_by', 'updated_at'])

        self._remove_active_participants(conversation)
        TimelineService(conversation).closed(closed_by.get_full_name() if closed_by else 'sistema')

        transaction.on_commit(lambda: event_bus.publish('conversation.closed', ConversationClosed(
            conversation_id=str(conversation.id),
            company_id=str(self.company.id) if self.company else '',
            closed_by_id=str(closed_by.id) if closed_by else '',
        ).to_dict(), source='conversation_service'))

    @transaction.atomic
    def reopen(self, conversation, reopened_by=None, queue=None):
        ConversationStateMachine.reopen(conversation)
        conversation.closed_at = None
        conversation.closed_by = None
        conversation.status = ConversationStatus.WAITING
        if queue:
            conversation.queue = queue
        conversation.save(update_fields=['status', 'closed_at', 'closed_by', 'queue', 'updated_at'])

        TimelineService(conversation).reopened(reopened_by.get_full_name() if reopened_by else 'sistema')

        if queue:
            TimelineService(conversation).queue_entered(queue.name, queue_id=str(queue.id))

        transaction.on_commit(lambda: event_bus.publish('conversation.reopened', ConversationReopened(
            conversation_id=str(conversation.id),
            company_id=str(self.company.id) if self.company else '',
            reopened_by_id=str(reopened_by.id) if reopened_by else '',
        ).to_dict(), source='conversation_service'))

    def _add_participant(self, conversation, user, role='attendant'):
        Participant.objects.get_or_create(
            conversation=conversation,
            user=user,
            defaults={'role': role, 'is_active': True},
        )

    def _remove_active_participants(self, conversation):
        conversation.participants.filter(is_active=True).update(is_active=False, left_at=timezone.now())
