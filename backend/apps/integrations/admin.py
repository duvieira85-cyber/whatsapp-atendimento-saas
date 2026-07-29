from django.contrib import admin
from .models import Integration, EvolutionConfig


@admin.register(Integration)
class IntegrationAdmin(admin.ModelAdmin):
    list_display = ['name', 'provider', 'company', 'is_active', 'last_sync_at']
    list_filter = ['provider', 'is_active', 'company']


@admin.register(EvolutionConfig)
class EvolutionConfigAdmin(admin.ModelAdmin):
    list_display = ['url', 'api_key']
