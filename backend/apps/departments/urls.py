from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepartmentViewSet, DepartmentMemberViewSet

router = DefaultRouter()
router.register('members', DepartmentMemberViewSet, basename='department-members')
router.register('', DepartmentViewSet, basename='departments')

urlpatterns = [
    path('', include(router.urls)),
]
