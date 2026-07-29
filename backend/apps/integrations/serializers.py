from rest_framework import serializers
from .models import Integration
from apps.channels.models import Channel, ChannelProvider


class IntegrationSerializer(serializers.ModelSerializer):
    connected_number = serializers.SerializerMethodField()

    class Meta:
        model = Integration
        fields = [
            'id', 'company', 'provider', 'name', 'is_active',
            'config', 'credentials', 'status', 'webhook_url',
            'error_log', 'last_sync_at', 'created_at', 'updated_at',
            'connected_number',
        ]
        read_only_fields = ['id', 'company', 'status', 'error_log', 'last_sync_at', 'created_at', 'updated_at', 'connected_number']

    def get_connected_number(self, obj):
        channel = Channel.objects.filter(
            company=obj.company,
            provider=ChannelProvider.EVOLUTION,
            config__integration_id=str(obj.id),
        ).first()
        return channel.phone_number if channel else ''


class IntegrationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Integration
        fields = ['id', 'name']
        read_only_fields = ['id']
