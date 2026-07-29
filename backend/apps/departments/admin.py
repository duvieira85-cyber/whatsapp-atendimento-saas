from django.contrib import admin
from .models import Department, DepartmentMember


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'is_active', 'order', 'created_at']
    list_filter = ['is_active', 'company']
    search_fields = ['name', 'company__name']


@admin.register(DepartmentMember)
class DepartmentMemberAdmin(admin.ModelAdmin):
    list_display = ['user', 'department', 'is_supervisor']
    list_filter = ['is_supervisor', 'department__company']
