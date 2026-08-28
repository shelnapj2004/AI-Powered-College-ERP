from rest_framework import serializers

from .models import StudentDocument


class StudentDocumentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True, default=None)
    admission_number = serializers.CharField(source='student.admission_number', read_only=True, default=None)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True, default=None)

    # `student` is not required from the request body: when the
    # authenticated user is a Student, the view derives it server-side
    # (perform_create) so it can never be spoofed. Staff/Admin uploading on
    # behalf of a student must still supply it -- enforced in the view,
    # since it's a valid field for their role.
    student = serializers.PrimaryKeyRelatedField(
        queryset=StudentDocument._meta.get_field('student').related_model.objects.all(),
        required=False,
    )

    class Meta:
        model = StudentDocument
        fields = [
            'id', 'student', 'student_name', 'admission_number', 'document_type', 'file',
            'status', 'verified_by', 'verified_by_name', 'requested_at', 'updated_at',
        ]
        read_only_fields = ['id', 'verified_by', 'requested_at', 'updated_at']
