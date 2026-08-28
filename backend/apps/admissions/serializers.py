from rest_framework import serializers

from apps.academic_year.serializers import AcademicYearSerializer
from apps.courses.serializers import CourseSerializer
from apps.departments.serializers import DepartmentSerializer

from .models import Admission


class AdmissionSerializer(serializers.ModelSerializer):
    """
    Registration/application record.

    Created by Admin (Student Registration Form). Read/updated by Staff
    during Student Management processing. `student` and `account_created`
    are read-only here -- an account can only be created through the
    Students API's `create_account` action, which links the two records
    atomically.
    """

    department_detail = DepartmentSerializer(source='department', read_only=True)
    course_detail = CourseSerializer(source='course', read_only=True)
    academic_year_detail = AcademicYearSerializer(source='academic_year', read_only=True)
    full_name = serializers.CharField(read_only=True)
    account_created = serializers.BooleanField(read_only=True)
    student = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Admission
        fields = [
            'id', 'application_number',
            'first_name', 'last_name', 'full_name', 'email', 'phone',
            'date_of_birth', 'gender', 'guardian_name', 'guardian_phone', 'address',
            'roll_number',
            'department', 'department_detail',
            'course', 'course_detail',
            'academic_year', 'academic_year_detail',
            'admission_date', 'admission_type', 'admission_status',
            'previous_school', 'previous_percentage', 'entrance_exam_score', 'remarks',
            'student', 'account_created',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'student', 'account_created', 'created_at', 'updated_at']

    def validate_application_number(self, value):
        instance = self.instance
        queryset = Admission.objects.filter(application_number=value)
        if instance:
            queryset = queryset.exclude(id=instance.id)
        if queryset.exists():
            raise serializers.ValidationError('An admission with this application number already exists.')
        return value
