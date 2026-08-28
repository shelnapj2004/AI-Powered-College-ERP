from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import UserRole
from apps.core.mixins import StudentScopedQuerysetMixin, TeacherOwnedWriteMixin, TeacherScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsStudent, IsTeacher
from .models import Question
from .serializers import QuestionSerializer


class QuestionViewSet(StudentScopedQuerysetMixin, TeacherScopedQuerysetMixin, TeacherOwnedWriteMixin, viewsets.ModelViewSet):
    """
    A Teacher's Question Bank write access is private: they only ever
    create/edit/delete questions they created (TeacherScopedQuerysetMixin +
    ownership checks on write). Admin is unrestricted.

    A Student gets READ-ONLY access (Problem 2), scoped to questions whose
    Subject matches the Student's own course + semester -- never the full
    college bank. Mixin order matters: TeacherScopedQuerysetMixin only acts
    for the teacher role and StudentScopedQuerysetMixin only acts for the
    student role, so chaining them is safe -- each is a no-op for the other
    role's requests.
    """

    queryset = Question.objects.select_related('subject', 'teacher').all()
    serializer_class = QuestionSerializer
    permission_classes = [IsAdmin | IsTeacher | IsStudent]
    teacher_lookup = 'teacher'
    search_fields = ['question_text', 'topic', 'subject__name', 'subject__code']
    ordering_fields = ['created_at', 'marks', 'question_type']
    filterset_fields = ['subject', 'question_type']

    def get_student_filter_kwargs(self, student):
        # Question has no direct FK to Student -- scoped via the Subject's
        # course + semester, same relation used for Assignment/Examination.
        return {'subject__course': student.course, 'subject__semester': student.semester}

    def get_permissions(self):
        if self.request.user.is_authenticated and not self.request.user.is_superuser and self.request.user.role == UserRole.STUDENT:
            if self.action not in ('list', 'retrieve'):
                raise PermissionDenied('Students have read-only access to the Question Bank.')
        return super().get_permissions()

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
