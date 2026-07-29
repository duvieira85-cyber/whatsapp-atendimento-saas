import logging
from typing import Optional
from django.db import transaction
from django.utils import timezone

from apps.core.event_bus import event_bus
from apps.core.domain_events import ChannelDisconnected

logger = logging.getLogger(__name__)


class ChannelService:

    def __init__(self, company):
        self.company = company

    @transaction.atomic
    def connect(self, channel):
        from ..models import ChannelStatus
        channel.status = ChannelStatus.CONNECTED
        channel.is_active = True
        channel.save(update_fields=['status', 'is_active'])

    @transaction.atomic
    def disconnect(self, channel):
        from ..models import ChannelStatus
        channel.status = ChannelStatus.DISCONNECTED
        channel.save(update_fields=['status'])

        transaction.on_commit(lambda: event_bus.publish('channel.disconnected', ChannelDisconnected(
            channel_id=str(channel.id),
            company_id=str(self.company.id),
        ).to_dict(), source='channel_service'))

    @transaction.atomic
    def set_error(self, channel, error_message: str = ''):
        from ..models import ChannelStatus
        channel.status = ChannelStatus.ERROR
        channel.save(update_fields=['status'])

    def is_available(self, channel) -> bool:
        from ..models import ChannelStatus
        return channel.is_active and channel.status == ChannelStatus.CONNECTED

    def get_active_channels(self):
        from ..models import Channel, ChannelStatus
        return Channel.objects.filter(
            company=self.company,
            is_active=True,
            status=ChannelStatus.CONNECTED,
        )
