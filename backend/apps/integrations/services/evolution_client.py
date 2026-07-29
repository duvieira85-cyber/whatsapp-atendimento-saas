import json
import logging
import requests
from typing import Optional
from urllib.parse import urljoin

logger = logging.getLogger(__name__)


class EvolutionAPIError(Exception):
    def __init__(self, message: str, status_code: int = 0, response_body: str = ''):
        self.status_code = status_code
        self.response_body = response_body
        super().__init__(message)


class EvolutionAPIClient:

    def __init__(self, base_url: str, api_key: str, instance_name: str, timeout: int = 30):
        self.base_url = base_url.rstrip('/') + '/'
        self.api_key = api_key
        self.instance_name = instance_name.replace('-', '')[:30]
        self.timeout = timeout
        self.headers = {
            'Content-Type': 'application/json',
            'apikey': api_key,
        }

    def _url(self, path: str) -> str:
        return urljoin(self.base_url, path.lstrip('/'))

    def _request(self, method: str, path: str, **kwargs) -> dict:
        url = self._url(path)
        kwargs.setdefault('headers', self.headers)
        kwargs.setdefault('timeout', self.timeout)
        try:
            resp = requests.request(method, url, **kwargs)
            if resp.status_code >= 400:
                raise EvolutionAPIError(
                    f'Evolution API error: {resp.status_code} {resp.reason}: {resp.text[:200]}',
                    status_code=resp.status_code,
                    response_body=resp.text,
                )
            if resp.status_code == 204 or not resp.text:
                return {'status': 'success'}
            return resp.json()
        except requests.RequestException as e:
            raise EvolutionAPIError(f'HTTP request failed: {str(e)}') from e

    def create_instance(self, webhook_url: str = '') -> dict:
        payload = {
            'instanceName': self.instance_name,
            'integration': 'WHATSAPP-BAILEYS',
            'token': self.api_key,
            'qrcode': True,
        }
        return self._request('POST', 'instance/create', json=payload)

    def set_webhook(self, webhook_url: str, webhook_by_events: bool = True) -> dict:
        payload = {
            'webhook': {
                'enabled': True,
                'url': webhook_url,
                'byEvents': webhook_by_events,
                'base64': False,
                'events': [
                    'APPLICATION_STARTUP',
                    'QRCODE_UPDATED',
                    'MESSAGES_UPSERT',
                    'MESSAGES_EDITED',
                    'CONNECTION_UPDATE',
                ],
            },
        }
        return self._request('POST', f'webhook/set/{self.instance_name}', json=payload)

    def get_qr_code(self) -> Optional[str]:
        data = self._request('GET', f'instance/connect/{self.instance_name}')
        if isinstance(data, dict) and data.get('base64'):
            return data['base64']
        return None

    def send_text(self, phone: str, text: str) -> dict:
        payload = {
            'number': phone,
            'text': text,
        }
        return self._request('POST', f'message/sendText/{self.instance_name}', json=payload)

    def disconnect(self) -> dict:
        return self._request('DELETE', f'instance/logout/{self.instance_name}')

    def delete_instance(self) -> dict:
        return self._request('DELETE', f'instance/delete/{self.instance_name}')

    def connection_state(self) -> dict:
        return self._request('GET', f'instance/connectionState/{self.instance_name}')

    def is_connected(self) -> bool:
        try:
            data = self.connection_state()
            state = data.get('instance', {}).get('state', '') if isinstance(data, dict) else ''
            return state == 'open'
        except EvolutionAPIError:
            return False
