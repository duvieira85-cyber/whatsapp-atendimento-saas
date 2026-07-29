import django_filters


class TenantFilterMixin:
    company_field = 'company'

    def filter_queryset(self, queryset):
        request = self.request
        if not request.user.is_authenticated:
            return queryset.none()
        if request.user.role == 'super_admin':
            return super().filter_queryset(queryset)
        if hasattr(request.user, 'company') and request.user.company:
            filter_kwargs = {self.company_field: request.user.company}
            queryset = queryset.filter(**filter_kwargs)
        else:
            return queryset.none()
        return super().filter_queryset(queryset)
