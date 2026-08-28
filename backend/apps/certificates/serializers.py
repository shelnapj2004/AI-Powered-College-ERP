from rest_framework import serializers

from .models import Certificate


class CertificateSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True, default=None)
    admission_number = serializers.CharField(source='student.admission_number', read_only=True, default=None)
    certificate_type_display = serializers.CharField(source='get_certificate_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    issued_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            'id', 'certificate_number', 'student', 'student_name', 'admission_number',
            'certificate_type', 'certificate_type_display', 'status', 'status_display',
            'issued_by', 'issued_by_name', 'issued_date', 'requested_at', 'updated_at',
        ]
        # certificate_number, status, issued_by, issued_date are all
        # server-derived — never trusted from the frontend (Priority 11
        # requirement). `status` starts at 'ready' on create and only moves
        # to 'issued' via the dedicated print-issue action.
        read_only_fields = [
            'id', 'certificate_number', 'status', 'issued_by', 'issued_date',
            'requested_at', 'updated_at',
        ]

    def get_issued_by_name(self, obj):
        if obj.issued_by and obj.issued_by.user:
            return obj.issued_by.user.get_full_name()
        return None
