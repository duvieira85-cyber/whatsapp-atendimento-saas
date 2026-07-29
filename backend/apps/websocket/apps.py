from django.apps import AppConfig


class WebsocketConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.websocket'
    label = 'websocket_app'
    verbose_name = 'WebSocket'

    def ready(self):
        import apps.websocket.dispatcher  # noqa: registers handlers with EventBus
