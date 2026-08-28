from django.utils import timezone
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.models import UserRole
from apps.core.mixins import TeacherOwnedWriteMixin, TeacherScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsStudent, IsTeacher, ReadOnly
from apps.students.models import Student

from .models import Assignment, AssignmentSubmission, SubmissionStatus
from .serializers import AssignmentSerializer, AssignmentSubmissionSerializer


class AssignmentViewSet(TeacherScopedQuerysetMixin, TeacherOwnedWriteMixin, viewsets.ModelViewSet):
    """
    A Teacher may only create/manage assignments under their own name
    (Phase 8). A Student only sees assignments for their own
    course/semester. Admin is unrestricted.
    """

    queryset = Assignment.objects.select_related('subject', 'semester', 'teacher').all()
    serializer_class = AssignmentSerializer
    permission_classes = [IsAdmin | IsTeacher | IsStudent | ReadOnly]
    teacher_lookup = 'teacher'
    search_fields = ['title', 'description', 'subject__name', 'teacher__user__first_name', 'teacher__user__last_name']
    ordering_fields = ['title', 'assigned_date', 'due_date', 'maximum_marks', 'created_at', 'subject', 'semester', 'teacher']
    filterset_fields = ['subject', 'semester', 'teacher', 'is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and user.role == UserRole.STUDENT:
            student = getattr(user, 'student', None)
            if student is None:
                return queryset.none()
            return queryset.filter(semester=student.semester, subject__course=student.course)
        return queryset

    def perform_create(self, serializer):
        teacher = self.get_request_teacher()
        # Teachers cannot author assignments under another teacher's name.
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


class AssignmentSubmissionViewSet(TeacherScopedQuerysetMixin, TeacherOwnedWriteMixin, viewsets.ModelViewSet):
    """
    A Teacher only sees/grades submissions for assignments they own
    (Phase 8). A Student only sees/creates their own submissions.
    """

    queryset = AssignmentSubmission.objects.select_related('assignment', 'assignment__teacher', 'student').all()
    serializer_class = AssignmentSubmissionSerializer
    permission_classes = [IsAdmin | IsTeacher | IsStudent | ReadOnly]
    teacher_lookup = 'assignment__teacher'
    search_fields = ['assignment__title', 'student__user__first_name', 'student__user__last_name', 'status']
    ordering_fields = ['submitted_at', 'obtained_marks', 'status', 'created_at', 'assignment', 'student']
    filterset_fields = ['assignment', 'student', 'status']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and user.role == UserRole.STUDENT:
            student = getattr(user, 'student', None)
            if student is None:
                return queryset.none()
            return queryset.filter(student=student)
        return queryset

    @staticmethod
    def _derive_status(assignment, when):
        due = assignment.due_date
        submitted_date = timezone.localtime(when).date() if timezone.is_aware(when) else when.date()
        return SubmissionStatus.LATE if due and submitted_date > due else SubmissionStatus.SUBMITTED

    def _resolve_student_from_request(self):
        """
        Resolves the target Student for an Admin/Teacher-authored
        submission from the raw request payload. `student` is a
        read-only serializer field (student identity must never be
        client-writable when the client IS the student -- see
        AssignmentSubmissionSerializer), so it never appears in
        validated_data; Admin/Teacher creation still needs to know which
        student it's recording a submission for, so it's read directly
        from request.data here instead.
        """
        student_id = self.request.data.get('student')
        if not student_id:
            raise ValidationError({'student': 'This field is required.'})
        try:
            return Student.objects.get(pk=student_id)
        except (Student.DoesNotExist, ValueError, TypeError):
            raise ValidationError({'student': 'Invalid student id.'})

    def perform_create(self, serializer):
        user = self.request.user
        now = timezone.now()
        if user.role == UserRole.STUDENT:
            student = getattr(user, 'student', None)
            if student is None:
                raise PermissionDenied('No student profile linked to this account.')
            assignment = serializer.validated_data.get('assignment')
            if assignment is None:
                raise PermissionDenied('assignment is required.')
            # Real creation of the AssignmentSubmission row -- this is the
            # actual persistence step (Problem 3). status/submitted_at are
            # computed server-side from "now" vs the assignment due date,
            # never trusted from the client.
            serializer.save(
                student=student,
                status=self._derive_status(assignment, now),
                submitted_at=now,
            )
            return
        teacher = self.get_request_teacher()
        if teacher is not None:
            assignment = serializer.validated_data.get('assignment')
            if assignment and assignment.teacher_id != teacher.id:
                raise PermissionDenied("You may only manage submissions for your own assignments.")
        # Admin/Teacher recording a submission on a student's behalf --
        # `student` is read-only on the serializer, so it must be resolved
        # explicitly here rather than relying on validated_data.
        serializer.save(student=self._resolve_student_from_request())

    def perform_update(self, serializer):
        instance = serializer.instance
        user = self.request.user
        if user.role == UserRole.STUDENT:
            student = getattr(user, 'student', None)
            if student is None or instance.student_id != student.id:
                raise PermissionDenied('You may only update your own submission.')
            # A Student may resubmit their own work (e.g. replace the
            # file), which re-derives status/submitted_at, but must never
            # set their own grade/feedback or reassign the submission to
            # another student (Student Phase 1 / grading integrity).
            now = timezone.now()
            serializer.save(
                student=instance.student,
                status=self._derive_status(instance.assignment, now),
                submitted_at=now,
                obtained_marks=instance.obtained_marks,
                feedback=instance.feedback,
            )
            return
        else:
            self.assert_owns_teacher(instance.assignment.teacher)
        serializer.save()
