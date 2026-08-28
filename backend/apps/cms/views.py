from rest_framework import viewsets
from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.adminpanel.mixins import AuditLogMixin
from apps.cms.models import ContentPage
from apps.cms.serializers import ContentPageSerializer
from apps.core.permissions import IsAdmin


class PublicReadOnly(BasePermission):
    """Allow safe methods (GET/HEAD/OPTIONS) for anyone, including
    unauthenticated public-website visitors. Queryset-level filtering (see
    get_queryset below) is what actually keeps unpublished pages hidden
    from non-admins -- this permission only controls the HTTP verb."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS


class ContentPageViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """Admin-managed website content (Priority 7 Phase B: the public
    website now consumes this same API/model to render CMS-backed pages
    -- no second CMS, no duplicate model). Only Admin can write. Anyone,
    including anonymous public visitors, may read -- but non-admin/
    anonymous requests only ever see is_published=True rows (see
    get_queryset), so drafts are never exposed publicly.
    """

    queryset = ContentPage.objects.all()
    serializer_class = ContentPageSerializer
    permission_classes = [IsAdmin | PublicReadOnly]
    audit_resource = "ContentPage"
    lookup_field = "id"

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        is_admin = bool(user and user.is_authenticated and (user.is_superuser or getattr(user, "role", None) == "admin"))
        if not is_admin:
            qs = qs.filter(is_published=True)

        page_type = self.request.query_params.get("page_type")
        if page_type:
            qs = qs.filter(page_type=page_type)
        slug = self.request.query_params.get("slug")
        if slug:
            qs = qs.filter(slug=slug)
        is_published = self.request.query_params.get("is_published")
        if is_published is not None and is_admin:
            qs = qs.filter(is_published=is_published.lower() in ("1", "true", "yes"))
        return qs
