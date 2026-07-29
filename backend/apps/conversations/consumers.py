import json
import logging
import time
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

User = get_user_model()


class RateLimiter:
    def __init__(self, max_calls=10, period=1.0):
        self.max_calls = max_calls
        self.period = period
        self.calls = []

    def allow(self):
        now = time.time()
        self.calls = [c for c in self.calls if now - c < self.period]
        if len(self.calls) >= self.max_calls:
            return False
        self.calls.append(now)
        return True


class JwtAuthMixin:
    async def authenticate(self):
        query_string = self.scope.get('query_string', b'').decode()
        params = {}
        for p in query_string.split('&'):
            if '=' in p:
                k, v = p.split('=', 1)
                params[k] = v
        token = params.get('token')
        if not token:
            await self.close(code=4001)
            return False
        try:
            access = AccessToken(token)
            user = await database_sync_to_async(User.objects.get)(id=access['user_id'])
            if not user.is_active:
                await self.close(code=4001)
                return False
            self.scope['user'] = user
            company = await database_sync_to_async(lambda: user.company)()
            self.scope['company'] = company
            self.scope['company_id'] = str(user.company_id) if user.company_id else ''
            return True
        except (TokenError, User.DoesNotExist, KeyError):
            await self.close(code=4001)
            return False


class CompanyConsumer(JwtAuthMixin, AsyncWebsocketConsumer):
    async def connect(self):
        if not await self.authenticate():
            return
        user = self.scope['user']
        company_id = self.scope['company_id']

        logger.warning('COMPANY_CONSUMER_CONNECT: user=%s role=%s company_id=%s',
                        user.email if hasattr(user, 'email') else str(user.id),
                        user.role, company_id)

        if not company_id and user.role != 'super_admin':
            logger.warning('COMPANY_CONSUMER_CLOSE: no company_id and not super_admin')
            await self.close(code=4003)
            return

        if user.role == 'super_admin':
            self.groups_list = ['company.global']
        else:
            self.groups_list = [f'company.{company_id}']

        logger.warning('COMPANY_CONSUMER_GROUPS: groups=%s', self.groups_list)

        for group in self.groups_list:
            await self.channel_layer.group_add(group, self.channel_name)
            logger.warning('COMPANY_CONSUMER_GROUP_ADDED: group=%s', group)

        await self.accept()
        logger.warning('COMPANY_CONSUMER_ACCEPTED')
        self.rate_limiter = RateLimiter(max_calls=30, period=1.0)

    async def disconnect(self, close_code):
        logger.warning('COMPANY_CONSUMER_DISCONNECT: code=%s', close_code)
        if hasattr(self, 'groups_list'):
            for group in self.groups_list:
                await self.channel_layer.group_discard(group, self.channel_name)

    async def receive(self, text_data):
        if not getattr(self, 'rate_limiter', None) or not self.rate_limiter.allow():
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong', 'timestamp': time.time()}))

    async def event_notify(self, event):
        logger.warning('COMPANY_CONSUMER_EVENT_NOTIFY: event_type=%s data_keys=%s',
                        event.get('data', {}).get('event_type', '?'),
                        list(event.get('data', {}).keys()))
        await self.send(text_data=json.dumps(event['data']))
        logger.warning('COMPANY_CONSUMER_EVENT_SENT')


class ConversationConsumer(JwtAuthMixin, AsyncWebsocketConsumer):
    async def connect(self):
        if not await self.authenticate():
            return
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'conversation.{self.conversation_id}'
        self.company_group = None

        from apps.conversations.models import Conversation
        conversation = await database_sync_to_async(
            lambda: Conversation.objects.filter(
                id=self.conversation_id
            ).select_related('company').first()
        )()

        if not conversation:
            await self.close(code=4004)
            return

        user = self.scope['user']
        if user.role != 'super_admin' and (
            not user.company or user.company_id != conversation.company_id
        ):
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        self.rate_limiter = RateLimiter(max_calls=30, period=1.0)

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        if not getattr(self, 'rate_limiter', None) or not self.rate_limiter.allow():
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong', 'timestamp': time.time()}))

    async def event_notify(self, event):
        await self.send(text_data=json.dumps(event['data']))


class QueueConsumer(JwtAuthMixin, AsyncWebsocketConsumer):
    async def connect(self):
        if not await self.authenticate():
            return
        user = self.scope['user']
        company_id = self.scope['company_id']

        if user.role == 'super_admin':
            self.groups_list = ['queue.global', 'company.global']
        elif company_id:
            self.groups_list = [f'queue.{company_id}', f'company.{company_id}']
        else:
            await self.close(code=4003)
            return

        for group in self.groups_list:
            await self.channel_layer.group_add(group, self.channel_name)

        await self.accept()
        self.rate_limiter = RateLimiter(max_calls=10, period=1.0)

    async def disconnect(self, close_code):
        if hasattr(self, 'groups_list'):
            for group in self.groups_list:
                await self.channel_layer.group_discard(group, self.channel_name)

    async def receive(self, text_data):
        if not getattr(self, 'rate_limiter', None) or not self.rate_limiter.allow():
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))

    async def event_notify(self, event):
        await self.send(text_data=json.dumps(event['data']))


class UserConsumer(JwtAuthMixin, AsyncWebsocketConsumer):
    async def connect(self):
        if not await self.authenticate():
            return
        user = self.scope['user']
        self.user_group = f'user.{user.id}'

        await self.channel_layer.group_add(self.user_group, self.channel_name)

        if user.company_id:
            await self.channel_layer.group_add(f'company.{user.company_id}', self.channel_name)

        await self.accept()
        self.rate_limiter = RateLimiter(max_calls=30, period=1.0)

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive(self, text_data):
        if not getattr(self, 'rate_limiter', None) or not self.rate_limiter.allow():
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))
        if data.get('type') == 'presence:away':
            from apps.presence.services.presence_service import PresenceService
            await database_sync_to_async(PresenceService().set_away)(user=self.scope['user'])
        if data.get('type') == 'presence:busy':
            from apps.presence.services.presence_service import PresenceService
            await database_sync_to_async(PresenceService().set_busy)(user=self.scope['user'])

    async def event_notify(self, event):
        await self.send(text_data=json.dumps(event['data']))
