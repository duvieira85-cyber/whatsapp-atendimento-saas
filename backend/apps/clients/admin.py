from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'company', 'is_blocked', 'created_at']
    list_filter = ['is_blocked', 'company']
    search_fields = ['name', 'phone', 'email']
