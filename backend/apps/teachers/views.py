from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from apps.adminpanel.mixins import AuditLogMixin
from apps.core.mixins import HODDepartmentWriteMixin, HODScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsHOD, IsInternalUser, IsStaff, ReadOnly

from .models import Teacher, TeacherSubjectAssignment
from .serializers import TeacherSerializer, TeacherSubjectAssignmentSerializer


class TeacherViewSet(HODScopedQuerysetMixin, AuditLogMixin, viewsets.ModelViewSet):
    """
    Teacher CRUD.

    Permissions:
      - Admin: full access (unchanged).
      - Staff: create/update/activate-deactivate/reset-password (Staff
        Teacher Management), same operational scope as Student Management --
        NOT full Admin privileges elsewhere in the system.
      - Any other authenticated role: read-only.
    """

    queryset = Teacher.objects.select_related('user', 'department').all()
    serializer_class = TeacherSerializer
    permission_classes = [IsAdmin | IsStaff | ReadOnly]
    search_fields = ['employee_id', 'user__first_name', 'user__last_name', 'user__email', 'designation']
    ordering_fields = ['employee_id', 'designation', 'experience_years', 'created_at', 'department']

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        department = params.get('department')
        if department:
            queryset = queryset.filter(department_id=department)

        designation = params.get('designation')
        if designation:
            queryset = queryset.filter(designation__icontains=designation)

        is_active = params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1', 'yes'))

        return queryset

    def get_permissions(self):
        if self.action == 'me':
            return [IsInternalUser()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """
        Returns the logged-in Teacher's OWN profile, derived from the
        authenticated user -- never from a client-supplied id (Phase B).
        Used by TeacherDashboard so it never hardcodes a teacher identity.
        """
        teacher = getattr(request.user, 'teacher', None)
        if teacher is None:
            raise NotFound('No teacher profile is linked to this account.')
        return Response(self.get_serializer(teacher).data)

    @action(detail=True, methods=['post'], url_path='set-password')
    def set_password(self, request, pk=None):
        """Staff/Admin resets a teacher's password. Plaintext is never stored or returned."""
        from rest_framework import serializers

        class _SetPassword(serializers.Serializer):
            password = serializers.CharField(write_only=True, min_length=6)

        teacher = self.get_object()
        serializer = _SetPassword(data=request.data)
        serializer.is_valid(raise_exception=True)
        teacher.user.set_password(serializer.validated_data['password'])
        teacher.user.save(update_fields=['password'])
        return Response({'success': True, 'message': 'Password updated.'})


class TeacherSubjectAssignmentViewSet(HODScopedQuerysetMixin, HODDepartmentWriteMixin, viewsets.ModelViewSet):
    """
    Teacher <-> Subject assignment CRUD (Priority 8, Phase D).

    Permissions:
      - Admin: full access.
      - HOD: full CRUD, restricted to assignments where the teacher
        belongs to their OWN department (also cross-checked against the
        subject's department in the serializer, since a valid assignment
        requires both sides to match).
      - Any other authenticated role: read-only (Timetable creation needs
        to read this to validate teacher-subject combinations).
    """

    queryset = TeacherSubjectAssignment.objects.select_related(
        'teacher', 'teacher__user', 'teacher__department', 'subject', 'subject__course'
    ).all()
    serializer_class = TeacherSubjectAssignmentSerializer
    permission_classes = [IsAdmin | IsHOD | ReadOnly]
    hod_department_lookup = 'teacher__department'
    search_fields = ['teacher__employee_id', 'teacher__user__first_name', 'teacher__user__last_name', 'subject__code', 'subject__name']
    ordering_fields = ['assigned_at']
    filterset_fields = ['teacher', 'subject', 'is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        teacher = params.get('teacher')
        if teacher:
            queryset = queryset.filter(teacher_id=teacher)
        subject = params.get('subject')
        if subject:
            queryset = queryset.filter(subject_id=subject)
        is_active = params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1', 'yes'))
        return queryset

    def perform_create(self, serializer):
        teacher = serializer.validated_data.get('teacher')
        self.assert_department_allowed(teacher.department_id if teacher else None, field_name='teacher')
        serializer.save()

    def perform_update(self, serializer):
        new_teacher = serializer.validated_data.get('teacher')
        if new_teacher is not None:
            self.assert_department_allowed(new_teacher.department_id, field_name='teacher')
        serializer.save()
