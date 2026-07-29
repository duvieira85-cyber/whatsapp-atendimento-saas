from rest_framework import serializers
from .models import Conversation, Message, QuickResponse, Timeline, Attachment
from apps.clients.serializers import ClientSerializer


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender_type', 'sender_user', 'sender_client',
            'sender_name', 'content', 'message_type',
            'delivery_status', 'reply_to', 'metadata',
            'external_id', 'created_at', 'delivered_at', 'read_at',
        ]
        read_only_fields = ['id', 'sender_type', 'sender_user', 'sender_client', 'delivery_status', 'created_at', 'delivered_at', 'read_at']

    def get_sender_name(self, obj):
        if obj.sender_user:
            return obj.sender_user.get_full_name() or obj.sender_user.email
        if obj.sender_client:
            return obj.sender_client.name
        return obj.get_sender_type_display()


class TimelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Timeline
        fields = ['id', 'event_type', 'description', 'metadata', 'created_by', 'created_at']
        read_only_fields = ['id', 'created_at']


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = [
            'id', 'conversation', 'message', 'file_name', 'file_size',
            'mime_type', 'file_url', 'file_path', 'media_type',
            'width', 'height', 'duration', 'uploaded_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    client_details = ClientSerializer(source='client', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    attendant_name = serializers.SerializerMethodField()
    last_message = serializers.CharField(source='last_message_preview', read_only=True)

    class Meta:
        model = Conversation
        fields = [
            'id', 'company', 'client', 'client_details',
            'department', 'department_name',
            'channel', 'queue',
            'attendant', 'attendant_name',
            'status', 'priority',
            'last_message', 'last_message_at',
            'is_bot_active', 'message_count',
            'created_at', 'updated_at', 'closed_at',
        ]
        read_only_fields = [
            'id', 'company', 'last_message', 'last_message_at',
            'created_at', 'updated_at', 'closed_at',
        ]

    def get_attendant_name(self, obj):
        if obj.attendant:
            return obj.attendant.get_full_name() or obj.attendant.email
        return None


class ConversationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = [
            'client', 'department', 'channel', 'queue', 'priority',
        ]


class ConversationAssignSerializer(serializers.Serializer):
    attendant_id = serializers.UUIDField(required=False)
    department_id = serializers.UUIDField(required=False)


class QuickResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuickResponse
        fields = [
            'id', 'company', 'title', 'content', 'shortcut',
            'department', 'is_shared', 'category', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class QuickResponseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuickResponse
        fields = ['title', 'content', 'shortcut', 'department', 'is_shared', 'category']
