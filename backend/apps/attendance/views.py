from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.core.mixins import (
    HODScopedQuerysetMixin,
    StudentScopedQuerysetMixin,
    TeacherOwnedWriteMixin,
    TeacherScopedQuerysetMixin,
)
from apps.core.permissions import IsAdmin, IsTeacher, ReadOnly

from .models import AttendanceRecord, AttendanceSession
from .serializers import AttendanceRecordSerializer, AttendanceSessionSerializer


class AttendanceSessionViewSet(
    HODScopedQuerysetMixin, StudentScopedQuerysetMixin, TeacherScopedQuerysetMixin, TeacherOwnedWriteMixin,
    viewsets.ModelViewSet
):
    """
    A Teacher may create/manage attendance sessions ONLY for their own
    timetable slots (Phase 7). Admin has unrestricted access. A Student
    only sees sessions relevant to their own course + semester -- never
    the whole college's sessions (Student Phase 1C) -- read-only,
    enforced by ReadOnly below.
    """

    queryset = AttendanceSession.objects.select_related('timetable', 'timetable__teacher').all()
    serializer_class = AttendanceSessionSerializer
    permission_classes = [IsAdmin | IsTeacher | ReadOnly]
    teacher_lookup = 'timetable__teacher'
    hod_department_lookup = 'timetable__department'
    search_fields = ['timetable__course__name', 'topic_covered']
    ordering_fields = ['attendance_date', 'created_at', 'timetable']
    filterset_fields = ['timetable', 'attendance_date']

    def get_student_filter_kwargs(self, student):
        return {'timetable__course': student.course, 'timetable__semester': student.semester}

    def perform_create(self, serializer):
        timetable = serializer.validated_data.get('timetable')
        teacher = self.get_request_teacher()
        if teacher is not None and timetable is not None and timetable.teacher_id != teacher.id:
            raise PermissionDenied('You may only take attendance for your own timetable slots.')
        serializer.save()

    def perform_update(self, serializer):
        timetable = serializer.validated_data.get('timetable', serializer.instance.timetable)
        teacher = self.get_request_teacher()
        if teacher is not None and timetable.teacher_id != teacher.id:
            raise PermissionDenied('You may only manage attendance for your own timetable slots.')
        serializer.save()


class AttendanceRecordViewSet(
    HODScopedQuerysetMixin, StudentScopedQuerysetMixin, TeacherScopedQuerysetMixin, TeacherOwnedWriteMixin,
    viewsets.ModelViewSet
):
    """
    Attendance records are scoped through the parent session's timetable
    teacher, so a Teacher can only mark/view attendance for their own
    classes and never another teacher's students (Phase 7 / 10). A Student
    only ever sees their OWN attendance records -- never another
    student's, and never with create/update access, which ReadOnly below
    denies to the student role entirely (Student Phase 1C).
    """

    queryset = AttendanceRecord.objects.select_related(
        'attendance_session', 'attendance_session__timetable', 'attendance_session__timetable__teacher', 'student'
    ).all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAdmin | IsTeacher | ReadOnly]
    teacher_lookup = 'attendance_session__timetable__teacher'
    student_lookup = 'student'
    hod_department_lookup = 'attendance_session__timetable__department'
    search_fields = ['student__user__first_name', 'student__user__last_name', 'student__admission_number']
    ordering_fields = ['status', 'created_at', 'attendance_session', 'student']
    filterset_fields = ['attendance_session', 'student', 'status']

    def _validate_session_ownership(self, session):
        teacher = self.get_request_teacher()
        if teacher is not None and session.timetable.teacher_id != teacher.id:
            raise PermissionDenied('You may only mark attendance for your own classes.')

    def _validate_student_in_class(self, session, student):
        timetable = session.timetable
        if student.course_id != timetable.course_id or student.semester_id != timetable.semester_id:
            raise ValidationError('This student is not enrolled in the course/semester for this class.')

    def perform_create(self, serializer):
        session = serializer.validated_data.get('attendance_session')
        student = serializer.validated_data.get('student')
        self._validate_session_ownership(session)
        self._validate_student_in_class(session, student)
        serializer.save()

    def perform_update(self, serializer):
        session = serializer.validated_data.get('attendance_session', serializer.instance.attendance_session)
        student = serializer.validated_data.get('student', serializer.instance.student)
        self._validate_session_ownership(session)
        self._validate_student_in_class(session, student)
        serializer.save()
