from django.contrib import admin
from .models import Question


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['question_text', 'subject', 'teacher', 'question_type', 'marks', 'created_at']
    search_fields = ['question_text', 'topic', 'subject__name', 'subject__code', 'teacher__user__first_name', 'teacher__user__last_name']
    list_filter = ['question_type', 'subject', 'teacher']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
