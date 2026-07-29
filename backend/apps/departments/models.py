from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel, TenantModel


class Department(TimeStampedModel, TenantModel):
    name = models.CharField(max_length=255, verbose_name=_('Nome'))
    description = models.TextField(blank=True, default='', verbose_name=_('Descrição'))
    color = models.CharField(max_length=7, default='#1976d2', verbose_name=_('Cor'))
    is_active = models.BooleanField(default=True, verbose_name=_('Ativo'))
    order = models.IntegerField(default=0, verbose_name=_('Ordem'))

    class Meta:
        verbose_name = _('Departamento')
        verbose_name_plural = _('Departamentos')
        db_table = 'departments'
        unique_together = ['company', 'name']
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['order']),
        ]

    def __str__(self):
        return self.name


class DepartmentMember(TimeStampedModel, TenantModel):
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='department_memberships',
        verbose_name=_('Usuário'),
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='members',
        verbose_name=_('Departamento'),
    )
    is_supervisor = models.BooleanField(default=False, verbose_name=_('Supervisor'))

    class Meta:
        verbose_name = _('Membro do Departamento')
        verbose_name_plural = _('Membros do Departamento')
        db_table = 'departments_member'
        unique_together = ['user', 'department']

    def __str__(self):
        return f'{self.user} - {self.department}'
