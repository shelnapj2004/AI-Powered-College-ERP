from django.contrib import admin
from .models import Assignment, AssignmentSubmission


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'semester', 'teacher', 'assigned_date', 'due_date', 'maximum_marks', 'is_active', 'created_at']
    search_fields = ['title', 'description', 'subject__name', 'teacher__user__first_name', 'teacher__user__last_name']
    list_filter = ['subject', 'semester', 'teacher', 'is_active', 'assigned_date', 'due_date']
    ordering = ['-due_date', 'subject', 'title']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ['assignment', 'student', 'status', 'submitted_at', 'obtained_marks', 'created_at']
    search_fields = ['assignment__title', 'student__user__first_name', 'student__user__last_name', 'feedback']
    list_filter = ['status', 'submitted_at', 'assignment']
    ordering = ['assignment', 'student']
    readonly_fields = ['created_at', 'updated_at']
