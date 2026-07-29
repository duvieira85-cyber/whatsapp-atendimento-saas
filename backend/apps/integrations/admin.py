from django.contrib import admin
from .models import Integration


@admin.register(Integration)
class IntegrationAdmin(admin.ModelAdmin):
    list_display = ['name', 'provider', 'company', 'is_active', 'last_sync_at']
    list_filter = ['provider', 'is_active', 'company']
