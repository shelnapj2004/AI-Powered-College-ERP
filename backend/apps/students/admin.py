from django.contrib import admin
from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['admission_number', 'roll_number', 'user', 'department', 'course', 'semester', 'is_active', 'created_at']
    search_fields = ['admission_number', 'roll_number', 'user__first_name', 'user__last_name', 'user__email']
    list_filter = ['department', 'course', 'semester', 'gender', 'is_active']
    ordering = ['admission_number']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['user', 'department', 'course', 'semester']
