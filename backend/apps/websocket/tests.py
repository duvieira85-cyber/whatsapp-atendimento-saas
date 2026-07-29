import asyncio
import json
from django.test import TransactionTestCase
from channels.testing import WebsocketCommunicator
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async, async_to_sync

from apps.conversations.consumers import CompanyConsumer, QueueConsumer, UserConsumer, ConversationConsumer
from apps.conversations.models import Conversation
from apps.clients.models import Client
from apps.accounts.models import User
from apps.companies.models import Company
from apps.core.domain_events import MessageReceived
from rest_framework_simplejwt.tokens import AccessToken


class WebSocketSuiteTest(TransactionTestCase):

    def setUp(self):
        self.company = Company.objects.create(name='WSSuite', slug='ws-suite')
        self.user = User.objects.create_user(
            username='suiteagent', email='suite@test.com', password='123',
            company=self.company, role='attendant',
        )
        self.admin = User.objects.create_superuser(
            username='suiteadmin', email='suiteadm@test.com', password='123',
            role='super_admin',
        )
        self.token = str(AccessToken.for_user(self.user))
        self.admin_token = str(AccessToken.for_user(self.admin))
        self.client_obj = Client.objects.create(
            company=self.company, name='Cliente Suite', phone='5511999999999',
        )
        self.conversation = Conversation.objects.create(
            company=self.company, client=self.client_obj,
        )
        self.conv_id = str(self.conversation.id)

    # --- JWT Auth Tests ---

    async def _test_jwt_company(self):
        comm = WebsocketCommunicator(
            CompanyConsumer.as_asgi(),
            f'/ws/company/?token={self.token}',
        )
        ok, _ = await comm.connect()
        self.assertTrue(ok)
        await comm.disconnect()

    async def _test_jwt_no_token(self):
        comm = WebsocketCommunicator(CompanyConsumer.as_asgi(), '/ws/company/')
        ok, _ = await comm.connect()
        self.assertFalse(ok)
        await comm.disconnect()

    async def _test_jwt_invalid(self):
        comm = WebsocketCommunicator(
            CompanyConsumer.as_asgi(), '/ws/company/?token=bad',
        )
        ok, _ = await comm.connect()
        self.assertFalse(ok)
        await comm.disconnect()

    async def _test_super_admin(self):
        comm = WebsocketCommunicator(
            CompanyConsumer.as_asgi(),
            f'/ws/company/?token={self.admin_token}',
        )
        ok, _ = await comm.connect()
        self.assertTrue(ok)
        await comm.disconnect()

    # --- Consumer Types ---

    async def _test_queue_consumer(self):
        comm = WebsocketCommunicator(
            QueueConsumer.as_asgi(),
            f'/ws/queue/?token={self.token}',
        )
        ok, _ = await comm.connect()
        self.assertTrue(ok)
        await comm.disconnect()

    async def _test_user_consumer(self):
        comm = WebsocketCommunicator(
            UserConsumer.as_asgi(),
            f'/ws/user/?token={self.token}',
        )
        ok, _ = await comm.connect()
        self.assertTrue(ok)
        await comm.disconnect()

    # --- Conversation Consumer via manual scope ---

    async def _test_conversation_consumer(self):
        comm = WebsocketCommunicator(
            ConversationConsumer.as_asgi(),
            f'/ws/conversations/{self.conv_id}/?token={self.token}',
        )
        comm.scope['url_route'] = {
            'kwargs': {'conversation_id': self.conv_id},
        }
        ok, _ = await comm.connect()
        self.assertTrue(ok)
        await comm.disconnect()

    async def _test_conversation_not_found(self):
        fake_id = '00000000-0000-0000-0000-000000000000'
        comm = WebsocketCommunicator(
            ConversationConsumer.as_asgi(),
            f'/ws/conversations/{fake_id}/?token={self.token}',
        )
        comm.scope['url_route'] = {
            'kwargs': {'conversation_id': fake_id},
        }
        ok, _ = await comm.connect()
        self.assertFalse(ok)
        await comm.disconnect()

    async def _test_conversation_no_permission(self):
        other = await sync_to_async(Company.objects.create)(name='OtherSuite', slug='other-suite')
        other_user = await sync_to_async(User.objects.create_user)(
            username='othersuite', email='othersuite@test.com', password='123',
            company=other, role='attendant',
        )
        other_token = str(AccessToken.for_user(other_user))
        comm = WebsocketCommunicator(
            ConversationConsumer.as_asgi(),
            f'/ws/conversations/{self.conv_id}/?token={other_token}',
        )
        comm.scope['url_route'] = {
            'kwargs': {'conversation_id': self.conv_id},
        }
        ok, _ = await comm.connect()
        self.assertFalse(ok)
        await comm.disconnect()
        await sync_to_async(other_user.delete)()
        await sync_to_async(other.delete)()

    async def _test_conversation_event(self):
        comm = WebsocketCommunicator(
            ConversationConsumer.as_asgi(),
            f'/ws/conversations/{self.conv_id}/?token={self.token}',
        )
        comm.scope['url_route'] = {
            'kwargs': {'conversation_id': self.conv_id},
        }
        await comm.connect()
        ch = await sync_to_async(get_channel_layer)()
        await ch.group_send(
            f'conversation.{self.conv_id}',
            {
                'type': 'event.notify',
                'data': {
                    'event_type': 'message.received',
                    'conversation_id': self.conv_id,
                    'company_id': str(self.company.id),
                    'metadata': {'content': 'test'},
                },
            },
        )
        resp = await asyncio.wait_for(comm.receive_from(), timeout=2.0)
        data = json.loads(resp) if isinstance(resp, (bytes, str)) else resp
        self.assertEqual(data.get('event_type'), 'message.received')
        await comm.disconnect()

    # --- Ping/Pong ---

    async def _test_ping_pong(self):
        comm = WebsocketCommunicator(
            CompanyConsumer.as_asgi(),
            f'/ws/company/?token={self.token}',
        )
        await comm.connect()
        await comm.send_json_to({'type': 'ping'})
        resp = await asyncio.wait_for(comm.receive_from(), timeout=3.0)
        data = json.loads(resp) if isinstance(resp, (bytes, str)) else resp
        self.assertEqual(data.get('type'), 'pong')
        await comm.disconnect()

    # --- Group Isolation ---

    async def _test_group_isolation(self):
        other_company = await sync_to_async(Company.objects.create)(
            name='IsoSuite', slug='iso-suite',
        )
        other_user = await sync_to_async(User.objects.create_user)(
            username='isosuite', email='isosuite@test.com', password='123',
            company=other_company, role='attendant',
        )
        other_token = str(AccessToken.for_user(other_user))

        c1 = WebsocketCommunicator(
            CompanyConsumer.as_asgi(),
            f'/ws/company/?token={self.token}',
        )
        c2 = WebsocketCommunicator(
            CompanyConsumer.as_asgi(),
            f'/ws/company/?token={other_token}',
        )
        await c1.connect()
        await c2.connect()

        ch = await sync_to_async(get_channel_layer)()
        await ch.group_send(
            f'company.{self.company.id}',
            {'type': 'event.notify', 'data': {'event_type': 'test.iso'}},
        )

        c1_got = False
        try:
            await asyncio.wait_for(c1.receive_from(), timeout=1.0)
            c1_got = True
        except asyncio.TimeoutError:
            pass

        c2_got = False
        try:
            await asyncio.wait_for(c2.receive_from(), timeout=0.5)
            c2_got = True
        except asyncio.TimeoutError:
            pass

        self.assertTrue(c1_got)
        self.assertFalse(c2_got)
        await c1.disconnect()
        await c2.disconnect()
        await sync_to_async(other_user.delete)()
        await sync_to_async(other_company.delete)()

    # --- Runner ---

    def test_all(self):
        tests = [
            self._test_jwt_company,
            self._test_jwt_no_token,
            self._test_jwt_invalid,
            self._test_super_admin,
            self._test_queue_consumer,
            self._test_user_consumer,
            self._test_conversation_consumer,
            self._test_conversation_not_found,
            self._test_conversation_no_permission,
            self._test_conversation_event,
            self._test_ping_pong,
            self._test_group_isolation,
        ]
        for t in tests:
            asyncio.run(t())
