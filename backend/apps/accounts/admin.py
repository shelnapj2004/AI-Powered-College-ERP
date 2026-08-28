from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "username",
        "email",
        "role",
        "student_id",
        "employee_id",
        "department",
        "is_active",
        "is_verified",
        "date_joined",
    )
    list_filter = ("role", "is_active", "is_verified", "department")
    search_fields = ("username", "email", "first_name", "last_name", "student_id", "employee_id")
    ordering = ("-date_joined",)

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "College ERP Profile",
            {
                "fields": (
                    "role",
                    "phone",
                    "profile_picture",
                    "student_id",
                    "employee_id",
                    "department",
                    "is_verified",
                ),
            },
        ),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (
            "College ERP Profile",
            {
                "fields": ("role", "email", "phone", "student_id", "employee_id", "department"),
            },
        ),
    )
