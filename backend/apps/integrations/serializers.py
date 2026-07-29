from rest_framework import serializers
from .models import Integration, EvolutionConfig


class EvolutionConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvolutionConfig
        fields = ['url', 'api_key']


class IntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Integration
        fields = [
            'id', 'company', 'provider', 'name', 'is_active',
            'config', 'credentials', 'status', 'webhook_url',
            'error_log', 'last_sync_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'status', 'error_log', 'last_sync_at', 'created_at', 'updated_at']


class IntegrationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Integration
        fields = ['id', 'name']
        read_only_fields = ['id']
