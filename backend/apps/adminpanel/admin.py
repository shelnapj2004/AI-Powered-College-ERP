from django.contrib import admin

from apps.adminpanel.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user_display", "action", "resource", "resource_id")
    list_filter = ("action", "resource")
    search_fields = ("user_display", "resource", "resource_id", "description")
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
