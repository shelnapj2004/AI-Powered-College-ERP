from rest_framework import viewsets

from apps.core.mixins import StudentScopedQuerysetMixin, TeacherOwnedWriteMixin, TeacherScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsTeacher, ReadOnly
from .models import StudyMaterial
from .serializers import StudyMaterialSerializer


class StudyMaterialViewSet(
    StudentScopedQuerysetMixin, TeacherScopedQuerysetMixin, TeacherOwnedWriteMixin, viewsets.ModelViewSet
):
    """
    A Teacher may only upload/edit/delete their OWN study materials; they
    still see materials from other teachers for the same subject read-only
    is not exposed here (list is teacher-scoped like Assignments/Exams).
    Admin is unrestricted. A Student only sees materials for their own
    course + semester -- read-only, enforced by ReadOnly (Student Phase 1).
    """

    queryset = StudyMaterial.objects.select_related('subject', 'semester', 'teacher').all()
    serializer_class = StudyMaterialSerializer
    permission_classes = [IsAdmin | IsTeacher | ReadOnly]
    teacher_lookup = 'teacher'
    search_fields = ['title', 'description', 'subject__name', 'subject__code', 'semester__name', 'teacher__user__first_name', 'teacher__user__last_name']
    ordering_fields = ['title', 'uploaded_at', 'material_type', 'created_at']
    filterset_fields = ['subject', 'semester', 'teacher', 'material_type', 'is_active']

    def get_student_filter_kwargs(self, student):
        # StudyMaterial has no direct FK to Student -- scoped via subject's
        # course + the material's own semester.
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
