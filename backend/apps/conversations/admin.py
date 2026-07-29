from django.contrib import admin
from .models import Conversation, Message, QuickResponse


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['client', 'company', 'department', 'attendant', 'status', 'priority', 'last_message_at']
    list_filter = ['status', 'priority', 'company']
    search_fields = ['client__name', 'client__phone']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['conversation', 'sender_type', 'content_preview', 'created_at']
    list_filter = ['sender_type', 'message_type']

    def content_preview(self, obj):
        return obj.content[:80]


@admin.register(QuickResponse)
class QuickResponseAdmin(admin.ModelAdmin):
    list_display = ['title', 'shortcut', 'company', 'department', 'is_shared']
    list_filter = ['is_shared', 'company']
