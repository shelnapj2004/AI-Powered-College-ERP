from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from apps.core.mixins import (
    HODScopedQuerysetMixin,
    StudentScopedQuerysetMixin,
    TeacherOwnedWriteMixin,
    TeacherScopedQuerysetMixin,
)
from apps.core.permissions import IsAdmin, IsTeacher, ReadOnly
from .models import Examination, InternalMark, SemesterResult, SemesterResultSubject
from .serializers import ExaminationSerializer, InternalMarkSerializer, SemesterResultSerializer, SemesterResultSubjectSerializer


class ExaminationViewSet(
    HODScopedQuerysetMixin, StudentScopedQuerysetMixin, TeacherScopedQuerysetMixin, TeacherOwnedWriteMixin,
    viewsets.ModelViewSet
):
    """
    A Teacher only manages examinations under their own name (Phase 9).
    Admin is unrestricted. A Student only sees examinations for their own
    course + semester -- read-only, enforced by ReadOnly (Student Phase 1).
    """

    queryset = Examination.objects.select_related('subject', 'semester', 'teacher').all()
    serializer_class = ExaminationSerializer
    permission_classes = [IsAdmin | IsTeacher | ReadOnly]
    teacher_lookup = 'teacher'
    hod_department_lookup = 'subject__course__department'
    search_fields = ['title', 'subject__name', 'semester__name', 'teacher__employee_id']
    ordering_fields = ['exam_type', 'exam_date', 'maximum_marks', 'created_at', 'subject', 'semester', 'teacher']
    filterset_fields = ['subject', 'semester', 'teacher', 'exam_type', 'is_active']

    def get_student_filter_kwargs(self, student):
        # Examination has no direct FK to Student -- scoped via subject's
        # course + the exam's own semester.
        return {'subject__course': student.course, 'semester': student.semester}

    def perform_create(self, serializer):
        teacher = self.get_request_teacher()
        if teacher is not None:
            serializer.save(teacher=teacher)
        else:
            serializer.save()

    def perform_update(self, serializer):
        self.assert_owns_teacher(serializer.instance.teacher)
        serializer.save()

    def perform_destroy(self, instance):
        self.assert_owns_teacher(instance.teacher)
        instance.delete()


class InternalMarkViewSet(
    HODScopedQuerysetMixin, StudentScopedQuerysetMixin, TeacherScopedQuerysetMixin, TeacherOwnedWriteMixin,
    viewsets.ModelViewSet
):
    """
    A Teacher only enters/views internal marks for examinations they own
    (Phase 9). A teacher must not touch another teacher's marks. A Student
    only ever sees their OWN marks -- never another student's, and never
    with create/update access, which ReadOnly below denies to the student
    role entirely (Student Phase 1).
    """

    queryset = InternalMark.objects.select_related('examination', 'examination__teacher', 'student').all()
    serializer_class = InternalMarkSerializer
    permission_classes = [IsAdmin | IsTeacher | ReadOnly]
    teacher_lookup = 'examination__teacher'
    student_lookup = 'student'
    hod_department_lookup = 'examination__subject__course__department'
    search_fields = ['student__admission_number', 'examination__title']
    ordering_fields = ['marks_obtained', 'created_at', 'examination', 'student']
    filterset_fields = ['examination', 'student']

    def perform_create(self, serializer):
        teacher = self.get_request_teacher()
        if teacher is not None:
            examination = serializer.validated_data.get('examination')
            if examination and examination.teacher_id != teacher.id:
                raise PermissionDenied('You may only enter marks for your own examinations.')
        serializer.save()

    def perform_update(self, serializer):
        self.assert_owns_teacher(serializer.instance.examination.teacher)
        serializer.save()


class SemesterResultViewSet(HODScopedQuerysetMixin, StudentScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Consolidated results remain Admin-managed (create/update/delete). A
    Student gets read-only access to ONLY their own results -- never
    another student's (Student Phase 1).
    """

    queryset = SemesterResult.objects.all()
    serializer_class = SemesterResultSerializer
    permission_classes = [IsAdmin | ReadOnly]
    search_fields = ['student__admission_number', 'semester__name']
    ordering_fields = ['sgpa', 'cgpa', 'published_date', 'created_at', 'student', 'semester']
    filterset_fields = ['student', 'semester', 'result_status']
    student_lookup = 'student'
    hod_department_lookup = 'student__department'


class SemesterResultSubjectViewSet(HODScopedQuerysetMixin, StudentScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Consolidated results remain Admin-managed (create/update/delete). A
    Student gets read-only access to ONLY the subject-results belonging to
    their own SemesterResult -- never another student's (Student Phase 1).
    """

    queryset = SemesterResultSubject.objects.all()
    serializer_class = SemesterResultSubjectSerializer
    permission_classes = [IsAdmin | ReadOnly]
    search_fields = ['subject__name', 'grade']
    ordering_fields = ['total_marks', 'grade_point', 'credits_earned', 'created_at', 'semester_result', 'subject']
    filterset_fields = ['semester_result', 'subject', 'result']
    student_lookup = 'semester_result__student'
    hod_department_lookup = 'semester_result__student__department'
