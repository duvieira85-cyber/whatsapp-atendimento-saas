from django.urls import path
from .views import ReportsViewSet

urlpatterns = [
    path('general/', ReportsViewSet.as_view({'get': 'general'}), name='reports-general'),
    path('by-period/', ReportsViewSet.as_view({'get': 'by_period'}), name='reports-by-period'),
    path('by-attendant/', ReportsViewSet.as_view({'get': 'by_attendant'}), name='reports-by-attendant'),
    path('sla/', ReportsViewSet.as_view({'get': 'sla'}), name='reports-sla'),
]
