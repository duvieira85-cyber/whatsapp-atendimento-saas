from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel, TenantModel


class ConversationPriority(models.TextChoices):
    LOW = 'low', _('Baixa')
    NORMAL = 'normal', _('Normal')
    HIGH = 'high', _('Alta')
    URGENT = 'urgent', _('Urgente')


class ConversationStatus(models.TextChoices):
    WAITING = 'waiting', _('Aguardando')
    ACTIVE = 'active', _('Em atendimento')
    TRANSFERRED = 'transferred', _('Transferida')
    CLOSED = 'closed', _('Encerrada')


class MessageType(models.TextChoices):
    TEXT = 'text', _('Texto')
    IMAGE = 'image', _('Imagem')
    AUDIO = 'audio', _('Áudio')
    VIDEO = 'video', _('Vídeo')
    DOCUMENT = 'document', _('Documento')
    LOCATION = 'location', _('Localização')
    BUTTON = 'button', _('Botão')
    LIST = 'list', _('Lista')
    TEMPLATE = 'template', _('Template')
    SYSTEM = 'system', _('Sistema')


class SenderType(models.TextChoices):
    CLIENT = 'client', _('Cliente')
    ATTENDANT = 'attendant', _('Atendente')
    BOT = 'bot', _('Bot')
    SYSTEM = 'system', _('Sistema')


class DeliveryStatus(models.TextChoices):
    PENDING = 'pending', _('Pendente')
    SENT = 'sent', _('Enviada')
    DELIVERED = 'delivered', _('Entregue')
    READ = 'read', _('Lida')
    FAILED = 'failed', _('Falhou')


class TransferStatus(models.TextChoices):
    PENDING = 'pending', _('Pendente')
    ACCEPTED = 'accepted', _('Aceita')
    REJECTED = 'rejected', _('Rejeitada')
    CANCELLED = 'cancelled', _('Cancelada')


class Queue(TimeStampedModel, TenantModel):
    name = models.CharField(max_length=255, verbose_name=_('Nome'))
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.CASCADE,
        related_name='queues',
        verbose_name=_('Departamento'),
    )
    max_wait_time = models.IntegerField(default=300, verbose_name=_('Tempo máx. espera (s)'))
    max_concurrent = models.IntegerField(default=10, verbose_name=_('Máx. simultâneos'))
    is_active = models.BooleanField(default=True, verbose_name=_('Ativo'))
    order = models.IntegerField(default=0, verbose_name=_('Ordem'))

    class Meta:
        verbose_name = _('Fila')
        verbose_name_plural = _('Filas')
        db_table = 'conversations_queue'
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['department', 'is_active']),
        ]

    def __str__(self):
        return f'{self.name} - {self.department.name if self.department_id else "?"}'


class Conversation(TimeStampedModel, TenantModel):
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.CASCADE,
        related_name='conversations',
        verbose_name=_('Cliente'),
    )
    channel = models.ForeignKey(
        'channels_app.Channel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations',
        verbose_name=_('Canal'),
    )
    queue = models.ForeignKey(
        Queue,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations',
        verbose_name=_('Fila'),
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations',
        verbose_name=_('Departamento'),
    )
    attendant = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_conversations',
        verbose_name=_('Atendente'),
    )
    status = models.CharField(
        max_length=20,
        choices=ConversationStatus.choices,
        default=ConversationStatus.WAITING,
        verbose_name=_('Status'),
    )
    priority = models.CharField(
        max_length=10,
        choices=ConversationPriority.choices,
        default=ConversationPriority.NORMAL,
        verbose_name=_('Prioridade'),
    )
    is_bot_active = models.BooleanField(default=True, verbose_name=_('Bot ativo'))
    last_message_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Última mensagem'))
    last_message_preview = models.TextField(blank=True, default='', verbose_name=_('Pré-visualização'))
    message_count = models.IntegerField(default=0, verbose_name=_('Total de mensagens'))
    metadata = models.JSONField(default=dict, blank=True, verbose_name=_('Metadados'))
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Encerrada em'))
    closed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='closed_conversations',
        verbose_name=_('Encerrada por'),
    )

    class Meta:
        verbose_name = _('Conversa')
        verbose_name_plural = _('Conversas')
        db_table = 'conversations'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['last_message_at']),
            models.Index(fields=['attendant', 'status']),
            models.Index(fields=['company', 'status']),
            models.Index(fields=['client', 'status']),
        ]
        ordering = ['-last_message_at', '-created_at']

    def __str__(self):
        return f'{self.client.name} - {self.get_status_display()}'


class Participant(TimeStampedModel, TenantModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='participants',
        verbose_name=_('Conversa'),
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='conversation_participations',
        verbose_name=_('Usuário'),
    )
    role = models.CharField(
        max_length=20,
        choices=[('attendant', _('Atendente')), ('supervisor', _('Supervisor')), ('observer', _('Observador'))],
        default='attendant',
        verbose_name=_('Função na conversa'),
    )
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Entrou em'))
    left_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Saiu em'))
    is_active = models.BooleanField(default=True, verbose_name=_('Ativo'))

    class Meta:
        verbose_name = _('Participante')
        verbose_name_plural = _('Participantes')
        db_table = 'conversations_participant'
        unique_together = ['conversation', 'user']
        indexes = [
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f'{self.user} - {self.conversation}'


class Message(TimeStampedModel, TenantModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name=_('Conversa'),
    )
    sender_type = models.CharField(
        max_length=10,
        choices=SenderType.choices,
        verbose_name=_('Tipo de remetente'),
    )
    sender_user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_messages',
        verbose_name=_('Remetente (usuário)'),
    )
    sender_client = models.ForeignKey(
        'clients.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_messages',
        verbose_name=_('Remetente (cliente)'),
    )
    message_type = models.CharField(
        max_length=10,
        choices=MessageType.choices,
        default=MessageType.TEXT,
        verbose_name=_('Tipo de mensagem'),
    )
    content = models.TextField(verbose_name=_('Conteúdo'))
    media_url = models.URLField(blank=True, default='', verbose_name=_('URL da mídia'))
    media_name = models.CharField(max_length=255, blank=True, default='', verbose_name=_('Nome da mídia'))
    media_size = models.IntegerField(null=True, blank=True, verbose_name=_('Tamanho da mídia (bytes)'))
    delivery_status = models.CharField(
        max_length=10,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.SENT,
        verbose_name=_('Status de entrega'),
    )
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name=_('Resposta a'),
    )
    delivered_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Entregue em'))
    read_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Lida em'))
    external_id = models.CharField(max_length=255, blank=True, default='', verbose_name=_('ID externo'))
    metadata = models.JSONField(default=dict, blank=True, verbose_name=_('Metadados'))

    class Meta:
        verbose_name = _('Mensagem')
        verbose_name_plural = _('Mensagens')
        db_table = 'conversations_message'
        indexes = [
            models.Index(fields=['sender_type']),
            models.Index(fields=['message_type']),
            models.Index(fields=['delivery_status']),
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['created_at']),
            models.Index(fields=['external_id']),
        ]
        ordering = ['created_at']

    def __str__(self):
        return f'Msg {self.message_type} - {self.content[:50]}'


class Transfer(TimeStampedModel, TenantModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='transfers',
        verbose_name=_('Conversa'),
    )
    requested_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transfer_requests',
        verbose_name=_('Solicitado por'),
    )
    from_attendant = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transfers_from',
        verbose_name=_('Atendente de origem'),
    )
    to_attendant = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transfers_to',
        verbose_name=_('Atendente de destino'),
    )
    from_department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transfers_from',
        verbose_name=_('Departamento de origem'),
    )
    to_department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transfers_to',
        verbose_name=_('Departamento de destino'),
    )
    reason = models.TextField(blank=True, default='', verbose_name=_('Motivo'))
    status = models.CharField(
        max_length=10,
        choices=TransferStatus.choices,
        default=TransferStatus.PENDING,
        verbose_name=_('Status'),
    )
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Resolvida em'))

    class Meta:
        verbose_name = _('Transferência')
        verbose_name_plural = _('Transferências')
        db_table = 'conversations_transfer'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['conversation', 'status']),
            models.Index(fields=['to_attendant', 'status']),
        ]

    def __str__(self):
        return f'Transferência - {self.conversation}'


class Timeline(TimeStampedModel, TenantModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='timeline_entries',
        verbose_name=_('Conversa'),
    )
    event_type = models.CharField(max_length=50, verbose_name=_('Tipo de evento'))
    description = models.TextField(verbose_name=_('Descrição'))
    metadata = models.JSONField(default=dict, blank=True, verbose_name=_('Metadados'))
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='timeline_entries',
        verbose_name=_('Criado por'),
    )

    class Meta:
        verbose_name = _('Linha do Tempo')
        verbose_name_plural = _('Linhas do Tempo')
        db_table = 'conversations_timeline'
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['event_type']),
        ]
        ordering = ['created_at']

    def __str__(self):
        return f'{self.get_event_type_display()}: {self.description[:60]}'


class Attachment(TimeStampedModel, TenantModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name=_('Conversa'),
    )
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='attachments',
        null=True,
        blank=True,
        verbose_name=_('Mensagem'),
    )
    file_name = models.CharField(max_length=255, verbose_name=_('Nome do arquivo'))
    file_size = models.IntegerField(null=True, blank=True, verbose_name=_('Tamanho (bytes)'))
    mime_type = models.CharField(max_length=100, blank=True, default='', verbose_name=_('Tipo MIME'))
    file_url = models.URLField(blank=True, default='', verbose_name=_('URL do arquivo'))
    file_path = models.CharField(max_length=500, blank=True, default='', verbose_name=_('Caminho do arquivo'))
    media_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.DOCUMENT,
        verbose_name=_('Tipo de mídia'),
    )
    width = models.IntegerField(null=True, blank=True, verbose_name=_('Largura'))
    height = models.IntegerField(null=True, blank=True, verbose_name=_('Altura'))
    duration = models.IntegerField(null=True, blank=True, verbose_name=_('Duração (s)'))
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_attachments',
        verbose_name=_('Enviado por'),
    )

    class Meta:
        verbose_name = _('Anexo')
        verbose_name_plural = _('Anexos')
        db_table = 'conversations_attachment'
        indexes = [
            models.Index(fields=['media_type']),
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f'{self.file_name} ({self.get_media_type_display()})'


class QuickResponse(TimeStampedModel, TenantModel):
    title = models.CharField(max_length=255, verbose_name=_('Título'))
    content = models.TextField(verbose_name=_('Conteúdo'))
    shortcut = models.CharField(max_length=50, verbose_name=_('Atalho'))
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quick_responses',
        verbose_name=_('Departamento'),
    )
    is_shared = models.BooleanField(default=False, verbose_name=_('Compartilhado'))
    category = models.CharField(max_length=100, blank=True, default='', verbose_name=_('Categoria'))

    class Meta:
        verbose_name = _('Resposta Rápida')
        verbose_name_plural = _('Respostas Rápidas')
        db_table = 'conversations_quick_response'
        ordering = ['title']
        indexes = [
            models.Index(fields=['shortcut']),
            models.Index(fields=['category']),
            models.Index(fields=['is_shared']),
        ]

    def __str__(self):
        return self.title
