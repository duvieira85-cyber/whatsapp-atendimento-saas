from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, MessageViewSet, QuickResponseViewSet

router = DefaultRouter()
router.register('', ConversationViewSet, basename='conversations')

urlpatterns = [
    path('messages/', MessageViewSet.as_view({'get': 'list', 'post': 'create'}), name='messages'),
    path('quick-responses/', QuickResponseViewSet.as_view({
        'get': 'list', 'post': 'create', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'
    }), name='quick-responses'),
    path('', include(router.urls)),
]
