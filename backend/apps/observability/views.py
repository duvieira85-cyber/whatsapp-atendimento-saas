from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import connection
from django.conf import settings
from django.core.cache import cache


class HealthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def health(self, request):
        result = {
            'status': 'ok',
            'version': '1.0.0',
        }

        try:
            connection.ensure_connection()
            result['database'] = 'ok'
        except Exception as e:
            result['database'] = str(e)
            result['status'] = 'degraded'

        try:
            cache.set('health_check', 'ok', 5)
            cache.get('health_check')
            result['cache'] = 'ok'
        except Exception as e:
            result['cache'] = str(e)
            if result['status'] == 'ok':
                result['status'] = 'degraded'

        try:
            import channels.layers
            channel_layer = channels.layers.get_channel_layer()
            result['websocket'] = 'ok'
        except Exception as e:
            result['websocket'] = str(e)
            if result['status'] == 'ok':
                result['status'] = 'degraded'

        status_code = status.HTTP_200_OK if result['status'] == 'ok' else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(result, status=status_code)

    @action(detail=False, methods=['get'])
    def ping(self, request):
        return Response({'pong': True})
