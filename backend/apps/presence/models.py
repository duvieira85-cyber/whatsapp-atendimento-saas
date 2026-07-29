import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class PresenceStatus(models.TextChoices):
    ONLINE = 'online', _('Online')
    AWAY = 'away', _('Ausente')
    BUSY = 'busy', _('Ocupado')
    OFFLINE = 'offline', _('Offline')


class Presence(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='presence',
        verbose_name=_('Usuário'),
    )
    status = models.CharField(
        max_length=10,
        choices=PresenceStatus.choices,
        default=PresenceStatus.OFFLINE,
        verbose_name=_('Status'),
    )
    last_seen_at = models.DateTimeField(auto_now=True, verbose_name=_('Última vez visto'))
    is_online = models.BooleanField(default=False, verbose_name=_('Online'))
    current_session_id = models.CharField(max_length=255, blank=True, default='', verbose_name=_('Sessão atual'))

    class Meta:
        verbose_name = _('Presença')
        verbose_name_plural = _('Presenças')
        db_table = 'presence'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['is_online']),
            models.Index(fields=['last_seen_at']),
        ]

    def __str__(self):
        return f'{self.user} - {self.get_status_display()}'
