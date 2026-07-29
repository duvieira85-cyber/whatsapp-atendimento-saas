from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings

from .models import Integration
from .serializers import IntegrationSerializer, IntegrationCreateSerializer
from apps.core.permissions import CanManageCompany
from apps.core.filters import TenantFilterMixin

from .services.evolution_client import EvolutionAPIError


class IntegrationViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = Integration.objects.all()
    permission_classes = [IsAuthenticated, CanManageCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['provider', 'is_active']
    search_fields = ['name']

    def get_serializer_class(self):
        if self.action == 'create':
            return IntegrationCreateSerializer
        return IntegrationSerializer

    def perform_create(self, serializer):
        serializer.save(provider='evolution')

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'super_admin':
            return qs
        if user.company:
            return qs.filter(company=user.company)
        return qs.none()

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        integration = self.get_object()
        if integration.provider != 'evolution':
            return Response({
                'status': 'ok',
                'message': 'Integração configurada corretamente',
            })

        evo_url = settings.EVOLUTION_API_URL
        api_key = settings.EVOLUTION_API_KEY

        if not evo_url or not api_key:
            return Response(
                {'error': 'Evolution API não configurada no servidor'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .services.evolution_client import EvolutionAPIClient
        client = EvolutionAPIClient(
            base_url=evo_url,
            api_key=api_key,
            instance_name='test-connection',
            timeout=10,
        )
        try:
            data = client.connection_state()
            return Response({
                'status': 'ok',
                'message': 'Conexão com Evolution API estabelecida',
                'details': data,
            })
        except EvolutionAPIError as e:
            return Response(
                {'error': f'Erro de conexão com Evolution API: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=True, methods=['post'])
    def evolution_connect(self, request, pk=None):
        integration = self.get_object()
        if integration.provider != 'evolution':
            return Response({'error': 'Provider must be evolution'}, status=status.HTTP_400_BAD_REQUEST)

        if not settings.EVOLUTION_API_KEY:
            return Response(
                {'error': 'Evolution API não configurada no servidor'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .services.evolution_service import EvolutionService
        svc = EvolutionService(integration)
        try:
            result = svc.connect()
        except EvolutionAPIError as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        channel = svc._get_or_create_channel()
        result['connected_number'] = channel.phone_number or None
        result['last_sync_at'] = integration.last_sync_at.isoformat() if integration.last_sync_at else None
        return Response(result)

    @action(detail=True, methods=['get'])
    def evolution_qrcode(self, request, pk=None):
        integration = self.get_object()
        if integration.provider != 'evolution':
            return Response({'error': 'Provider must be evolution'}, status=status.HTTP_400_BAD_REQUEST)

        from .services.evolution_service import EvolutionService
        svc = EvolutionService(integration)
        try:
            qr = svc.get_qr_code()
        except EvolutionAPIError as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'qr_code': qr or ''})

    @action(detail=True, methods=['post'])
    def evolution_disconnect(self, request, pk=None):
        integration = self.get_object()
        if integration.provider != 'evolution':
            return Response({'error': 'Provider must be evolution'}, status=status.HTTP_400_BAD_REQUEST)

        from .services.evolution_service import EvolutionService
        svc = EvolutionService(integration)
        try:
            result = svc.disconnect()
        except EvolutionAPIError as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(result)

    @action(detail=True, methods=['get'])
    def evolution_status(self, request, pk=None):
        integration = self.get_object()
        if integration.provider != 'evolution':
            return Response({'error': 'Provider must be evolution'}, status=status.HTTP_400_BAD_REQUEST)

        from .services.evolution_service import EvolutionService
        svc = EvolutionService(integration)
        try:
            status_val = svc.check_connection()
        except EvolutionAPIError as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        channel = svc._get_or_create_channel()
        return Response({
            'connection_status': status_val,
            'last_sync_at': integration.last_sync_at.isoformat() if integration.last_sync_at else None,
            'connected_number': channel.phone_number or None,
        })
