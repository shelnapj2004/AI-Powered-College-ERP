from django.contrib import admin
from .models import Course


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'department', 'duration_years', 'is_active', 'created_at']
    search_fields = ['name', 'code']
    list_filter = ['department', 'is_active']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['department']
