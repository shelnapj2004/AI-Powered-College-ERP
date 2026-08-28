from rest_framework import serializers

from apps.academic_year.serializers import AcademicYearSerializer
from apps.courses.serializers import CourseSerializer

from .models import Semester


class SemesterSerializer(serializers.ModelSerializer):
    # Read-only nested representations, same convention already used by
    # apps.admissions.serializers.AdmissionSerializer.
    course_detail = CourseSerializer(source='course', read_only=True)
    academic_year_detail = AcademicYearSerializer(source='academic_year', read_only=True)

    class Meta:
        model = Semester
        fields = [
            'id', 'academic_year', 'academic_year_detail', 'course', 'course_detail',
            'semester_number', 'name', 'start_date', 'end_date', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        if attrs.get('end_date') and attrs.get('start_date'):
            if attrs['end_date'] <= attrs['start_date']:
                raise serializers.ValidationError({'end_date': 'End date must be greater than start date.'})
        if attrs.get('semester_number') is not None and attrs['semester_number'] <= 0:
            raise serializers.ValidationError({'semester_number': 'Semester number must be positive.'})
        if attrs.get('academic_year') and attrs.get('start_date'):
            if attrs['start_date'] < attrs['academic_year'].start_date:
                raise serializers.ValidationError({'start_date': 'Semester start date must be within the academic year.'})
        if attrs.get('academic_year') and attrs.get('end_date'):
            if attrs['end_date'] > attrs['academic_year'].end_date:
                raise serializers.ValidationError({'end_date': 'Semester end date must be within the academic year.'})
        return attrs

    def validate_semester_number(self, value):
        instance = self.instance
        academic_year = self.initial_data.get('academic_year')
        course = self.initial_data.get('course')
        if academic_year and course:
            queryset = Semester.objects.filter(
                academic_year=academic_year,
                course=course,
                semester_number=value
            )
            if instance:
                queryset = queryset.exclude(id=instance.id)
            if queryset.exists():
                raise serializers.ValidationError('Semester with this number already exists for this course in the academic year.')
        return value
