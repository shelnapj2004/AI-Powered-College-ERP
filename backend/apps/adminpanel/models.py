import uuid

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Immutable record of admin-sensitive actions across the ERP.

    Written by AuditLogMixin (apps.adminpanel.mixins) on create/update/delete
    of any ModelViewSet that opts in, and by explicit calls from auth views
    (login/logout) and admin panel actions (activate/deactivate/role change/
    password reset). Read-only via the API — no update/delete endpoint.
    """

    class Action(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        ACTIVATE = "activate", "Activate"
        DEACTIVATE = "deactivate", "Deactivate"
        PASSWORD_RESET = "password_reset", "Password Reset"
        ROLE_CHANGE = "role_change", "Role Change"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        help_text="User who performed the action (null if system/anonymous).",
    )
    user_display = models.CharField(
        max_length=255,
        blank=True,
        help_text="Snapshot of username/role at write time, kept even if the user is later deleted.",
    )
    action = models.CharField(max_length=20, choices=Action.choices, db_index=True)
    resource = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Resource/model name affected, e.g. 'Student', 'FeePayment'.",
    )
    resource_id = models.CharField(max_length=64, blank=True)
    description = models.CharField(max_length=500, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["resource", "action"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.user_display or 'system'} {self.action} {self.resource} @ {self.created_at:%Y-%m-%d %H:%M}"
