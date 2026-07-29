import logging
from dataclasses import dataclass
from typing import Any, Dict, Optional
from django.db import transaction
from django.utils import timezone

from ..models import Conversation, ConversationStatus, SenderType, MessageType
from .message_service import MessageService
from .conversation_service import ConversationService
from .queue_service import QueueService

logger = logging.getLogger(__name__)


@dataclass
class NormalizedMessage:
    channel_id: str
    channel_type: str
    provider: str
    external_id: str
    client_phone: str
    client_name: str
    content: str
    message_type: str
    media_url: str = ''
    media_name: str = ''
    media_size: int = 0
    mime_type: str = ''
    timestamp: str = ''
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class InboundPipeline:

    def __init__(self, company):
        self.company = company
        self.message_service = MessageService(company)
        self.conversation_service = ConversationService(company=company)
        self.queue_service = QueueService(company)

    @transaction.atomic
    def process(self, normalized: NormalizedMessage) -> Dict[str, Any]:
        from apps.clients.models import Client
        from apps.channels.models import Channel

        logger.warning('INBOUND_PIPELINE: company=%s channel_id=%s phone=%s',
                        self.company.id, normalized.channel_id, normalized.client_phone)

        channel = Channel.objects.filter(
            company=self.company,
            id=normalized.channel_id,
        ).first()
        if not channel:
            logger.error('INBOUND_CANAL_NOT_FOUND: company=%s channel_id=%s',
                         self.company.id, normalized.channel_id)
            return {'error': 'channel_not_found'}

        logger.warning('INBOUND_CHANNEL_FOUND: id=%s name=%s', channel.id, channel.name)

        client, _ = Client.objects.get_or_create(
            company=self.company,
            phone=normalized.client_phone,
            defaults={'name': normalized.client_name},
        )
        logger.warning('INBOUND_CLIENT: id=%s name=%s phone=%s',
                        client.id, client.name, client.phone)

        conversation = self._find_or_create_conversation(channel, client)
        logger.warning('INBOUND_CONVERSATION: id=%s status=%s is_new=%s',
                        conversation.id, conversation.status,
                        conversation.message_count <= 1)

        message = self.message_service.receive_from_client(
            conversation=conversation,
            client=client,
            content=normalized.content,
            message_type=normalized.message_type,
            external_id=normalized.external_id,
            metadata={
                'channel_id': str(channel.id),
                'provider': normalized.provider,
                'media_url': normalized.media_url,
                'media_name': normalized.media_name,
                'media_size': normalized.media_size,
                'mime_type': normalized.mime_type,
            },
        )
        logger.warning('INBOUND_MESSAGE_CREATED: id=%s content=%s', message.id, normalized.content[:50])

        if conversation.department is None and conversation.status != ConversationStatus.CLOSED:
            from apps.bot.services.routing_service import BotRoutingService
            bot = BotRoutingService(company=self.company)
            bot.process_message(conversation, normalized.content)

        return {
            'conversation_id': str(conversation.id),
            'message_id': str(message.id),
            'client_id': str(client.id),
            'is_new': conversation.message_count <= 1,
        }

    def _find_or_create_conversation(self, channel, client):
        active = Conversation.objects.filter(
            company=self.company,
            client=client,
            channel=channel,
        ).exclude(status=ConversationStatus.CLOSED).order_by('-created_at').first()

        if active:
            return active

        return self.conversation_service.create_conversation(
            client=client,
            channel=channel,
            metadata={'channel_type': channel.channel_type, 'provider': channel.provider},
        )


class Normalizer:

    @staticmethod
    def evolution(data: Dict[str, Any]) -> Optional[NormalizedMessage]:
        try:
            return NormalizedMessage(
                channel_id=data.get('channel_id', ''),
                channel_type='whatsapp',
                provider='evolution',
                external_id=data.get('messageId', ''),
                client_phone=data.get('sender', ''),
                client_name=data.get('senderName', data.get('sender', '')),
                content=data.get('message', {}).get('text', '') or '',
                message_type=data.get('message', {}).get('type', 'text'),
                media_url=data.get('message', {}).get('mediaUrl', ''),
                media_name=data.get('message', {}).get('mediaName', ''),
                media_size=data.get('message', {}).get('mediaSize', 0),
                mime_type=data.get('message', {}).get('mimeType', ''),
                timestamp=data.get('timestamp', ''),
            )
        except Exception as e:
            logger.exception('Erro ao normalizar webhook Evolution: %s', e)
            return None

    @staticmethod
    def meta_cloud(data: Dict[str, Any]) -> Optional[NormalizedMessage]:
        try:
            entry = (data.get('entry') or [{}])[0]
            change = (entry.get('changes') or [{}])[0]
            value = change.get('value', {})
            message = (value.get('messages') or [{}])[0]
            contact = (value.get('contacts') or [{}])[0]
            return NormalizedMessage(
                channel_id=data.get('channel_id', ''),
                channel_type='whatsapp',
                provider='meta_cloud',
                external_id=message.get('id', ''),
                client_phone=message.get('from', ''),
                client_name=contact.get('profile', {}).get('name', message.get('from', '')),
                content=message.get('text', {}).get('body', ''),
                message_type=message.get('type', 'text'),
                timestamp=message.get('timestamp', ''),
            )
        except Exception as e:
            logger.exception('Erro ao normalizar webhook Meta Cloud: %s', e)
            return None

    @staticmethod
    def twilio(data: Dict[str, Any]) -> Optional[NormalizedMessage]:
        try:
            return NormalizedMessage(
                channel_id=data.get('channel_id', ''),
                channel_type='whatsapp',
                provider='twilio',
                external_id=data.get('SmsSid', data.get('MessageSid', '')),
                client_phone=data.get('From', '').replace('whatsapp:', ''),
                client_name=data.get('ProfileName', data.get('From', '').replace('whatsapp:', '')),
                content=data.get('Body', ''),
                message_type='text',
                media_url=data.get('MediaUrl0', ''),
                mime_type=data.get('MediaContentType0', ''),
            )
        except Exception as e:
            logger.exception('Erro ao normalizar webhook Twilio: %s', e)
            return None

    @staticmethod
    def detect(data: Dict[str, Any]) -> str:
        if 'messageId' in data or 'instanceId' in data:
            return 'evolution'
        if 'entry' in data and isinstance(data.get('entry'), list):
            return 'meta_cloud'
        if 'SmsSid' in data or 'MessageSid' in data:
            return 'twilio'
        return 'unknown'
