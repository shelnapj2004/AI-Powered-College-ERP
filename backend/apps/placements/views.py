from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from apps.accounts.models import UserRole
from apps.adminpanel.mixins import AuditLogMixin
from apps.core.mixins import HODScopedQuerysetMixin, StudentOwnedWriteMixin, StudentScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsStudent, ReadOnly
from .models import ApplicationStatus, PlacementDrive, PlacementApplication
from .serializers import PlacementDriveSerializer, PlacementApplicationSerializer


class PlacementDriveViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = PlacementDrive.objects.all()
    serializer_class = PlacementDriveSerializer
    permission_classes = [IsAdmin | ReadOnly]
    search_fields = ['company_name', 'job_title', 'location']
    ordering_fields = ['company_name', 'drive_date', 'application_deadline', 'created_at']
    filterset_fields = ['employment_type', 'is_active']


class PlacementApplicationViewSet(StudentScopedQuerysetMixin, HODScopedQuerysetMixin, StudentOwnedWriteMixin, AuditLogMixin, viewsets.ModelViewSet):
    """
    Admin/HOD manage all applications for their scope (existing behaviour,
    unchanged). A Student may additionally apply to a drive (create) and
    view ONLY their own applications -- never another student's, and never
    able to set status/remarks directly (Priority 7 Phase A).
    """

    queryset = PlacementApplication.objects.all()
    serializer_class = PlacementApplicationSerializer
    permission_classes = [IsAdmin | IsStudent | ReadOnly]
    search_fields = ['student__admission_number', 'student__roll_number', 'student__user__first_name', 'student__user__last_name']
    ordering_fields = ['applied_at', 'status']
    hod_department_lookup = 'student__department'
    student_lookup = 'student'

    def get_queryset(self):
        queryset = super().get_queryset()
        placement_drive_id = self.request.query_params.get('placement_drive')
        student_id = self.request.query_params.get('student')
        status_param = self.request.query_params.get('status')

        if placement_drive_id:
            queryset = queryset.filter(placement_drive_id=placement_drive_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRole.STUDENT:
            student = self.get_request_student()
            # Student identity comes from the authenticated account, never
            # from the request body -- prevents applying on another
            # student's behalf and prevents setting status on creation.
            serializer.save(student=student, status=ApplicationStatus.APPLIED, remarks='')
            return
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if user.role == UserRole.STUDENT:
            # Students may view but not edit a submitted application; the
            # existing backend has no withdraw/edit workflow to expose.
            raise PermissionDenied('You may not modify a submitted application.')
        serializer.save()
