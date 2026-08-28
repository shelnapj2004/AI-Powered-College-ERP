"""
AuditLogMixin — opt-in mixin that writes an AuditLog row on
perform_create/perform_update/perform_destroy. Add it first in the MRO of
any admin-managed ModelViewSet, e.g.:

    class StaffViewSet(AuditLogMixin, viewsets.ModelViewSet):
        audit_resource = "Staff"
        ...

Never raises — a logging failure must not break the underlying request.
"""
from apps.adminpanel.models import AuditLog


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AuditLogMixin:
    audit_resource: str = ""

    def _write_audit(self, action, instance, description=""):
        try:
            request = self.request
            user = getattr(request, "user", None)
            user = user if user and user.is_authenticated else None
            AuditLog.objects.create(
                user=user,
                user_display=f"{user.username} ({user.role})" if user else "system",
                action=action,
                resource=self.audit_resource or self.__class__.__name__,
                resource_id=str(getattr(instance, "pk", "")),
                description=description,
                ip_address=_client_ip(request),
            )
        except Exception:
            pass

    def perform_create(self, serializer):
        instance = serializer.save()
        self._write_audit(AuditLog.Action.CREATE, instance)
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        self._write_audit(AuditLog.Action.UPDATE, instance)
        return instance

    def perform_destroy(self, instance):
        pk = instance.pk
        self._write_audit(AuditLog.Action.DELETE, instance)
        instance.delete()
