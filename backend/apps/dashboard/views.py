from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from apps.conversations.models import Conversation, ConversationStatus, ConversationPriority
from apps.departments.models import Department
from apps.core.permissions import IsAttendant


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAttendant]

    def _get_company(self, request):
        if request.user.role == 'super_admin':
            return None
        return request.user.company

    @action(detail=False, methods=['get'])
    def summary(self, request):
        company = self._get_company(request)
        filters = {}
        if company:
            filters['company'] = company

        total_waiting = Conversation.objects.filter(
            **filters, status=ConversationStatus.WAITING
        ).count()
        total_active = Conversation.objects.filter(
            **filters, status=ConversationStatus.ACTIVE
        ).count()
        total_closed = Conversation.objects.filter(
            **filters, status=ConversationStatus.CLOSED
        ).count()
        total_urgent = Conversation.objects.filter(
            **filters, priority=ConversationPriority.URGENT,
            status__in=[ConversationStatus.WAITING, ConversationStatus.ACTIVE],
        ).count()

        return Response({
            'waiting': total_waiting,
            'active': total_active,
            'closed': total_closed,
            'urgent': total_urgent,
            'total': total_waiting + total_active,
        })

    @action(detail=False, methods=['get'])
    def by_department(self, request):
        company = self._get_company(request)
        filters = {}
        if company:
            filters['company'] = company

        departments = Department.objects.filter(**filters).annotate(
            waiting_count=Count(
                'conversations',
                filter=Q(conversations__status=ConversationStatus.WAITING)
            ),
            active_count=Count(
                'conversations',
                filter=Q(conversations__status=ConversationStatus.ACTIVE)
            ),
        )

        return Response([
            {
                'id': dept.id,
                'name': dept.name,
                'waiting': dept.waiting_count,
                'active': dept.active_count,
                'total': dept.waiting_count + dept.active_count,
            }
            for dept in departments
        ])

    @action(detail=False, methods=['get'])
    def by_attendant(self, request):
        company = self._get_company(request)
        filters = {}
        if company:
            filters['company'] = company

        conversations = Conversation.objects.filter(**filters)
        data = (
            conversations
            .filter(status=ConversationStatus.ACTIVE)
            .values('attendant__id', 'attendant__email')
            .annotate(count=Count('id'))
        )

        return Response([
            {
                'attendant_id': item['attendant__id'],
                'email': item['attendant__email'],
                'conversations': item['count'],
            }
            for item in data
        ])

    @action(detail=False, methods=['get'])
    def recent_activity(self, request):
        company = self._get_company(request)
        filters = {}
        if company:
            filters['company'] = company

        last_hour = timezone.now() - timedelta(hours=1)
        recent = Conversation.objects.filter(
            **filters, last_message_at__gte=last_hour
        ).select_related('client', 'department').order_by('-last_message_at')[:10]

        return Response([{
            'id': c.id,
            'client_name': c.client.name,
            'department': c.department.name if c.department else None,
            'status': c.status,
            'last_message': c.last_message_preview[:100] if c.last_message_preview else '',
            'last_message_at': c.last_message_at,
        } for c in recent])
