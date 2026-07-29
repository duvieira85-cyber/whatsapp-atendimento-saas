from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import BotConfig, BotMenuOption
from .serializers import BotConfigSerializer, BotMenuOptionSerializer
from apps.core.permissions import CanManageCompany, IsAttendant
from apps.core.filters import TenantFilterMixin


class BotConfigViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = BotConfig.objects.all()
    serializer_class = BotConfigSerializer
    permission_classes = [IsAuthenticated, CanManageCompany]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'super_admin':
            return qs
        if user.company:
            return qs.filter(company=user.company)
        return qs.none()

class BotMenuOptionViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = BotMenuOption.objects.all()
    serializer_class = BotMenuOptionSerializer
    permission_classes = [IsAuthenticated, CanManageCompany]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['bot_config', 'department']
    ordering = ['order']
