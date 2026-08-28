from django.db.models import ProtectedError
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.core.mixins import HODDepartmentWriteMixin, HODScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsHOD, PublicReadOnly
from .models import Course
from .serializers import CourseSerializer


class CourseViewSet(HODScopedQuerysetMixin, HODDepartmentWriteMixin, viewsets.ModelViewSet):
    """
    Course CRUD.

    Permissions:
      - Admin: full access (create/update/delete) -- unchanged (Priority 8
        rule 16: never remove existing Admin permissions).
      - HOD: full CRUD scoped to their OWN department only (Priority 8).
        Read scoping via HODScopedQuerysetMixin; write scoping (the
        department id in the request body) via HODDepartmentWriteMixin.
      - Any other authenticated role: read-only (Admission form's course
        dropdown, Staff Student Management, etc. all depend on GET here).
      - Anonymous visitors: read-only too (Priority 14) -- the PUBLIC
        /admissions page's Course dropdown depends on GET here with no
        login. HODScopedQuerysetMixin.get_queryset() returns none() for
        an unauthenticated request, so get_queryset() below bypasses it
        for anonymous GETs specifically rather than touching that shared
        mixin's behaviour for every other authenticated role/viewset.

    Note: `filterset_fields` was declared here previously but had no
    effect -- django-filter is not installed/configured anywhere in this
    project (no DEFAULT_FILTER_BACKENDS, no per-view filter_backends), so
    it was dead code (same issue already fixed in apps.students.views and
    apps.departments.views). department/degree/is_active filtering is
    implemented directly in get_queryset() instead.
    """

    queryset = Course.objects.select_related('department').prefetch_related('semesters').all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdmin | IsHOD | PublicReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'code', 'department__name']
    ordering_fields = ['name', 'code', 'degree', 'duration_years', 'total_semesters', 'created_at', 'department']

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            # Public /admissions Course dropdown -- no HOD department
            # scoping applies to an anonymous visitor (PublicReadOnly
            # already restricts this to safe methods only).
            queryset = Course.objects.select_related('department').prefetch_related('semesters').all()
        else:
            queryset = super().get_queryset()
        params = self.request.query_params

        department = params.get('department')
        if department:
            queryset = queryset.filter(department_id=department)

        degree = params.get('degree')
        if degree:
            queryset = queryset.filter(degree=degree)

        is_active = params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1', 'yes'))

        return queryset

    def perform_create(self, serializer):
        department = serializer.validated_data.get('department')
        self.assert_department_allowed(department.id if department else None)
        serializer.save()

    def perform_update(self, serializer):
        new_department = serializer.validated_data.get('department')
        if new_department is not None:
            self.assert_department_allowed(new_department.id)
        serializer.save()

    def perform_destroy(self, instance):
        # Course is referenced by Semester/Student/Subject/Timetable/
        # FeeStructure/Admission, all on_delete=PROTECT (left as-is).
        # Convert the raw ProtectedError into a normal 400 the frontend
        # can display, same pattern as apps.departments.views.
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(
                'This course cannot be deleted because it is still referenced by '
                'existing students, semesters, subjects, timetables, fee structures, or admissions.'
            )
