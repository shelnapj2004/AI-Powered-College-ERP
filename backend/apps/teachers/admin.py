from django.contrib import admin
from .models import Teacher


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ['employee_id', 'user', 'department', 'designation', 'is_active', 'created_at']
    search_fields = ['employee_id', 'user__first_name', 'user__last_name', 'user__email', 'designation']
    list_filter = ['department', 'designation', 'is_active']
    ordering = ['employee_id']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['user', 'department']

