from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.integrations'
    verbose_name = 'Integrações'

    def ready(self):
        from apps.core.event_bus import event_bus
        from .services.evolution_service import EvolutionService
        event_bus.subscribe('message.sent', EvolutionService.handle_message_sent)
