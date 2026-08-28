from django.contrib import admin
from .models import Examination, InternalMark, SemesterResult, SemesterResultSubject


@admin.register(Examination)
class ExaminationAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'semester', 'teacher', 'exam_type', 'exam_date', 'maximum_marks', 'passing_marks', 'is_active', 'created_at']
    search_fields = ['title', 'subject__name', 'semester__name', 'teacher__name']
    list_filter = ['exam_type', 'subject', 'semester', 'teacher', 'is_active']
    ordering = ['-exam_date', 'subject', 'exam_type']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(InternalMark)
class InternalMarkAdmin(admin.ModelAdmin):
    list_display = ['student', 'examination', 'marks_obtained', 'created_at']
    search_fields = ['student__name', 'examination__title']
    list_filter = ['examination', 'examination__exam_type']
    ordering = ['examination', 'student']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(SemesterResult)
class SemesterResultAdmin(admin.ModelAdmin):
    list_display = ['student', 'semester', 'sgpa', 'cgpa', 'total_credits_earned', 'result_status', 'published_date', 'created_at']
    search_fields = ['student__name', 'semester__name']
    list_filter = ['result_status', 'semester', 'published_date']
    ordering = ['-published_date', 'student', 'semester']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(SemesterResultSubject)
class SemesterResultSubjectAdmin(admin.ModelAdmin):
    list_display = ['subject', 'semester_result', 'internal_marks', 'external_marks', 'total_marks', 'grade', 'grade_point', 'credits_earned', 'result', 'created_at']
    search_fields = ['subject__name', 'grade']
    list_filter = ['result', 'grade']
    ordering = ['semester_result', 'subject']
    readonly_fields = ['created_at', 'updated_at']
