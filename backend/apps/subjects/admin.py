from django.contrib import admin
from .models import Subject


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'course', 'semester', 'subject_type', 'credits', 'is_active', 'created_at']
    search_fields = ['code', 'name', 'course__name', 'semester__name']
    list_filter = ['subject_type', 'is_active', 'course', 'semester']
    ordering = ['course', 'code']
    readonly_fields = ['created_at', 'updated_at']
