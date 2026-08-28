from rest_framework import serializers
from .models import Timetable


class TimetableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Timetable
        fields = ['id', 'department', 'course', 'semester', 'subject', 'teacher', 'day_of_week', 'period_number', 'room_number', 'start_time', 'end_time', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        # Cross-field academic integrity (Priority 8, Phase F). Applies to
        # every write regardless of role (Admin included) -- invalid
        # combinations are invalid data, not just an HOD-only restriction.
        # Falls back to the existing instance's value for any field not
        # present in a partial (PATCH) update.
        def current(field):
            return attrs.get(field, getattr(self.instance, field, None))

        department = current('department')
        course = current('course')
        semester = current('semester')
        subject = current('subject')
        teacher = current('teacher')

        if course and department and course.department_id != department.id:
            raise serializers.ValidationError({'course': 'Course does not belong to the selected department.'})
        if semester and course and semester.course_id != course.id:
            raise serializers.ValidationError({'semester': 'Semester does not belong to the selected course.'})
        if subject and course and subject.course_id != course.id:
            raise serializers.ValidationError({'subject': 'Subject does not belong to the selected course.'})
        if subject and semester and subject.semester_id != semester.id:
            raise serializers.ValidationError({'subject': 'Subject does not belong to the selected semester.'})
        if teacher and department and teacher.department_id != department.id:
            raise serializers.ValidationError({'teacher': 'Teacher does not belong to the selected department.'})
        if teacher and subject:
            # Local import avoids a circular import between apps.timetable
            # and apps.teachers at module load time.
            from apps.teachers.models import TeacherSubjectAssignment
            if not TeacherSubjectAssignment.objects.filter(teacher=teacher, subject=subject, is_active=True).exists():
                raise serializers.ValidationError(
                    {'teacher': 'This teacher is not assigned to teach the selected subject. Assign the subject to the teacher first.'}
                )

        return attrs
