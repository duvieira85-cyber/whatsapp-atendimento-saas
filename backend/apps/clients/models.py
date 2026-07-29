from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel, TenantModel


class Client(TimeStampedModel, TenantModel):
    name = models.CharField(max_length=255, verbose_name=_('Nome'))
    phone = models.CharField(max_length=20, verbose_name=_('Telefone'))
    email = models.EmailField(blank=True, default='', verbose_name=_('E-mail'))
    profile_picture = models.URLField(blank=True, default='', verbose_name=_('Foto de perfil'))
    notes = models.TextField(blank=True, default='', verbose_name=_('Observações'))
    tags = models.ManyToManyField(
        'tags.Tag',
        blank=True,
        related_name='clients',
        verbose_name=_('Tags'),
    )
    is_blocked = models.BooleanField(default=False, verbose_name=_('Bloqueado'))
    last_contact_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Último contato'))
    total_conversations = models.IntegerField(default=0, verbose_name=_('Total de conversas'))
    metadata = models.JSONField(default=dict, blank=True, verbose_name=_('Metadados'))

    class Meta:
        verbose_name = _('Cliente')
        verbose_name_plural = _('Clientes')
        db_table = 'clients'
        unique_together = ['company', 'phone']
        indexes = [
            models.Index(fields=['phone']),
            models.Index(fields=['email']),
            models.Index(fields=['is_blocked']),
            models.Index(fields=['last_contact_at']),
            models.Index(fields=['company', 'phone']),
        ]

    def __str__(self):
        return f'{self.name} ({self.phone})'
