from rest_framework import serializers

from apps.departments.serializers import DepartmentSerializer

from .models import Course


class CourseSerializer(serializers.ModelSerializer):
    # Read-only nested representation so the frontend gets real department
    # name/code, not a bare UUID -- same convention already used by
    # apps.students.serializers.StudentSerializer / apps.admissions.
    department_detail = DepartmentSerializer(source='department', read_only=True)
    semester_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'department', 'department_detail', 'name', 'code', 'degree',
            'duration_years', 'total_semesters', 'semester_count',
            'description', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_duration_years(self, value):
        if value <= 0:
            raise serializers.ValidationError('Duration years must be positive.')
        return value

    def validate_total_semesters(self, value):
        if value <= 0:
            raise serializers.ValidationError('Total semesters must be positive.')
        return value

    def get_semester_count(self, obj: Course) -> int:
        # Course has no direct Semester/AcademicYear FK -- Semester points
        # AT Course (and separately at AcademicYear). This is just the
        # reverse-relation count, not a new field on the model.
        return len(obj.semesters.all())
