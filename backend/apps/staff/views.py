from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.adminpanel.mixins import AuditLogMixin
from apps.core.permissions import IsAdmin, ReadOnly

from .models import Staff
from .serializers import StaffSerializer


class StaffViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    Staff-account CRUD (i.e. managing the ERP operators themselves).

    Deliberately Admin-only for write access: Staff members administer
    Students/Teachers/HODs (see students/teachers/hod apps), but per the
    project brief Staff must NOT have unrestricted Admin privileges, and
    provisioning new Staff logins is an Admin-level responsibility.
    Any authenticated user can read the list (e.g. Staff viewing colleagues).
    """

    queryset = Staff.objects.select_related('user', 'department').all()
    serializer_class = StaffSerializer
    permission_classes = [IsAdmin | ReadOnly]
    audit_resource = 'Staff'
    search_fields = ['employee_id', 'user__first_name', 'user__last_name', 'designation']
    ordering_fields = ['employee_id', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        department = params.get('department')
        if department:
            queryset = queryset.filter(department_id=department)
        is_active = params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1', 'yes'))
        return queryset

    @action(detail=True, methods=['post'], url_path='set-password', permission_classes=[IsAdmin])
    def set_password(self, request, pk=None):
        from rest_framework import serializers

        class _SetPassword(serializers.Serializer):
            password = serializers.CharField(write_only=True, min_length=6)

        staff = self.get_object()
        serializer = _SetPassword(data=request.data)
        serializer.is_valid(raise_exception=True)
        staff.user.set_password(serializer.validated_data['password'])
        staff.user.save(update_fields=['password'])
        return Response({'success': True, 'message': 'Password updated.'})
