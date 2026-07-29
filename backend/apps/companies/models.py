import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name=_('Nome'))
    slug = models.SlugField(max_length=255, unique=True, verbose_name=_('Slug'))
    document = models.CharField(max_length=20, blank=True, default='', verbose_name=_('CNPJ/CPF'))
    phone = models.CharField(max_length=20, blank=True, default='', verbose_name=_('Telefone'))
    email = models.EmailField(blank=True, default='', verbose_name=_('E-mail'))
    is_active = models.BooleanField(default=True, verbose_name=_('Ativo'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Criado em'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Atualizado em'))

    class Meta:
        verbose_name = _('Empresa')
        verbose_name_plural = _('Empresas')
        db_table = 'companies'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name
