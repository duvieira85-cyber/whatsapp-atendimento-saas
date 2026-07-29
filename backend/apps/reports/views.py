from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, Q, F
from django.db.models.functions import TruncDate, TruncHour
from django.utils import timezone
from datetime import timedelta, date

from apps.conversations.models import Conversation, ConversationStatus, ConversationPriority, Message
from apps.core.permissions import IsSupervisor


class ReportsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsSupervisor]

    def _get_company(self, request):
        if request.user.role == 'super_admin':
            return None
        return request.user.company

    @action(detail=False, methods=['get'])
    def general(self, request):
        company = self._get_company(request)
        days = int(request.query_params.get('days', 30))
        filters = {}
        if company:
            filters['company'] = company

        start_date = timezone.now() - timedelta(days=days)

        conversations = Conversation.objects.filter(**filters, created_at__gte=start_date)
        total = conversations.count()
        closed = conversations.filter(status=ConversationStatus.CLOSED).count()
        avg_response_time = None

        return Response({
            'period_days': days,
            'total_conversations': total,
            'closed_conversations': closed,
            'closing_rate': round((closed / total * 100) if total > 0 else 0, 2),
        })

    @action(detail=False, methods=['get'])
    def by_period(self, request):
        company = self._get_company(request)
        days = int(request.query_params.get('days', 7))
        filters = {}
        if company:
            filters['company'] = company

        start_date = timezone.now() - timedelta(days=days)
        conversations = Conversation.objects.filter(**filters, created_at__gte=start_date)
        daily = (
            conversations
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        return Response([
            {'date': item['date'], 'count': item['count']}
            for item in daily
        ])

    @action(detail=False, methods=['get'])
    def by_attendant(self, request):
        company = self._get_company(request)
        days = int(request.query_params.get('days', 30))
        filters = {}
        if company:
            filters['company'] = company

        start_date = timezone.now() - timedelta(days=days)
        conversations = Conversation.objects.filter(**filters, created_at__gte=start_date)
        data = (
            conversations
            .values('attendant__id', 'attendant__email')
            .annotate(
                total=Count('id'),
                closed=Count('id', filter=Q(status=ConversationStatus.CLOSED)),
            )
            .order_by('-total')
        )

        return Response([
            {
                'attendant_id': item['attendant__id'],
                'email': item['attendant__email'],
                'total': item['total'],
                'closed': item['closed'],
            }
            for item in data if item['attendant__id'] is not None
        ])

    @action(detail=False, methods=['get'])
    def sla(self, request):
        company = self._get_company(request)
        days = int(request.query_params.get('days', 30))
        filters = {}
        if company:
            filters['company'] = company

        start_date = timezone.now() - timedelta(days=days)
        conversations = Conversation.objects.filter(**filters, created_at__gte=start_date)
        total = conversations.count()
        urgent = conversations.filter(priority=ConversationPriority.URGENT).count()

        return Response({
            'period_days': days,
            'total_conversations': total,
            'urgent_conversations': urgent,
        })
