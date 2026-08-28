from django.contrib import admin
from .models import AcademicYear


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'is_current', 'is_active', 'created_at']
    search_fields = ['name']
    list_filter = ['is_current', 'is_active']
    ordering = ['-start_date']
    readonly_fields = ['created_at', 'updated_at']
