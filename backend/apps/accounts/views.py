from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend

from .models import User
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    LoginSerializer, ChangePasswordSerializer, AdminResetPasswordSerializer,
)
from apps.core.permissions import CanManageUsers
from apps.observability.services import log_audit


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.select_related('company').get(username=serializer.validated_data['username'])
        except User.DoesNotExist:
            return Response(
                {'error': 'Credenciais inválidas'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(serializer.validated_data['password']):
            return Response(
                {'error': 'Credenciais inválidas'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {'error': 'Usuário inativo'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })

    @action(detail=False, methods=['post'])
    def refresh(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Token de refresh obrigatório'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            refresh = RefreshToken(refresh_token)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        except Exception:
            return Response(
                {'error': 'Token inválido'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

    @action(detail=False, methods=['get'])
    def me(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Não autenticado'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'Senha atual incorreta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])

        return Response({'detail': 'Senha alterada com sucesso.'})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('company').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active', 'company']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username', 'email', 'first_name']
    ordering = ['-date_joined']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [CanManageUsers()]

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company
        if not company:
            company = serializer.validated_data.get('company')
        if not company:
            from apps.companies.models import Company
            company = Company.objects.first()
        instance = serializer.save(company=company)
        if instance.role == 'attendant' and not hasattr(instance, 'attendant_profile'):
            from .models import Attendant
            Attendant.objects.create(user=instance)

    def perform_update(self, serializer):
        instance = serializer.instance
        data = serializer.validated_data

        if instance.role == 'super_admin':
            new_role = data.get('role', instance.role)
            new_is_active = data.get('is_active', instance.is_active)
            if new_role != 'super_admin' or not new_is_active:
                last_count = User.objects.filter(role='super_admin', is_active=True).exclude(id=instance.id).count()
                if last_count == 0:
                    raise PermissionDenied('Não é possível remover o último Super Administrador.')

        serializer.save()

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise PermissionDenied('Você não pode excluir a própria conta.')
        if instance.role == 'super_admin':
            last_count = User.objects.filter(role='super_admin', is_active=True).exclude(id=instance.id).count()
            if last_count == 0:
                raise PermissionDenied('Não é possível excluir o último Super Administrador.')
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[CanManageUsers])
    def admin_reset_password(self, request, pk=None):
        target = self.get_object()
        serializer = AdminResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target.set_password(serializer.validated_data['new_password'])
        target.save(update_fields=['password'])

        log_audit(
            user=request.user,
            action='password_reset',
            resource_type='user',
            resource_id=str(target.id),
            details={'reset_user': target.get_full_name() or target.username, 'reset_user_id': str(target.id)},
            ip_address=request.META.get('REMOTE_ADDR'),
            company=request.user.company if request.user.role != 'super_admin' else None,
        )

        return Response({'detail': 'Senha redefinida com sucesso.'})

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'super_admin':
            return qs
        if user.company:
            return qs.filter(company=user.company)
        return qs.none()

