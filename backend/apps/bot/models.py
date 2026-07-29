from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel, TenantModel


class BotConfig(TimeStampedModel, TenantModel):
    is_active = models.BooleanField(default=False, verbose_name=_('Ativo'))
    welcome_message = models.TextField(
        default='Olá! Bem-vindo(a)! Escolha um setor para atendimento:',
        verbose_name=_('Mensagem de boas-vindas'),
    )
    menu_message = models.TextField(
        default='Digite o número do setor desejado:',
        verbose_name=_('Mensagem do menu'),
    )
    fallback_message = models.TextField(
        default='Opção inválida. Por favor, escolha uma opção válida.',
        verbose_name=_('Mensagem de fallback'),
    )
    business_hours_enabled = models.BooleanField(default=False, verbose_name=_('Horário comercial ativo'))
    business_hours = models.JSONField(default=dict, blank=True, verbose_name=_('Horários comerciais'))
    outside_hours_message = models.TextField(
        default='No momento estamos fora do horário de atendimento. Deixe sua mensagem que retornaremos em breve.',
        verbose_name=_('Mensagem fora do horário'),
    )
    max_attempts = models.IntegerField(default=3, verbose_name=_('Tentativas máximas'))
    use_ai = models.BooleanField(default=False, verbose_name=_('Usar IA'))
    ai_prompt = models.TextField(blank=True, default='', verbose_name=_('Prompt da IA'))

    class Meta:
        verbose_name = _('Configuração do Bot')
        verbose_name_plural = _('Configurações do Bot')
        db_table = 'bot_config'
        indexes = [
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f'Bot - {self.company.name}'


class BotMenuOption(TimeStampedModel, TenantModel):
    bot_config = models.ForeignKey(
        BotConfig,
        on_delete=models.CASCADE,
        related_name='menu_options',
        verbose_name=_('Configuração do Bot'),
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.CASCADE,
        related_name='bot_options',
        verbose_name=_('Departamento'),
    )
    option_key = models.CharField(max_length=10, verbose_name=_('Tecla'))
    label = models.CharField(max_length=255, verbose_name=_('Rótulo'))
    order = models.IntegerField(default=0, verbose_name=_('Ordem'))

    class Meta:
        verbose_name = _('Opção do Menu')
        verbose_name_plural = _('Opções do Menu')
        db_table = 'bot_menu_option'
        ordering = ['order']
        unique_together = ['bot_config', 'option_key']

    def __str__(self):
        return f'{self.option_key} - {self.label}'
