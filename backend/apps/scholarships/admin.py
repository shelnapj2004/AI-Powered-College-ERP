from django.contrib import admin
from .models import Scholarship, ScholarshipApplication


@admin.register(Scholarship)
class ScholarshipAdmin(admin.ModelAdmin):
    list_display = ['name', 'scholarship_type', 'provider', 'amount', 'application_deadline', 'is_active', 'created_at']
    search_fields = ['name', 'provider', 'description']
    list_filter = ['scholarship_type', 'is_active']
    ordering = ['-application_deadline', 'name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ScholarshipApplication)
class ScholarshipApplicationAdmin(admin.ModelAdmin):
    list_display = ['scholarship', 'student', 'status', 'applied_at', 'created_at']
    search_fields = ['scholarship__name', 'student__user__first_name', 'student__user__last_name']
    list_filter = ['status', 'scholarship', 'applied_at']
    ordering = ['-applied_at']
    readonly_fields = ['applied_at', 'created_at', 'updated_at']
