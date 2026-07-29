from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BotConfigViewSet, BotMenuOptionViewSet

router = DefaultRouter()
router.register('configs', BotConfigViewSet, basename='bot-configs')
router.register('menu-options', BotMenuOptionViewSet, basename='bot-menu-options')

urlpatterns = [
    path('', include(router.urls)),
]
