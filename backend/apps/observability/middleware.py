import json
import logging
import time

logger = logging.getLogger('requests')


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()

        if request.method in ('POST', 'PUT', 'PATCH') and request.path.startswith('/api/'):
            try:
                request._cached_body = request.body
            except Exception:
                request._cached_body = None
        else:
            request._cached_body = None

        response = self.get_response(request)
        duration = time.time() - start

        log_data = {
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration_ms': round(duration * 1000, 2),
            'user': str(request.user) if request.user.is_authenticated else 'anonymous',
        }

        if request._cached_body:
            try:
                body = json.loads(request._cached_body) if request._cached_body else {}
                if isinstance(body, dict) and 'password' in body:
                    body['password'] = '***'
                log_data['body'] = body
            except (json.JSONDecodeError, ValueError, TypeError):
                pass

        if response.status_code >= 500:
            logger.error(json.dumps(log_data))
        elif response.status_code >= 400:
            logger.warning(json.dumps(log_data))
        else:
            logger.info(json.dumps(log_data))

        return response
