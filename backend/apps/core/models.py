import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Criado em'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Atualizado em'))

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        from .middleware import get_current_company
        if hasattr(self, 'company_id') and not self.company_id:
            company = get_current_company()
            if company:
                self.company = company
        super().save(*args, **kwargs)


class TenantManager(models.Manager):
    def get_queryset(self):
        from .middleware import get_current_company
        company = get_current_company()
        if company:
            return super().get_queryset().filter(company=company)
        return super().get_queryset()

    def all_for_user(self, user):
        if user.role == 'super_admin':
            return self.get_queryset()
        return self.get_queryset().filter(company=user.company)


class TenantAwareQuerySet(models.QuerySet):
    def for_company(self, company):
        return self.filter(company=company)


class TenantModel(models.Model):
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='%(class)s_set',
        verbose_name=_('Empresa'),
    )

    objects = TenantManager()
    objects_all = models.Manager()

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        from .middleware import get_current_company
        if not self.company_id:
            company = get_current_company()
            if company:
                self.company = company
        super().save(*args, **kwargs)
