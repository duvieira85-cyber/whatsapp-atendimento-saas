import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserRole(models.TextChoices):
    SUPER_ADMIN = 'super_admin', _('Super Administrador')
    ADMIN = 'admin', _('Administrador')
    SUPERVISOR = 'supervisor', _('Supervisor')
    ATTENDANT = 'attendant', _('Atendente')


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, null=True, blank=True, verbose_name=_('E-mail'))
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.ATTENDANT,
        verbose_name=_('Função'),
    )
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='users',
        verbose_name=_('Empresa'),
    )
    phone = models.CharField(max_length=20, blank=True, default='', verbose_name=_('Telefone'))
    avatar = models.URLField(blank=True, default='', verbose_name=_('Avatar'))
    is_online = models.BooleanField(default=False, verbose_name=_('Online'))
    max_concurrent_chats = models.IntegerField(default=5, verbose_name=_('Máx. atendimentos simultâneos'))

    class Meta:
        verbose_name = _('Usuário')
        verbose_name_plural = _('Usuários')
        db_table = 'accounts_user'
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['company', 'role']),
            models.Index(fields=['is_online']),
        ]

    def __str__(self):
        return f'{self.get_full_name() or self.username}'

    def save(self, *args, **kwargs):
        if self.role == UserRole.SUPER_ADMIN:
            self.company = None
        elif not self.company_id:
            from apps.core.middleware import get_resolved_company
            company = get_resolved_company()
            if company:
                self.company = company
        super().save(*args, **kwargs)


class Attendant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='attendant_profile',
        verbose_name=_('Usuário'),
    )
    departments = models.ManyToManyField(
        'departments.Department',
        blank=True,
        related_name='attendants',
        verbose_name=_('Departamentos'),
    )
    skills = models.JSONField(default=list, blank=True, verbose_name=_('Habilidades'))
    rating = models.FloatField(default=0.0, verbose_name=_('Avaliação'))
    total_chats = models.IntegerField(default=0, verbose_name=_('Total de atendimentos'))
    is_available = models.BooleanField(default=True, verbose_name=_('Disponível'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Criado em'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Atualizado em'))

    class Meta:
        verbose_name = _('Atendente')
        verbose_name_plural = _('Atendentes')
        db_table = 'accounts_attendant'

    def __str__(self):
        return str(self.user)
