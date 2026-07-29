from django.urls import path
from .views import HealthViewSet

urlpatterns = [
    path('health/', HealthViewSet.as_view({'get': 'health'}), name='health-check'),
    path('ping/', HealthViewSet.as_view({'get': 'ping'}), name='health-ping'),
]
