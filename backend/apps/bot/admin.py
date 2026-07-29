from django.contrib import admin
from .models import BotConfig, BotMenuOption


@admin.register(BotConfig)
class BotConfigAdmin(admin.ModelAdmin):
    list_display = ['company', 'is_active', 'created_at']
    list_filter = ['is_active']


@admin.register(BotMenuOption)
class BotMenuOptionAdmin(admin.ModelAdmin):
    list_display = ['bot_config', 'option_key', 'label', 'department', 'order']
    list_filter = ['bot_config__company']
