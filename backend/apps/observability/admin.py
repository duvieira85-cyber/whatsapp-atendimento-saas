from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'company', 'action', 'resource_type', 'created_at']
    list_filter = ['action', 'company', 'created_at']
    search_fields = ['resource_type', 'resource_id', 'user__email']
    readonly_fields = ['user', 'company', 'action', 'resource_type', 'resource_id', 'details', 'ip_address', 'created_at']
