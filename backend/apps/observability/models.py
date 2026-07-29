from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'create', 'Criação'
        UPDATE = 'update', 'Atualização'
        DELETE = 'delete', 'Exclusão'
        LOGIN = 'login', 'Login'
        LOGOUT = 'logout', 'Logout'
        TRANSFER = 'transfer', 'Transferência'
        ASSIGN = 'assign', 'Atribuição'
        CLOSE = 'close', 'Fechamento'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    resource_type = models.CharField(max_length=255)
    resource_id = models.CharField(max_length=255, blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Log de Auditoria'
        verbose_name_plural = 'Logs de Auditoria'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'action']),
            models.Index(fields=['company', 'created_at']),
        ]

    def __str__(self):
        return f'{self.get_action_display()} - {self.resource_type} ({self.created_at})'
