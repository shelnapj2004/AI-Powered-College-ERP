from django.db.models import ProtectedError
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from apps.core.mixins import HODDepartmentWriteMixin, HODScopedQuerysetMixin, StudentScopedQuerysetMixin, TeacherScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsHOD, ReadOnly

from .models import Timetable
from .serializers import TimetableSerializer


class TimetableViewSet(
    HODScopedQuerysetMixin, HODDepartmentWriteMixin, StudentScopedQuerysetMixin, TeacherScopedQuerysetMixin, viewsets.ModelViewSet
):
    """
    Timetable.

    Permissions:
      - Admin: full access (unchanged).
      - HOD: full CRUD, restricted to their OWN department (Priority 8).
        Read scoping via HODScopedQuerysetMixin; write scoping (the
        department id in the request body) via HODDepartmentWriteMixin.
        Cross-field integrity (course/semester/subject/teacher all
        belonging together, and the teacher actually being assigned to
        the subject via TeacherSubjectAssignment) is enforced in
        TimetableSerializer.validate() below -- applies to every writer,
        not just HOD, since invalid data is invalid regardless of role.
      - Teachers get read-only access, but ONLY to their own timetable
        rows -- never the whole college's schedule (Phase 6).
      - Students get read-only access, ONLY to rows matching their own
        course + semester -- never the whole college timetable (Student
        Phase 1).
    """

    queryset = Timetable.objects.select_related('department', 'course', 'semester', 'subject', 'teacher').all()
    serializer_class = TimetableSerializer
    permission_classes = [IsAdmin | IsHOD | ReadOnly]
    teacher_lookup = 'teacher'
    search_fields = ['room_number', 'subject__name', 'teacher__employee_id', 'day_of_week']
    ordering_fields = ['day_of_week', 'period_number', 'start_time', 'end_time', 'created_at', 'department', 'course', 'semester', 'subject', 'teacher']
    filterset_fields = ['department', 'course', 'semester', 'subject', 'teacher', 'day_of_week', 'period_number', 'is_active']

    def get_student_filter_kwargs(self, student):
        # Timetable has no direct FK to Student -- a Student's own schedule
        # is every row matching their course + semester.
        return {'course': student.course, 'semester': student.semester}

    def perform_create(self, serializer):
        department = serializer.validated_data.get('department')
        self.assert_department_allowed(department.id if department else None)
        serializer.save()

    def perform_update(self, serializer):
        new_department = serializer.validated_data.get('department')
        if new_department is not None:
            self.assert_department_allowed(new_department.id)
        serializer.save()

    def perform_destroy(self, instance):
        # Timetable is referenced by AttendanceSession, on_delete=PROTECT.
        # Convert the raw ProtectedError into a normal 400 (same pattern
        # as apps.courses/apps.subjects).
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(
                'This timetable slot cannot be deleted because it is still referenced by existing attendance sessions.'
            )
