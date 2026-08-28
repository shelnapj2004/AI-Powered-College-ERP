from django.contrib import admin
from .models import Admission


@admin.register(Admission)
class AdmissionAdmin(admin.ModelAdmin):
    list_display = ['application_number', 'first_name', 'last_name', 'department', 'course', 'admission_status', 'account_created_display', 'created_at']
    search_fields = ['application_number', 'first_name', 'last_name', 'email', 'phone']
    list_filter = ['department', 'course', 'academic_year', 'admission_type', 'admission_status']
    ordering = ['application_number']
    readonly_fields = ['created_at', 'updated_at', 'student']
    autocomplete_fields = ['department', 'course', 'academic_year']

    @admin.display(description='Account Created', boolean=True)
    def account_created_display(self, obj):
        return obj.account_created
