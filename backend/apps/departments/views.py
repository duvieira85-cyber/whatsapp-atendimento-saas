from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Department, DepartmentMember
from .serializers import DepartmentSerializer, DepartmentMemberSerializer
from apps.core.permissions import CanManageCompany, IsSupervisor, IsAttendant
from apps.core.filters import TenantFilterMixin


class DepartmentViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = Department.objects.select_related('company').all()
    serializer_class = DepartmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'company']
    search_fields = ['name', 'description']
    ordering_fields = ['order', 'name', 'created_at']
    ordering = ['order', 'name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated(), IsAttendant()]
        return [IsAuthenticated(), CanManageCompany()]



class DepartmentMemberViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = DepartmentMember.objects.select_related('user', 'department', 'company').all()
    serializer_class = DepartmentMemberSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['department', 'user', 'is_supervisor']
    company_field = 'department__company'

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated(), IsAttendant()]
        return [IsAuthenticated(), CanManageCompany()]

    def perform_create(self, serializer):
        serializer.save(company=serializer.validated_data['department'].company)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'super_admin':
            return qs
        if user.company:
            return qs.filter(department__company=user.company)
        return qs.none()
