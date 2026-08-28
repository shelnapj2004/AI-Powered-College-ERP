from django.db.models import ProtectedError
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.core.permissions import IsAdmin, PublicReadOnly

from .models import Department
from .serializers import DepartmentSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    Department CRUD.

    Permissions:
      - Admin: full access (create/update/delete).
      - Anyone, including anonymous visitors: read-only. Staff Student/
        Teacher/HOD Management, the Admin registration form, and the
        PUBLIC /admissions page (Priority 14) all depend on GET here for
        their department dropdowns/lookups -- Department Management
        itself stays Admin-only per the existing project convention (see
        apps.courses.views.CourseViewSet).

    Note: `filterset_fields` was declared here previously but had no
    effect -- django-filter is not installed/configured anywhere in this
    project (no DEFAULT_FILTER_BACKENDS, no per-view filter_backends), so
    it was dead code (same issue already fixed in apps.students.views).
    `is_active` filtering is implemented directly in get_queryset()
    instead. `search` and `ordering` use DRF's built-in SearchFilter/
    OrderingFilter, which require no extra package.
    """

    queryset = Department.objects.prefetch_related('teachers', 'students', 'hods__user').all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdmin | PublicReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code', 'created_at', 'updated_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1', 'yes'))
        return queryset

    def perform_destroy(self, instance):
        # All FKs to Department (Course/Teacher/Student/Staff/Admission/HOD)
        # use on_delete=PROTECT -- that's intentionally left as-is. Django's
        # ProtectedError isn't a DRF APIException, so uncaught it becomes an
        # unhandled 500. Convert it into a normal 400 that
        # apps.core.exceptions.custom_exception_handler can wrap and the
        # frontend can display.
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(
                'This department cannot be deleted because it is still referenced by '
                'existing students, teachers, courses, staff, HODs, or admissions.'
            )
