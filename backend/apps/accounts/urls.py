from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthViewSet, UserViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='users')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', AuthViewSet.as_view({'post': 'login'}), name='auth-login'),
    path('refresh/', AuthViewSet.as_view({'post': 'refresh'}), name='auth-refresh'),
    path('me/', AuthViewSet.as_view({'get': 'me'}), name='auth-me'),
    path('change-password/', AuthViewSet.as_view({'post': 'change_password'}), name='auth-change-password'),
]
