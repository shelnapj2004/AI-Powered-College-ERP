from django.db.models import ProtectedError
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.core.permissions import IsAdmin, ReadOnly

from .models import AcademicYear
from .serializers import AcademicYearSerializer


class AcademicYearViewSet(viewsets.ModelViewSet):
    """
    Academic Year CRUD.

    Permissions:
      - Admin: full access (create/update/delete).
      - Any other authenticated role: read-only (Admission form's academic
        year dropdown, Semester Management, etc. all depend on GET here).

    Note: `filterset_fields` was declared here previously but had no
    effect -- django-filter is not installed/configured anywhere in this
    project (no DEFAULT_FILTER_BACKENDS, no per-view filter_backends), so
    it was dead code (same issue already fixed in apps.students/apps.
    departments/apps.courses views). `is_current`/`is_active` filtering is
    implemented directly in get_queryset() instead.
    """

    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAdmin | ReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'start_date', 'end_date', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        is_current = params.get('is_current')
        if is_current is not None:
            queryset = queryset.filter(is_current=is_current.lower() in ('true', '1', 'yes'))

        is_active = params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1', 'yes'))

        return queryset

    def perform_destroy(self, instance):
        # AcademicYear is referenced by Semester/FeeStructure/Admission,
        # all on_delete=PROTECT (left as-is). Convert the raw ProtectedError
        # into a normal 400 the frontend can display, same pattern as
        # apps.departments.views / apps.courses.views.
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(
                'This academic year cannot be deleted because it is still referenced by '
                'existing semesters, fee structures, or admissions.'
            )
