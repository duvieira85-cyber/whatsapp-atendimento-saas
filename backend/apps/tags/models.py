import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel, TenantModel


class Tag(TimeStampedModel, TenantModel):
    name = models.CharField(max_length=100, verbose_name=_('Nome'))
    color = models.CharField(max_length=7, default='#1976d2', verbose_name=_('Cor'))
    description = models.TextField(blank=True, default='', verbose_name=_('Descrição'))
    is_active = models.BooleanField(default=True, verbose_name=_('Ativo'))

    class Meta:
        verbose_name = _('Tag')
        verbose_name_plural = _('Tags')
        db_table = 'tags'
        unique_together = ['company', 'name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name
