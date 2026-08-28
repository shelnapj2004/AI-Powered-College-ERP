from django.contrib import admin

from .models import Certificate


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('certificate_number', 'student', 'certificate_type', 'status', 'issued_by', 'issued_date', 'requested_at')
    list_filter = ('status', 'certificate_type')
    search_fields = ('certificate_number', 'student__admission_number', 'student__user__first_name', 'student__user__last_name')
