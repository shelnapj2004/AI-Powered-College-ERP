from rest_framework import serializers
from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Department CRUD serializer.

    `hod_name`, `faculty_count` and `student_count` are computed from the
    existing HOD/Teacher/Student -> Department relations (HOD.department,
    Teacher.department, Student.department reverse FKs) -- no new columns
    were added to the Department model to reproduce what the old frontend
    mock displayed.
    """

    hod_name = serializers.SerializerMethodField()
    faculty_count = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'description', 'is_active',
            'hod_name', 'faculty_count', 'student_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_hod_name(self, obj: Department) -> str | None:
        hod = next((h for h in obj.hods.all() if h.is_active), None)
        return hod.user.get_full_name() if hod else None

    def get_faculty_count(self, obj: Department) -> int:
        return len(obj.teachers.all())

    def get_student_count(self, obj: Department) -> int:
        return len(obj.students.all())
