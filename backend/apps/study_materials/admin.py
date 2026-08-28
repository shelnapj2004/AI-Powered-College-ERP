from django.contrib import admin
from .models import StudyMaterial


@admin.register(StudyMaterial)
class StudyMaterialAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'semester', 'teacher', 'material_type', 'uploaded_at', 'is_active', 'created_at']
    search_fields = ['title', 'description', 'subject__name', 'subject__code', 'semester__name', 'teacher__user__first_name', 'teacher__user__last_name']
    list_filter = ['material_type', 'is_active', 'subject', 'semester', 'teacher']
    ordering = ['-uploaded_at', 'subject', 'title']
    readonly_fields = ['created_at', 'updated_at']
