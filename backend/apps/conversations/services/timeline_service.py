import logging
from typing import Optional
from decimal import Decimal
from django.utils import timezone

logger = logging.getLogger(__name__)

TIMELINE_EVENT_TYPES = {
    'conversation.created': 'conversa_criada',
    'queue.entered': 'entrou_na_fila',
    'queue.left': 'saiu_da_fila',
    'conversation.assigned': 'atendente_atribuido',
    'conversation.transferred': 'conversa_transferida',
    'conversation.closed': 'conversa_encerrada',
    'conversation.reopened': 'conversa_reaberta',
    'message.received': 'mensagem_recebida',
    'message.sent': 'mensagem_enviada',
    'attendant.joined': 'atendente_entrou',
    'attendant.left': 'atendente_saiu',
    'sla.expired': 'sla_expirado',
}


class TimelineService:

    def __init__(self, conversation):
        self.conversation = conversation

    def register(self, event_type: str, description: str, metadata: Optional[dict] = None,
                 user_id: Optional[str] = None):
        from ..models import Timeline
        try:
            Timeline.objects.create(
                company=self.conversation.company,
                conversation=self.conversation,
                event_type=event_type,
                description=description,
                metadata=metadata or {},
                created_by_id=user_id,
            )
        except Exception as e:
            logger.exception('Erro ao registrar timeline %s: %s', event_type, e)

    def conversation_created(self, **kwargs):
        self.register('conversation.created', 'Conversa criada', kwargs)

    def queue_entered(self, queue_name: str, **kwargs):
        self.register('queue.entered', f'Entrou na fila: {queue_name}', kwargs)

    def queue_left(self, queue_name: str, **kwargs):
        self.register('queue.left', f'Saiu da fila: {queue_name}', kwargs)

    def assigned(self, attendant_name: str, **kwargs):
        self.register('conversation.assigned', f'Atribuída para: {attendant_name}', kwargs)

    def transferred(self, from_name: str, to_name: str, reason: str = '', **kwargs):
        desc = f'Transferida de {from_name} para {to_name}'
        if reason:
            desc += f' — Motivo: {reason}'
        self.register('conversation.transferred', desc, kwargs)

    def closed(self, closed_by_name: str, **kwargs):
        self.register('conversation.closed', f'Encerrada por: {closed_by_name}', kwargs)

    def reopened(self, reopened_by_name: str, **kwargs):
        self.register('conversation.reopened', f'Reaberta por: {reopened_by_name}', kwargs)

    def message_received(self, preview: str, **kwargs):
        self.register('message.received', f'Mensagem recebida: {preview[:80]}', kwargs)

    def message_sent(self, preview: str, **kwargs):
        self.register('message.sent', f'Mensagem enviada: {preview[:80]}', kwargs)
