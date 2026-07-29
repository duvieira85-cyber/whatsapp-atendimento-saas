import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel, TenantModel


class ChannelType(models.TextChoices):
    WHATSAPP = 'whatsapp', _('WhatsApp')
    TELEGRAM = 'telegram', _('Telegram')
    FACEBOOK = 'facebook', _('Facebook Messenger')
    INSTAGRAM = 'instagram', _('Instagram')
    WEBCHAT = 'webchat', _('Web Chat')
    EMAIL = 'email', _('E-mail')
    SMS = 'sms', _('SMS')


class ChannelProvider(models.TextChoices):
    EVOLUTION = 'evolution', _('Evolution API')
    META_CLOUD = 'meta_cloud', _('Meta Cloud API')
    TWILIO = 'twilio', _('Twilio')
    GUPSHUP = 'gupshup', _('Gupshup')


class ChannelStatus(models.TextChoices):
    PENDING = 'pending', _('Pendente')
    CONNECTED = 'connected', _('Conectado')
    DISCONNECTED = 'disconnected', _('Desconectado')
    EXPIRED = 'expired', _('Expirado')
    ERROR = 'error', _('Erro')


class Channel(TimeStampedModel, TenantModel):
    name = models.CharField(max_length=255, verbose_name=_('Nome'))
    channel_type = models.CharField(
        max_length=20,
        choices=ChannelType.choices,
        verbose_name=_('Tipo de canal'),
    )
    provider = models.CharField(
        max_length=20,
        choices=ChannelProvider.choices,
        default=ChannelProvider.EVOLUTION,
        verbose_name=_('Provedor'),
    )
    phone_number = models.CharField(max_length=20, blank=True, default='', verbose_name=_('Número de telefone'))
    config = models.JSONField(default=dict, blank=True, verbose_name=_('Configurações'))
    status = models.CharField(
        max_length=20,
        choices=ChannelStatus.choices,
        default=ChannelStatus.PENDING,
        verbose_name=_('Status'),
    )
    is_active = models.BooleanField(default=True, verbose_name=_('Ativo'))
    webhook_url = models.URLField(blank=True, default='', verbose_name=_('Webhook URL'))
    webhook_secret = models.CharField(max_length=255, blank=True, default='', verbose_name=_('Segredo do webhook'))

    class Meta:
        verbose_name = _('Canal')
        verbose_name_plural = _('Canais')
        db_table = 'channels'
        indexes = [
            models.Index(fields=['channel_type']),
            models.Index(fields=['provider']),
            models.Index(fields=['status']),
            models.Index(fields=['company', 'is_active']),
        ]

    def __str__(self):
        return f'{self.name} ({self.get_channel_type_display()})'


class WhatsAppSession(TimeStampedModel, TenantModel):
    channel = models.OneToOneField(
        Channel,
        on_delete=models.CASCADE,
        related_name='whatsapp_session',
        verbose_name=_('Canal'),
    )
    session_data = models.JSONField(default=dict, blank=True, verbose_name=_('Dados da sessão'))
    qr_code = models.TextField(blank=True, default='', verbose_name=_('QR Code'))
    qr_code_expires_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Expiração do QR Code'))
    connection_status = models.CharField(
        max_length=20,
        choices=ChannelStatus.choices,
        default=ChannelStatus.PENDING,
        verbose_name=_('Status da conexão'),
    )
    last_connected_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Última conexão'))
    webhook_config = models.JSONField(default=dict, blank=True, verbose_name=_('Configuração do webhook'))
    retry_count = models.IntegerField(default=0, verbose_name=_('Tentativas'))

    class Meta:
        verbose_name = _('Sessão WhatsApp')
        verbose_name_plural = _('Sessões WhatsApp')
        db_table = 'channels_whatsapp_session'
        indexes = [
            models.Index(fields=['connection_status']),
        ]

    def __str__(self):
        return f'Sessão - {self.channel.name}'
