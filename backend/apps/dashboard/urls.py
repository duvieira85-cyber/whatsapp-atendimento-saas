from django.urls import path
from .views import DashboardViewSet

urlpatterns = [
    path('summary/', DashboardViewSet.as_view({'get': 'summary'}), name='dashboard-summary'),
    path('by-department/', DashboardViewSet.as_view({'get': 'by_department'}), name='dashboard-by-department'),
    path('by-attendant/', DashboardViewSet.as_view({'get': 'by_attendant'}), name='dashboard-by-attendant'),
    path('recent/', DashboardViewSet.as_view({'get': 'recent_activity'}), name='dashboard-recent'),
]
