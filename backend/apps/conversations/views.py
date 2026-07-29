import logging
from rest_framework import viewsets, filters, status
logger = logging.getLogger(__name__)
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from .models import Conversation, ConversationStatus, Message, QuickResponse, Timeline, Attachment
from .serializers import (
    ConversationSerializer, ConversationCreateSerializer,
    ConversationAssignSerializer, MessageSerializer,
    QuickResponseSerializer, QuickResponseCreateSerializer,
    TimelineSerializer, AttachmentSerializer,
)
from .services.conversation_service import ConversationService
from .services.message_service import MessageService
from .services.queue_service import QueueService
from .services.transfer_service import TransferService
from apps.core.permissions import IsAttendant
from apps.core.filters import TenantFilterMixin


class ConversationViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = Conversation.objects.select_related(
        'client', 'department', 'attendant', 'company'
    ).all()
    permission_classes = [IsAuthenticated, IsAttendant]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'department', 'attendant']
    search_fields = ['client__name', 'client__phone', 'last_message_preview']
    ordering_fields = ['last_message_at', 'created_at', 'priority']
    ordering = ['-last_message_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return ConversationCreateSerializer
        if self.action in ['assign', 'close', 'reopen']:
            return ConversationAssignSerializer
        return ConversationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.role not in ('super_admin', 'admin'):
            from django.db.models import Q
            dept_ids = list(user.department_memberships.values_list('department_id', flat=True))

            if user.role == 'supervisor':
                supervised = user.department_memberships.filter(
                    is_supervisor=True
                ).values_list('department_id', flat=True)
                qs = qs.filter(department_id__in=list(supervised))
            else:
                qs = qs.filter(
                    Q(department_id__in=dept_ids, status=ConversationStatus.WAITING) |
                    Q(attendant=user)
                )

        if self.action == 'list':
            return qs.only(
                'id', 'company_id', 'client_id', 'department_id', 'attendant_id',
                'status', 'priority', 'last_message_preview', 'last_message_at',
                'is_bot_active', 'message_count', 'created_at', 'updated_at',
            )
        return qs

    def perform_create(self, serializer):
        company = self.request.user.company or getattr(serializer.validated_data.get('department'), 'company', None)
        svc = ConversationService(user=self.request.user, company=company)
        conversation = svc.create_conversation(
            client=serializer.validated_data['client'],
            channel=serializer.validated_data.get('channel'),
            queue=serializer.validated_data.get('queue'),
            department=serializer.validated_data.get('department'),
            priority=serializer.validated_data.get('priority', 'normal'),
        )
        return Response(ConversationSerializer(conversation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        conversation = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        svc = ConversationService(user=request.user, company=conversation.company)
        svc.assign(conversation, request.user)
        return Response(ConversationSerializer(conversation).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        conversation = self.get_object()
        svc = ConversationService(user=request.user, company=conversation.company)
        svc.close(conversation, closed_by=request.user)

        Message.objects.create(
            company=conversation.company,
            conversation=conversation,
            sender_type='system',
            content='Conversa encerrada',
        )

        return Response(ConversationSerializer(conversation).data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        conversation = self.get_object()
        svc = ConversationService(user=request.user, company=conversation.company)
        svc.reopen(conversation, reopened_by=request.user)
        return Response(ConversationSerializer(conversation).data)

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        conversation = self.get_object()

        import json as _json
        body_raw = request.body
        try:
            body_parsed = _json.loads(body_raw) if body_raw else {}
        except Exception:
            body_parsed = {}

        to_attendant_id = request.data.get('attendant_id') or body_parsed.get('attendant_id')
        to_department_id = request.data.get('department_id') or body_parsed.get('department_id')

        logger.warning(
            'TRANSFER_DEBUG: conversation=%s department_id=%s attendant_id=%s '
            'conversation_company=%s user=%s user_role=%s user_company=%s body=%s',
            conversation.id, to_department_id, to_attendant_id,
            conversation.company_id, request.user.id, request.user.role,
            request.user.company_id if hasattr(request.user, 'company_id') else None,
            body_raw.decode() if body_raw else None,
        )

        if not to_attendant_id and not to_department_id:
            return Response(
                {
                    'error': 'Informe attendant_id ou department_id',
                    'debug': {
                        'received_department_id': to_department_id,
                        'received_attendant_id': to_attendant_id,
                        'request_data': dict(request.data.items()) if hasattr(request.data, 'items') else request.data,
                        'body_raw': body_raw.decode() if body_raw else None,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        to_attendant = None
        to_department = None

        if to_attendant_id:
            from apps.accounts.models import User
            try:
                to_attendant = User.objects.get(id=to_attendant_id, company=conversation.company)
            except User.DoesNotExist:
                return Response(
                    {
                        'error': 'Atendente não encontrado',
                        'debug': {
                            'attendant_id': to_attendant_id,
                            'conversation_company': str(conversation.company_id),
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if to_department_id:
            from apps.departments.models import Department
            total_depts = Department.objects.filter(id=to_department_id).count()
            depts_in_conv_company = Department.objects.filter(
                id=to_department_id, company=conversation.company
            ).count()
            try:
                to_department = Department.objects.get(id=to_department_id, company=conversation.company)
            except Department.DoesNotExist:
                return Response(
                    {
                        'error': 'Departamento não encontrado',
                        'debug': {
                            'department_id': to_department_id,
                            'conversation_company': str(conversation.company_id),
                            'total_departments_with_this_id': total_depts,
                            'departments_in_conversation_company': depts_in_conv_company,
                            'user_company': str(request.user.company_id) if request.user.company_id else None,
                            'user_role': request.user.role,
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        ts = TransferService(user=request.user, company=conversation.company)
        ts.request_transfer(conversation, to_attendant=to_attendant, to_department=to_department,
                            reason=request.data.get('reason', ''))
        return Response(ConversationSerializer(conversation).data)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        msgs = conversation.messages.select_related('sender_user', 'sender_client').all().order_by('-created_at')
        page = self.paginate_queryset(msgs)
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = MessageSerializer(msgs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        conversation = self.get_object()
        entries = conversation.timeline_entries.all()
        page = self.paginate_queryset(entries)
        if page is not None:
            serializer = TimelineSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = TimelineSerializer(entries, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def attachments(self, request, pk=None):
        conversation = self.get_object()
        attachments = conversation.attachments.all()
        serializer = AttachmentSerializer(attachments, many=True)
        return Response(serializer.data)


class MessageViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = Message.objects.select_related('sender_user', 'sender_client').all()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated, IsAttendant]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['conversation', 'sender_type', 'message_type']
    ordering = ['created_at']

    def perform_create(self, serializer):
        conversation = serializer.validated_data['conversation']
        svc = MessageService(company=conversation.company)
        msg = svc.send_from_attendant(
            conversation=conversation,
            attendant=self.request.user,
            content=serializer.validated_data.get('content', ''),
            message_type=serializer.validated_data.get('message_type', 'text'),
        )
        serializer.instance = msg


class QuickResponseViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = QuickResponse.objects.all()
    permission_classes = [IsAuthenticated, IsAttendant]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['department', 'is_shared']
    search_fields = ['title', 'content', 'shortcut']
    ordering_fields = ['title']
    ordering = ['title']

    def get_serializer_class(self):
        if self.action == 'create':
            return QuickResponseCreateSerializer
        return QuickResponseSerializer

    def perform_create(self, serializer):
        from apps.core.middleware import get_current_company
        serializer.save(company=get_current_company())

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'super_admin':
            return qs
        if user.company:
            return qs.filter(company=user.company)
        return qs.none()
