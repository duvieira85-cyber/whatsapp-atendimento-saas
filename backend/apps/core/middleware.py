from threading import local

_thread_locals = local()


def get_current_company():
    return getattr(_thread_locals, 'company', None)


def get_current_user():
    return getattr(_thread_locals, 'user', None)


def get_resolved_company():
    company = get_current_company()
    if company is not None:
        return company
    from apps.companies.models import Company
    company = Company.objects.first()
    if company is not None:
        _thread_locals.company = company
        return company
    return None


class CurrentCompanyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = getattr(request, 'user', None)
        company = None
        if request.user and request.user.is_authenticated:
            company = getattr(request.user, 'company', None)
        _thread_locals.company = company
        response = self.get_response(request)
        return response
