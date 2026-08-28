from django.contrib import admin
from .models import Timetable


@admin.register(Timetable)
class TimetableAdmin(admin.ModelAdmin):
    list_display = ['day_of_week', 'period_number', 'subject', 'teacher', 'room_number', 'department', 'course', 'semester', 'start_time', 'end_time', 'is_active', 'created_at']
    search_fields = ['room_number', 'subject__name', 'teacher__name', 'day_of_week']
    list_filter = ['department', 'course', 'semester', 'subject', 'teacher', 'day_of_week', 'period_number', 'is_active']
    ordering = ['day_of_week', 'period_number', 'start_time']
    readonly_fields = ['created_at', 'updated_at']
