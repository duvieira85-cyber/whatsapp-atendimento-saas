from apps.observability.models import AuditLog


def log_audit(user, action, resource_type, resource_id='', details=None, ip_address=None, company=None):
    AuditLog.objects.create(
        user=user,
        company=company or (user.company if user and user.is_authenticated else None),
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else '',
        details=details or {},
        ip_address=ip_address,
    )
