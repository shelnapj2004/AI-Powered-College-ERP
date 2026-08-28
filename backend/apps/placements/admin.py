from django.contrib import admin
from .models import PlacementDrive, PlacementApplication


@admin.register(PlacementDrive)
class PlacementDriveAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'job_title', 'employment_type', 'package_lpa', 'location', 'drive_date', 'application_deadline', 'is_active', 'created_at']
    search_fields = ['company_name', 'job_title', 'location']
    list_filter = ['employment_type', 'is_active', 'drive_date', 'application_deadline']
    ordering = ['-drive_date', 'company_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PlacementApplication)
class PlacementApplicationAdmin(admin.ModelAdmin):
    list_display = ['placement_drive', 'student', 'status', 'applied_at', 'created_at']
    search_fields = ['student__admission_number', 'student__roll_number', 'student__user__first_name', 'student__user__last_name', 'placement_drive__company_name']
    list_filter = ['status', 'applied_at', 'placement_drive']
    ordering = ['-applied_at']
    readonly_fields = ['applied_at', 'created_at', 'updated_at']
    autocomplete_fields = ['placement_drive', 'student']
