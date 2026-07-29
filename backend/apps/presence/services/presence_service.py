import logging
from typing import Optional
from django.db import transaction
from django.utils import timezone

from apps.core.event_bus import event_bus
from apps.core.domain_events import UserOnline, UserOffline

logger = logging.getLogger(__name__)


class PresenceService:

    @transaction.atomic
    def set_online(self, user, session_id: str = ''):
        from ..models import Presence, PresenceStatus
        presence, created = Presence.objects.get_or_create(user=user)
        presence.status = PresenceStatus.ONLINE
        presence.is_online = True
        presence.current_session_id = session_id
        presence.save(update_fields=['status', 'is_online', 'current_session_id', 'last_seen_at'])

        user.is_online = True
        user.save(update_fields=['is_online'])

        transaction.on_commit(lambda: event_bus.publish('user.online', UserOnline(
            user_id=str(user.id),
            company_id=str(user.company_id) if user.company_id else '',
        ).to_dict(), source='presence_service'))

    @transaction.atomic
    def set_offline(self, user):
        from ..models import Presence, PresenceStatus
        presence, created = Presence.objects.get_or_create(user=user)
        presence.status = PresenceStatus.OFFLINE
        presence.is_online = False
        presence.current_session_id = ''
        presence.save(update_fields=['status', 'is_online', 'current_session_id', 'last_seen_at'])

        user.is_online = False
        user.save(update_fields=['is_online'])

        transaction.on_commit(lambda: event_bus.publish('user.offline', UserOffline(
            user_id=str(user.id),
            company_id=str(user.company_id) if user.company_id else '',
        ).to_dict(), source='presence_service'))

    @transaction.atomic
    def set_away(self, user):
        from ..models import Presence, PresenceStatus
        presence, created = Presence.objects.get_or_create(user=user)
        presence.status = PresenceStatus.AWAY
        presence.save(update_fields=['status', 'last_seen_at'])

    @transaction.atomic
    def set_busy(self, user):
        from ..models import Presence, PresenceStatus
        presence, created = Presence.objects.get_or_create(user=user)
        presence.status = PresenceStatus.BUSY
        presence.save(update_fields=['status', 'last_seen_at'])

    def get_status(self, user) -> str:
        from ..models import Presence, PresenceStatus
        try:
            return Presence.objects.get(user=user).status
        except Presence.DoesNotExist:
            return PresenceStatus.OFFLINE

    def get_online_users(self, company):
        from ..models import Presence, PresenceStatus
        return Presence.objects.filter(
            user__company=company,
            is_online=True,
        ).select_related('user')
