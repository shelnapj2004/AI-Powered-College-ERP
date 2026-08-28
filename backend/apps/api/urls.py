"""
API version router.

All REST endpoints are namespaced under /api/v1/.
Future versions (v2, v3) can be added here without breaking clients.
"""
from django.urls import include, path

app_name = "api"

urlpatterns = [
    path("v1/", include("apps.api.v1.urls", namespace="v1")),
]
