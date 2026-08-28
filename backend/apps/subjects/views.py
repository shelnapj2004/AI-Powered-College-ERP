from django.db.models import ProtectedError
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from apps.core.mixins import HODDepartmentWriteMixin, HODScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsHOD, ReadOnly
from .models import Subject
from .serializers import SubjectSerializer


class SubjectViewSet(HODScopedQuerysetMixin, HODDepartmentWriteMixin, viewsets.ModelViewSet):
    """
    Subject CRUD.

    Permissions:
      - Admin: full access -- unchanged.
      - HOD: full CRUD, restricted to subjects whose Course belongs to
        their OWN department (Priority 8). Read scoping via
        HODScopedQuerysetMixin (hod_department_lookup='course__department');
        write scoping (the course id in the request body) via
        HODDepartmentWriteMixin, checked against course.department.
      - Any other authenticated role: read-only.
    """

    queryset = Subject.objects.select_related('course', 'course__department', 'semester').all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAdmin | IsHOD | ReadOnly]
    hod_department_lookup = 'course__department'
    search_fields = ['code', 'name', 'course__name', 'semester__name']
    ordering_fields = ['code', 'name', 'credits', 'subject_type', 'created_at']
    filterset_fields = ['course', 'semester', 'subject_type', 'is_active']

    def perform_create(self, serializer):
        course = serializer.validated_data.get('course')
        self.assert_department_allowed(course.department_id if course else None)
        serializer.save()

    def perform_update(self, serializer):
        new_course = serializer.validated_data.get('course')
        if new_course is not None:
            self.assert_department_allowed(new_course.department_id)
        serializer.save()

    def perform_destroy(self, instance):
        # Subject is referenced by Timetable/StudyMaterial/Assignment/
        # Examination, etc, all on_delete=PROTECT. Convert the raw
        # ProtectedError into a normal 400 (same pattern as apps.courses).
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(
                'This subject cannot be deleted because it is still referenced by '
                'existing timetables, study materials, assignments, or examinations.'
            )
