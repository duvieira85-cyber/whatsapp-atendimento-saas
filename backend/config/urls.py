from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/companies/', include('apps.companies.urls')),
    path('api/departments/', include('apps.departments.urls')),
    path('api/clients/', include('apps.clients.urls')),
    path('api/conversations/', include('apps.conversations.urls')),
    path('api/bot/', include('apps.bot.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/integrations/', include('apps.integrations.urls')),
    path('api/observability/', include('apps.observability.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
