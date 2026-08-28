from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.adminpanel.views import AdminAnalyticsView, AdminUserViewSet, AuditLogViewSet, RolesView

router = DefaultRouter()
router.register(r"admin/users", AdminUserViewSet, basename="admin-user")
router.register(r"admin/audit-logs", AuditLogViewSet, basename="admin-audit-log")

urlpatterns = [
    path("admin/analytics/", AdminAnalyticsView.as_view(), name="admin-analytics"),
    path("admin/roles/", RolesView.as_view(), name="admin-roles"),
    path("", include(router.urls)),
]
