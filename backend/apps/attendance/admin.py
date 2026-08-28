from django.contrib import admin
from .models import AttendanceSession, AttendanceRecord


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ['timetable', 'attendance_date', 'topic_covered', 'created_at']
    search_fields = ['timetable__course__name', 'topic_covered']
    list_filter = ['attendance_date', 'timetable']
    ordering = ['-attendance_date', 'timetable']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ['attendance_session', 'student', 'status', 'created_at']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'student__admission_number']
    list_filter = ['status', 'attendance_session']
    ordering = ['attendance_session', 'student']
    readonly_fields = ['created_at', 'updated_at']

