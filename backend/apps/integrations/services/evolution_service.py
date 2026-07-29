import json
import logging
import secrets
from typing import Optional
from django.db import transaction
from django.utils import timezone

from apps.channels.models import Channel, ChannelType, ChannelProvider, ChannelStatus, WhatsAppSession
from apps.integrations.models import Integration, IntegrationStatus
from apps.conversations.models import Conversation
from apps.core.event_bus import event_bus
from apps.core.domain_events import MessageSent

from .evolution_client import EvolutionAPIClient, EvolutionAPIError

logger = logging.getLogger(__name__)


class EvolutionService:

    def __init__(self, integration: Integration):
        self.integration = integration
        instance_name = str(integration.id).replace('-', '')

        from django.conf import settings
        self.client = EvolutionAPIClient(
            base_url=settings.EVOLUTION_API_URL,
            api_key=settings.EVOLUTION_API_KEY,
            instance_name=instance_name,
            timeout=settings.EVOLUTION_TIMEOUT,
        )

    def _get_or_create_channel(self) -> Channel:
        channel = Channel.objects.filter(
            company=self.integration.company,
            provider=ChannelProvider.EVOLUTION,
            config__integration_id=str(self.integration.id),
        ).first()
        if channel:
            return channel
        channel = Channel.objects.create(
            company=self.integration.company,
            name=f'Evolution - {self.integration.name}',
            channel_type=ChannelType.WHATSAPP,
            provider=ChannelProvider.EVOLUTION,
            status=ChannelStatus.PENDING,
            config={'integration_id': str(self.integration.id)},
            webhook_secret=secrets.token_urlsafe(32),
        )
        WhatsAppSession.objects.create(
            company=self.integration.company,
            channel=channel,
            connection_status=ChannelStatus.PENDING,
        )
        return channel

    @transaction.atomic
    def connect(self) -> dict:
        channel = self._get_or_create_channel()
        session = channel.whatsapp_session
        session.connection_status = ChannelStatus.PENDING
        session.retry_count = 0
        session.save(update_fields=['connection_status', 'retry_count'])

        channel.status = ChannelStatus.PENDING
        channel.is_active = True
        channel.save(update_fields=['status', 'is_active'])

        logger.info('Creating Evolution instance: %s', self.integration.id)
        try:
            self.client.create_instance()
        except EvolutionAPIError as e:
            if 'already in use' not in str(e):
                raise
            logger.info('Instance already exists, reusing it')
        webhook_url = self._build_webhook_url()
        logger.info('Setting webhook URL: %s', webhook_url)
        self.client.set_webhook(webhook_url)

        try:
            logger.info('Getting QR code')
            qr_code = self.client.get_qr_code()
            if qr_code:
                session.qr_code = qr_code
                session.qr_code_expires_at = timezone.now() + timezone.timedelta(minutes=2)
                session.connection_status = ChannelStatus.PENDING
                session.save(update_fields=['qr_code', 'qr_code_expires_at', 'connection_status'])

                channel.status = ChannelStatus.PENDING
                channel.save(update_fields=['status'])
        except EvolutionAPIError as e:
            logger.warning('QR code not yet available: %s', e)

        return {
            'channel_id': str(channel.id),
            'connection_status': session.connection_status,
            'qr_code': session.qr_code or '',
        }

    @transaction.atomic
    def get_qr_code(self) -> Optional[str]:
        channel = self._get_or_create_channel()
        session = channel.whatsapp_session

        if session.connection_status == ChannelStatus.CONNECTED:
            return None

        try:
            qr_code = self.client.get_qr_code()
            if qr_code:
                session.qr_code = qr_code
                session.qr_code_expires_at = timezone.now() + timezone.timedelta(minutes=2)
                session.connection_status = ChannelStatus.PENDING
                session.save(update_fields=['qr_code', 'qr_code_expires_at', 'connection_status'])
                return qr_code
        except EvolutionAPIError as e:
            logger.error('Failed to get QR code: %s', e)

        return session.qr_code or None

    @transaction.atomic
    def disconnect(self) -> dict:
        channel = self._get_or_create_channel()
        session = channel.whatsapp_session

        try:
            self.client.disconnect()
        except EvolutionAPIError:
            pass
        try:
            self.client.delete_instance()
        except EvolutionAPIError:
            pass

        session.qr_code = ''
        session.session_data = {}
        session.connection_status = ChannelStatus.DISCONNECTED
        session.save(update_fields=['qr_code', 'session_data', 'connection_status'])

        channel.status = ChannelStatus.DISCONNECTED
        channel.is_active = False
        channel.save(update_fields=['status', 'is_active'])

        self.integration.status = IntegrationStatus.INACTIVE
        self.integration.save(update_fields=['status'])

        return {'status': 'disconnected'}

    def check_connection(self) -> str:
        try:
            connected = self.client.is_connected()
            new_status = ChannelStatus.CONNECTED if connected else ChannelStatus.DISCONNECTED
        except EvolutionAPIError:
            new_status = ChannelStatus.ERROR

        channel = self._get_or_create_channel()
        session = channel.whatsapp_session
        session.connection_status = new_status
        session.save(update_fields=['connection_status'])

        channel.status = new_status
        channel.save(update_fields=['status'])

        if new_status == ChannelStatus.CONNECTED:
            self.integration.status = IntegrationStatus.ACTIVE
            self.integration.save(update_fields=['status', 'last_sync_at'])

        return new_status

    def send_message(self, conversation: Conversation, text: str) -> bool:
        client = conversation.client
        phone = client.phone
        if not phone:
            logger.error('Client %s has no phone number', client.id)
            return False

        clean_phone = phone.replace('+', '').replace('-', '').replace(' ', '')
        try:
            self.client.send_text(clean_phone, text)
            return True
        except EvolutionAPIError as e:
            logger.error('Failed to send message via Evolution: %s', e)
            return False

    def handle_webhook_status(self, webhook_data: dict):
        channel = self._get_or_create_channel()
        session = channel.whatsapp_session
        status_map = {
            'CONNECTED': ChannelStatus.CONNECTED,
            'DISCONNECTED': ChannelStatus.DISCONNECTED,
            'EXPIRED': ChannelStatus.EXPIRED,
            'ERROR': ChannelStatus.ERROR,
            'PENDING': ChannelStatus.PENDING,
        }
        raw_status = webhook_data.get('status', webhook_data.get('state', ''))

        new_status = None
        for key, val in status_map.items():
            if raw_status.upper() == key or raw_status.upper() == val:
                new_status = val
                break
        if not new_status:
            return

        session.connection_status = new_status
        session.session_data = webhook_data.get('session', {})
        session.save(update_fields=['connection_status', 'session_data'])

        channel.status = new_status
        channel.save(update_fields=['status'])

        if new_status == ChannelStatus.CONNECTED:
            self.integration.status = IntegrationStatus.ACTIVE
            self.integration.last_sync_at = timezone.now()
            self.integration.save(update_fields=['status', 'last_sync_at'])

            phone = webhook_data.get('session', {}).get('phone', {}).get('number', '')
            if phone:
                channel.phone_number = phone
                channel.save(update_fields=['phone_number'])

        if new_status == ChannelStatus.CONNECTED:
            session.qr_code = ''
            session.save(update_fields=['qr_code'])

    def _build_webhook_url(self) -> str:
        from django.conf import settings
        base = settings.EVOLUTION_WEBHOOK_URL or 'http://backend:8000'
        return f'{base}/api/integrations/webhooks/evolution/{self.integration.id}/'

    @staticmethod
    def handle_message_sent(event_type: str, data: dict, source: str = ''):
        metadata = data.get('metadata', {})
        conversation_id = metadata.get('conversation_id', data.get('aggregate_id', ''))
        content = metadata.get('content', '')
        if not conversation_id or not content:
            return

        try:
            conversation = Conversation.objects.select_related(
                'channel', 'company'
            ).get(id=conversation_id)
        except Conversation.DoesNotExist:
            return

        channel = conversation.channel
        if not channel or channel.provider != ChannelProvider.EVOLUTION:
            return

        integration_id = channel.config.get('integration_id', '') if channel.config else ''
        if not integration_id:
            return

        try:
            integration = Integration.objects.get(id=integration_id, company=conversation.company)
        except Integration.DoesNotExist:
            return

        svc = EvolutionService(integration)
        svc.send_message(conversation, content)
