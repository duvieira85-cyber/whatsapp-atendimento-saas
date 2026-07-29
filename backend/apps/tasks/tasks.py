from celery import shared_task


@shared_task
def process_webhook(integration_id, payload):
    from apps.integrations.models import Integration
    try:
        integration = Integration.objects.get(id=integration_id)
    except Integration.DoesNotExist:
        return {'error': 'Integration not found'}
    return {'status': 'processed', 'integration': integration.name}
