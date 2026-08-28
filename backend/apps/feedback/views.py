from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import UserRole
from apps.core.mixins import (
    StudentOwnedWriteMixin,
    StudentScopedQuerysetMixin,
    TeacherScopedQuerysetMixin,
)
from apps.core.permissions import IsInternalUser
from .models import TeacherFeedback
from .serializers import TeacherFeedbackSerializer


class TeacherFeedbackViewSet(
    TeacherScopedQuerysetMixin,
    StudentScopedQuerysetMixin,
    StudentOwnedWriteMixin,
    viewsets.ModelViewSet,
):
    """Student submits feedback for a Teacher; Teacher reads feedback about
    themselves; Admin/HOD have broader read access (Priority 4).

    Ownership/scope is always enforced server-side: `student` is forced
    from the authenticated user on create, and the queryset mixins restrict
    reads to "my own submissions" (Student) or "feedback about me"
    (Teacher). Nothing here trusts a teacher_id/student_id supplied by the
    frontend for authorization decisions.
    """

    queryset = TeacherFeedback.objects.select_related('teacher__user', 'student__user').all()
    serializer_class = TeacherFeedbackSerializer
    permission_classes = [IsInternalUser]
    student_lookup = 'student'
    teacher_lookup = 'teacher'
    search_fields = ['comment', 'teacher__user__first_name', 'teacher__user__last_name']
    ordering_fields = ['created_at', 'rating']
    filterset_fields = ['teacher', 'student', 'rating']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        # HOD sees feedback for teachers in their own department; Admin
        # (handled by the mixins' is_superuser/ADMIN bypass) sees all.
        if user.is_authenticated and not user.is_superuser and user.role == UserRole.HOD:
            hod = getattr(user, 'hod_profile', None)
            queryset = queryset.filter(teacher__department_id=hod.department_id) if hod and hod.is_active else queryset.none()
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        student = self.get_request_student()
        if student is not None:
            teacher = serializer.validated_data.get('teacher')
            if teacher is not None and teacher.department_id != student.department_id:
                raise PermissionDenied('You may only submit feedback for a teacher in your own department.')
            serializer.save(student=student)
            return
        if user.role == UserRole.TEACHER:
            raise PermissionDenied('Teachers cannot submit feedback about themselves.')
        serializer.save()

    def perform_update(self, serializer):
        student = self.get_request_student()
        if student is not None:
            self.assert_owns_student(serializer.instance.student)
            serializer.save()
            return
        raise PermissionDenied('You may only edit your own submitted feedback.')
