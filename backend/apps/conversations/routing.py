from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/company/$', consumers.CompanyConsumer.as_asgi()),
    re_path(r'ws/queue/$', consumers.QueueConsumer.as_asgi()),
    re_path(r'ws/user/$', consumers.UserConsumer.as_asgi()),
    re_path(r'ws/conversations/(?P<conversation_id>[0-9a-f-]+)/', consumers.ConversationConsumer.as_asgi()),
]
