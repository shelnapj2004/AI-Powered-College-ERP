from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import User, UserRole
from apps.adminpanel.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "user_display",
            "action",
            "resource",
            "resource_id",
            "description",
            "ip_address",
            "created_at",
        ]
        read_only_fields = fields


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin-facing user list/detail. Never exposes password/tokens."""

    role_display = serializers.CharField(source="get_role_display", read_only=True)
    display_id = serializers.CharField(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "role_display",
            "display_id",
            "phone",
            "employee_id",
            "student_id",
            "department",
            "is_active",
            "is_verified",
            "date_joined",
            "last_login",
        ]
        read_only_fields = [
            "id", "username", "role_display", "display_id",
            "employee_id", "student_id", "date_joined", "last_login",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Restricted write surface for PATCH /admin/users/{id}/.

    Deliberately excludes `role`, `is_superuser`, `is_staff`, `password` —
    those are changed only through dedicated, audited actions
    (change_role / set-password) so a generic PATCH can't be used to
    silently escalate privilege.
    """

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "phone", "department", "is_verified"]


class ChangeRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=UserRole.choices)


class SetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        validate_password(value)
        return value
