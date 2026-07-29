from rest_framework import serializers
from .models import Department, DepartmentMember


class DepartmentSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'company', 'name', 'description', 'is_active',
            'order', 'member_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at', 'member_count']

    def get_member_count(self, obj):
        return obj.members.count()


class DepartmentMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = DepartmentMember
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'department', 'is_supervisor', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.email
