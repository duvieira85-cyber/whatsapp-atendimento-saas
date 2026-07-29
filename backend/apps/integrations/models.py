from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel, TenantModel


class IntegrationProvider(models.TextChoices):
    EVOLUTION = 'evolution', _('Evolution API')
    META_CLOUD = 'meta_cloud', _('Meta Cloud API')
    TWILIO = 'twilio', _('Twilio')
    GUPSHUP = 'gupshup', _('Gupshup')


class EvolutionConfig(models.Model):
    url = models.CharField(max_length=500, verbose_name=_('URL da Evolution API'))
    api_key = models.CharField(max_length=255, verbose_name=_('API Key'))

    class Meta:
        verbose_name = _('Configuração Evolution')
        verbose_name_plural = _('Configuração Evolution')

    def __str__(self):
        return 'Configuração Evolution'


class IntegrationStatus(models.TextChoices):
    ACTIVE = 'active', _('Ativo')
    INACTIVE = 'inactive', _('Inativo')
    ERROR = 'error', _('Erro')


class Integration(TimeStampedModel, TenantModel):
    provider = models.CharField(
        max_length=20,
        choices=IntegrationProvider.choices,
        verbose_name=_('Provedor'),
    )
    name = models.CharField(max_length=255, verbose_name=_('Nome'))
    is_active = models.BooleanField(default=True, verbose_name=_('Ativo'))
    config = models.JSONField(default=dict, blank=True, verbose_name=_('Configurações'))
    credentials = models.JSONField(default=dict, blank=True, verbose_name=_('Credenciais'))
    status = models.CharField(
        max_length=10,
        choices=IntegrationStatus.choices,
        default=IntegrationStatus.INACTIVE,
        verbose_name=_('Status'),
    )
    webhook_url = models.URLField(blank=True, default='', verbose_name=_('URL do webhook'))
    last_sync_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Última sincronização'))
    error_log = models.TextField(blank=True, default='', verbose_name=_('Log de erros'))

    class Meta:
        verbose_name = _('Integração')
        verbose_name_plural = _('Integrações')
        db_table = 'integrations'
        indexes = [
            models.Index(fields=['provider']),
            models.Index(fields=['status']),
            models.Index(fields=['company', 'is_active']),
        ]

    def __str__(self):
        return f'{self.name} ({self.get_provider_display()})'
