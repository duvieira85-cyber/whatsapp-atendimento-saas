from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IntegrationViewSet
from .webhooks.evolution_webhook import evolution_webhook

router = DefaultRouter()
router.register('', IntegrationViewSet, basename='integrations')

urlpatterns = [
    path('', include(router.urls)),
    path('webhooks/evolution/', evolution_webhook, name='evolution-webhook'),
    path('webhooks/evolution/<uuid:integration_id>/', evolution_webhook, name='evolution-webhook-by-id'),
]
