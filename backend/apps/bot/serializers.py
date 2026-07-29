from rest_framework import serializers
from .models import BotConfig, BotMenuOption


class BotMenuOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BotMenuOption
        fields = [
            'id', 'bot_config', 'department', 'option_key',
            'label', 'order', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BotConfigSerializer(serializers.ModelSerializer):
    menu_options = BotMenuOptionSerializer(many=True, read_only=True)

    class Meta:
        model = BotConfig
        fields = [
            'id', 'company', 'is_active', 'welcome_message',
            'menu_message', 'fallback_message',
            'business_hours_enabled', 'business_hours',
            'outside_hours_message', 'max_attempts',
            'menu_options', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']
