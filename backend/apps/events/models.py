import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class EventStatus(models.TextChoices):
    PENDING = 'pending', _('Pendente')
    PROCESSING = 'processing', _('Processando')
    COMPLETED = 'completed', _('Concluído')
    FAILED = 'failed', _('Falhou')
    SKIPPED = 'skipped', _('Ignorado')


class EventType(models.TextChoices):
    MESSAGE_RECEIVED = 'message.received', _('Mensagem recebida')
    MESSAGE_SENT = 'message.sent', _('Mensagem enviada')
    CONVERSATION_STARTED = 'conversation.started', _('Conversa iniciada')
    CONVERSATION_ASSIGNED = 'conversation.assigned', _('Conversa atribuída')
    CONVERSATION_TRANSFERRED = 'conversation.transferred', _('Conversa transferida')
    CONVERSATION_CLOSED = 'conversation.closed', _('Conversa encerrada')
    ATTENDANT_ONLINE = 'attendant.online', _('Atendente online')
    ATTENDANT_OFFLINE = 'attendant.offline', _('Atendente offline')
    CLIENT_BLOCKED = 'client.blocked', _('Cliente bloqueado')
    CHANNEL_DISCONNECTED = 'channel.disconnected', _('Canal desconectado')
    INTEGRATION_SYNC = 'integration.sync', _('Sincronização de integração')
    SYSTEM_ALERT = 'system.alert', _('Alerta do sistema')


class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(
        max_length=50,
        choices=EventType.choices,
        verbose_name=_('Tipo de evento'),
    )
    data = models.JSONField(default=dict, verbose_name=_('Dados'))
    source = models.CharField(max_length=100, blank=True, default='', verbose_name=_('Origem'))
    status = models.CharField(
        max_length=20,
        choices=EventStatus.choices,
        default=EventStatus.PENDING,
        verbose_name=_('Status'),
    )
    error_message = models.TextField(blank=True, default='', verbose_name=_('Mensagem de erro'))
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Processado em'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Criado em'))

    class Meta:
        verbose_name = _('Evento')
        verbose_name_plural = _('Eventos')
        db_table = 'events'
        indexes = [
            models.Index(fields=['event_type']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['event_type', 'status']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_event_type_display()} - {self.created_at}'
