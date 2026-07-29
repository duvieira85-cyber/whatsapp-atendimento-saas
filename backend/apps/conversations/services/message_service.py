import logging
from typing import Optional, List
from django.db import transaction
from django.utils import timezone

from ..models import Message, MessageType, SenderType, DeliveryStatus, Conversation
from .timeline_service import TimelineService
from apps.core.event_bus import event_bus
from apps.core.domain_events import MessageReceived, MessageSent

logger = logging.getLogger(__name__)


class MessageService:

    def __init__(self, company):
        self.company = company

    @transaction.atomic
    def send_from_attendant(self, conversation: Conversation, attendant, content: str,
                            message_type=MessageType.TEXT, reply_to=None, metadata=None):
        message = Message.objects.create(
            company=self.company,
            conversation=conversation,
            sender_type=SenderType.ATTENDANT,
            sender_user=attendant,
            message_type=message_type,
            content=content,
            reply_to=reply_to,
            delivery_status=DeliveryStatus.SENT,
            metadata=metadata or {},
        )
        self._update_conversation(conversation, content)
        TimelineService(conversation).message_sent(content[:80])

        transaction.on_commit(lambda: event_bus.publish('message.sent', MessageSent(
            message_id=str(message.id),
            company_id=str(self.company.id),
            conversation_id=str(conversation.id),
            attendant_id=str(attendant.id),
            content=content,
            message_type=message_type,
        ).to_dict(), source='message_service'))

        return message

    @transaction.atomic
    def receive_from_client(self, conversation: Conversation, client, content: str,
                            message_type=MessageType.TEXT, external_id='', metadata=None):
        message = Message.objects.create(
            company=self.company,
            conversation=conversation,
            sender_type=SenderType.CLIENT,
            sender_client=client,
            message_type=message_type,
            content=content,
            external_id=external_id,
            delivery_status=DeliveryStatus.DELIVERED,
            delivered_at=timezone.now(),
            metadata=metadata or {},
        )
        self._update_conversation(conversation, content)
        TimelineService(conversation).message_received(content[:80])

        transaction.on_commit(lambda: event_bus.publish('message.received', MessageReceived(
            message_id=str(message.id),
            company_id=str(self.company.id),
            conversation_id=str(conversation.id),
            client_id=str(client.id),
            content=content,
            message_type=message_type,
        ).to_dict(), source='message_service'))

        return message

    @transaction.atomic
    def send_bot_message(self, conversation: Conversation, content: str,
                         message_type=MessageType.TEXT, metadata=None):
        from apps.core.domain_events import MessageSent
        message = Message.objects.create(
            company=self.company,
            conversation=conversation,
            sender_type=SenderType.BOT,
            message_type=message_type,
            content=content,
            delivery_status=DeliveryStatus.DELIVERED,
            delivered_at=timezone.now(),
            metadata=metadata or {},
        )
        self._update_conversation(conversation, content)
        TimelineService(conversation).message_sent(content[:80])

        transaction.on_commit(lambda: event_bus.publish('message.sent', MessageSent(
            message_id=str(message.id),
            company_id=str(self.company.id),
            conversation_id=str(conversation.id),
            attendant_id='',
            content=content,
            message_type=message_type,
        ).to_dict(), source='bot_service'))

        return message

    @transaction.atomic
    def send_system_message(self, conversation: Conversation, content: str):
        message = Message.objects.create(
            company=self.company,
            conversation=conversation,
            sender_type=SenderType.SYSTEM,
            message_type=MessageType.SYSTEM,
            content=content,
            delivery_status=DeliveryStatus.DELIVERED,
            delivered_at=timezone.now(),
        )
        self._update_conversation(conversation, content)
        return message

    @transaction.atomic
    def mark_as_delivered(self, message: Message):
        message.delivery_status = DeliveryStatus.DELIVERED
        message.delivered_at = timezone.now()
        message.save(update_fields=['delivery_status', 'delivered_at'])

    @transaction.atomic
    def mark_as_read(self, message: Message):
        message.delivery_status = DeliveryStatus.READ
        message.read_at = timezone.now()
        message.save(update_fields=['delivery_status', 'read_at'])

    def get_conversation_messages(self, conversation: Conversation) -> List[Message]:
        return Message.objects.filter(conversation=conversation).select_related(
            'sender_user', 'sender_client'
        ).order_by('created_at')

    def _update_conversation(self, conversation: Conversation, content: str):
        conversation.last_message_preview = content[:255]
        conversation.last_message_at = timezone.now()
        conversation.message_count = Message.objects.filter(conversation=conversation).count()
        conversation.save(update_fields=['last_message_preview', 'last_message_at', 'message_count'])
