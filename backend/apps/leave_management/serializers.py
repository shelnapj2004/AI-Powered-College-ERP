from rest_framework import serializers
from .models import LeaveRequest


class LeaveRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True, default=None)
    student_admission_number = serializers.CharField(source='student.admission_number', read_only=True, default=None)
    teacher_name = serializers.CharField(source='teacher.user.get_full_name', read_only=True, default=None)
    staff_name = serializers.CharField(source='staff.user.get_full_name', read_only=True, default=None)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, default=None)

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'applicant_type', 'student', 'student_name', 'student_admission_number',
            'teacher', 'teacher_name', 'staff', 'staff_name',
            'start_date', 'end_date', 'reason', 'status',
            'approved_by', 'approved_by_name', 'approved_at', 'remarks', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'applicant_type', 'student', 'teacher', 'staff',
            'status', 'approved_by', 'approved_at', 'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({'end_date': 'End date cannot be before start date.'})
        return attrs
