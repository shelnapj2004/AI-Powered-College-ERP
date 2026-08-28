from django.db.models import ProtectedError
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.core.mixins import HODScopedQuerysetMixin
from apps.core.permissions import IsAdmin, ReadOnly

from .models import Semester
from .serializers import SemesterSerializer


class SemesterViewSet(HODScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Semester CRUD.

    Permissions:
      - Admin: full access (create/update/delete).
      - Any other authenticated role: read-only.

    Note: `filterset_fields` was declared here previously but had no
    effect -- django-filter is not installed/configured anywhere in this
    project (no DEFAULT_FILTER_BACKENDS, no per-view filter_backends), so
    it was dead code (same issue already fixed in apps.students/apps.
    departments/apps.courses/apps.academic_year views). academic_year/
    course/semester_number/is_active filtering is implemented directly in
    get_queryset() instead.
    """

    queryset = Semester.objects.select_related('academic_year', 'course', 'course__department').all()
    serializer_class = SemesterSerializer
    permission_classes = [IsAdmin | ReadOnly]
    hod_department_lookup = 'course__department'
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'course__name', 'academic_year__name']
    ordering_fields = ['semester_number', 'start_date', 'end_date', 'created_at', 'academic_year', 'course']

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        academic_year = params.get('academic_year')
        if academic_year:
            queryset = queryset.filter(academic_year_id=academic_year)

        course = params.get('course')
        if course:
            queryset = queryset.filter(course_id=course)

        semester_number = params.get('semester_number')
        if semester_number:
            queryset = queryset.filter(semester_number=semester_number)

        is_active = params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1', 'yes'))

        return queryset

    def perform_destroy(self, instance):
        # Semester is referenced by Timetable/Student/Examination/Subject/
        # Assignment/StudyMaterial, all on_delete=PROTECT (left as-is).
        # Convert the raw ProtectedError into a normal 400 the frontend can
        # display, same pattern as apps.departments/apps.courses views.
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(
                'This semester cannot be deleted because it is still referenced by '
                'existing students, timetables, examinations, subjects, assignments, or study materials.'
            )
