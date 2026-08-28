import uuid

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.adminpanel.mixins import AuditLogMixin
from apps.core.mixins import HODScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsInternalUser, IsStaff, IsTeacher, ReadOnly
from apps.timetable.models import Timetable

from .models import Student, StudentApprovalStatus
from .serializers import StudentAccountCreateSerializer, StudentSerializer, StudentSetPasswordSerializer


class StudentViewSet(HODScopedQuerysetMixin, AuditLogMixin, viewsets.ModelViewSet):
    """
    Student CRUD + account-creation workflow.

    Permissions:
      - Admin: full access.
      - Staff: can process registrations into accounts, update, activate/
        deactivate, and reset passwords (Staff Student Management). Staff
        cannot POST /students/ directly -- see StudentSerializer.create.
      - Any other authenticated role: read-only.

    Note: `filterset_fields` was declared here previously but had no effect --
    django-filter is not installed/configured anywhere in this project (no
    DEFAULT_FILTER_BACKENDS, no per-view filter_backends), so it was dead code.
    Department/course/semester/gender/is_active filtering below is implemented
    directly in get_queryset() using query params instead, to avoid adding a
    new dependency for this phase. `search` and `ordering` use DRF's built-in
    SearchFilter/OrderingFilter, which require no extra package.
    """

    queryset = Student.objects.select_related('user', 'department', 'course', 'semester').all()
    serializer_class = StudentSerializer
    permission_classes = [IsAdmin | IsStaff | ReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['admission_number', 'roll_number', 'registration_number', 'user__first_name', 'user__last_name', 'user__email', 'user__student_id']
    ordering_fields = ['admission_number', 'roll_number', 'current_semester', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Student role: never expose another student's record via list/retrieve.
        # (Admin/Staff/Teacher keep full visibility; ReadOnly alone is not
        # sufficient scoping for the student role -- Student Phase 1.)
        if user.is_authenticated and not user.is_superuser and getattr(user, 'role', None) == 'student':
            student = getattr(user, 'student', None)
            queryset = queryset.filter(pk=student.pk) if student else queryset.none()

        params = self.request.query_params

        department = params.get('department')
        if department:
            queryset = self._filter_by_uuid(queryset, 'department_id', department, 'department')

        course = params.get('course')
        if course:
            queryset = self._filter_by_uuid(queryset, 'course_id', course, 'course')

        semester = params.get('semester')
        if semester:
            queryset = self._filter_by_uuid(queryset, 'semester_id', semester, 'semester')

        current_semester = params.get('current_semester')
        if current_semester:
            queryset = queryset.filter(current_semester=current_semester)

        gender = params.get('gender')
        if gender:
            queryset = queryset.filter(gender=gender)

        is_active = params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1', 'yes'))

        approval_status = params.get('approval_status')
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)

        return queryset

    def _filter_by_uuid(self, queryset, lookup, raw_value, field_name):
        """
        Validates a query-param id before using it in a filter() call.
        Django/psycopg raise on an invalid UUID literal, which otherwise
        surfaces as an unhandled 500 (Problem 4) -- a malformed id must
        return a clean 400 instead.
        """
        try:
            uuid.UUID(str(raw_value))
        except (ValueError, TypeError, AttributeError):
            raise ValidationError({field_name: f'"{raw_value}" is not a valid UUID.'})
        try:
            return queryset.filter(**{lookup: raw_value})
        except DjangoValidationError as exc:
            raise ValidationError({field_name: exc.messages})

    def get_permissions(self):
        if self.action in ('create_account', 'set_password'):
            return [(IsAdmin | IsStaff)()]
        if self.action == 'my_students':
            return [(IsAdmin | IsTeacher)()]
        if self.action == 'me':
            return [IsInternalUser()]
        if self.action in ('approve', 'reject'):
            # Admin only -- Staff creates the student but must never be able
            # to approve their own Staff-created student (Priority 14).
            return [IsAdmin()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """
        Returns the logged-in Student's OWN profile, derived from the
        authenticated user -- never from a client-supplied id. Used by
        StudentDashboard so it never hardcodes a student identity.
        """
        student = getattr(request.user, 'student', None)
        if student is None:
            raise NotFound('No student profile is linked to this account.')
        return Response(self.get_serializer(student).data)

    @action(detail=False, methods=['get'], url_path='my-students')
    def my_students(self, request):
        """
        Students derived from the logged-in Teacher's OWN timetable rows
        (Teacher -> Timetable -> Course/Semester -> Students), never the
        full college roster (Phase E). No SubjectAllocation model exists,
        so this reuses the real, already-teacher-scoped Timetable relation.
        """
        user = request.user
        if user.is_superuser or user.role == 'admin':
            queryset = self.filter_queryset(self.get_queryset())
        else:
            teacher = getattr(user, 'teacher', None)
            if teacher is None:
                return Response({'success': True, 'count': 0, 'next': None, 'previous': None,
                                  'page': 1, 'page_size': 0, 'total_pages': 0, 'results': []})
            semester_ids = Timetable.objects.filter(teacher=teacher).values_list('semester_id', flat=True).distinct()
            queryset = self.get_queryset().filter(semester_id__in=semester_ids)
            queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='create-account')
    def create_account(self, request):
        """
        STAFF creates the login account for an already-registered (Admission)
        student. Generates the Student ID on the backend, hashes the
        password, and persists User + Student atomically.
        """
        serializer = StudentAccountCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        return Response(StudentSerializer(student).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """
        ADMIN approves a Staff-direct-created Student (Priority 14). Flips
        `approval_status` to APPROVED and re-activates the linked User so
        it can authenticate. Persisted to the database, not just React
        state -- a page refresh reflects the real stored status.
        """
        student = self.get_object()
        student.approval_status = StudentApprovalStatus.APPROVED
        student.save(update_fields=['approval_status', 'updated_at'])
        student.user.is_active = True
        student.user.save(update_fields=['is_active'])
        return Response(self.get_serializer(student).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """ADMIN rejects a Staff-direct-created Student. The account stays inactive (cannot log in)."""
        student = self.get_object()
        student.approval_status = StudentApprovalStatus.REJECTED
        student.save(update_fields=['approval_status', 'updated_at'])
        student.user.is_active = False
        student.user.save(update_fields=['is_active'])
        return Response(self.get_serializer(student).data)

    @action(detail=True, methods=['post'], url_path='set-password')
    def set_password(self, request, pk=None):
        """STAFF/Admin resets a student's password. Plaintext is never stored or returned."""
        student = self.get_object()
        serializer = StudentSetPasswordSerializer(data=request.data, context={'student': student})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'success': True, 'message': 'Password updated.'})
