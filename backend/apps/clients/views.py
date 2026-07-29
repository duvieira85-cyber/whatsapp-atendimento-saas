from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Client
from .serializers import ClientSerializer
from apps.core.permissions import IsAttendant
from apps.core.filters import TenantFilterMixin


class ClientViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated, IsAttendant]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_blocked']
    search_fields = ['name', 'phone', 'email', 'notes']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
