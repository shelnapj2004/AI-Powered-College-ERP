from django.contrib import admin
from .models import StudentDocument


@admin.register(StudentDocument)
class StudentDocumentAdmin(admin.ModelAdmin):
    list_display = ['document_type', 'student', 'status', 'verified_by', 'requested_at']
    search_fields = ['document_type', 'student__user__first_name', 'student__user__last_name', 'student__admission_number']
    list_filter = ['status', 'document_type']
    ordering = ['-requested_at']
    readonly_fields = ['requested_at', 'updated_at']
    autocomplete_fields = ['student', 'verified_by']
