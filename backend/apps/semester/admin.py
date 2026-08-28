from django.contrib import admin
from .models import Semester


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ['name', 'course', 'academic_year', 'semester_number', 'start_date', 'end_date', 'is_active', 'created_at']
    search_fields = ['name', 'course__name', 'academic_year__name']
    list_filter = ['academic_year', 'course', 'semester_number', 'is_active']
    ordering = ['academic_year', 'course', 'semester_number']
    readonly_fields = ['created_at', 'updated_at']
