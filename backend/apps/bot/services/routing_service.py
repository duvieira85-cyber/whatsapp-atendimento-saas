import logging
import unicodedata
from typing import Optional
from django.db import transaction
from django.utils import timezone

from apps.conversations.models import Conversation, Message, SenderType, MessageType
from apps.conversations.services.message_service import MessageService
from apps.conversations.services.timeline_service import TimelineService
from apps.core.event_bus import event_bus
from apps.core.domain_events import ConversationTransferred, QueueEntered

logger = logging.getLogger(__name__)

DEPARTMENT_ITEM = "{number} - {name}"

GREETING = (
    "Ola! Seja bem-vindo ao nosso atendimento.\n\n"
    "Para direcionarmos sua solicitacao, escolha um dos setores abaixo:\n\n"
    "{departments}\n"
    "Digite apenas o numero ou o nome do setor."
)

INVALID_RESPONSE = (
    "Desculpe, nao consegui identificar o setor desejado.\n\n"
    "Escolha uma das opcoes abaixo:\n\n"
    "{departments}\n"
    "Digite apenas o numero ou o nome do setor."
)

ASSIGNED = (
    "Voce foi direcionado para o setor de {department}.\n\n"
    "Em breve um atendente ira atende-lo(a)."
)


def _normalize(text: str) -> str:
    text = text.strip().lower()
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    return text


def _format_department_list(departments) -> str:
    lines = []
    for i, dept in enumerate(departments, 1):
        lines.append(DEPARTMENT_ITEM.format(number=i, name=dept.name))
    return '\n'.join(lines)


class BotRoutingService:

    def __init__(self, company):
        self.company = company
        self.message_service = MessageService(company)

    @transaction.atomic
    def process_message(self, conversation: Conversation, content: str):
        if conversation.department is not None:
            return

        from apps.departments.models import Department
        departments = list(Department.objects.filter(
            company=self.company,
            is_active=True,
        ).order_by('order', 'name'))

        if not departments:
            return

        has_bot_message = Message.objects.filter(
            conversation=conversation,
            sender_type=SenderType.BOT,
        ).exists()

        if not has_bot_message:
            self._send_greeting(conversation, departments)
            return

        matched = self._match_department(content, departments)
        if matched is not None:
            self._assign_department(conversation, matched)
        else:
            self._send_invalid(conversation, departments)

    def _send_greeting(self, conversation, departments):
        text = GREETING.format(departments=_format_department_list(departments))
        self.message_service.send_bot_message(conversation, text)
        TimelineService(conversation).message_sent("Bot: saudacao com lista de departamentos")

    def _send_invalid(self, conversation, departments):
        text = INVALID_RESPONSE.format(departments=_format_department_list(departments))
        self.message_service.send_bot_message(conversation, text)
        TimelineService(conversation).message_sent("Bot: opcao invalida, reenviou lista")

    def _match_department(self, content: str, departments) -> Optional:
        normalized = _normalize(content)

        if normalized.isdigit():
            idx = int(normalized) - 1
            if 0 <= idx < len(departments):
                return departments[idx]

        for dept in departments:
            dept_normalized = _normalize(dept.name)
            if normalized == dept_normalized:
                return dept

        return None

    def _assign_department(self, conversation, department):
        from apps.conversations.models import Queue, ConversationStatus

        conversation.department = department
        conversation.status = ConversationStatus.WAITING
        conversation.save(update_fields=['department', 'status', 'updated_at'])

        queue = Queue.objects.filter(
            department=department,
            is_active=True,
        ).order_by('order', 'name').first()

        if queue:
            conversation.queue = queue
            conversation.save(update_fields=['queue'])
            TimelineService(conversation).queue_entered(queue.name, queue_id=str(queue.id))
            transaction.on_commit(lambda: event_bus.publish('queue.entered', QueueEntered(
                conversation_id=str(conversation.id),
                company_id=str(self.company.id),
                queue_id=str(queue.id),
            ).to_dict(), source='bot_routing_service'))

        TimelineService(conversation).transferred(
            from_name='bot', to_name=department.name,
            reason='Selecao automatica via bot',
            from_attendant_id=None, to_attendant_id=None,
        )

        text = ASSIGNED.format(department=department.name)
        self.message_service.send_bot_message(conversation, text)
        TimelineService(conversation).message_sent(f"Bot: conversa direcionada para {department.name}")

        transaction.on_commit(lambda: event_bus.publish('conversation.transferred', ConversationTransferred(
            conversation_id=str(conversation.id),
            company_id=str(self.company.id),
            from_attendant_id=None,
            to_attendant_id=None,
            from_department_id=None,
            to_department_id=str(department.id),
            reason='Selecao via bot',
        ).to_dict(), source='bot_routing_service'))
