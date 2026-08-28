from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.models import UserRole
from apps.adminpanel.mixins import AuditLogMixin
from apps.core.mixins import HODScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsHOD, ReadOnly
from .models import ApprovalStatus, ResearchProject, ResearchMember
from .serializers import ResearchProjectSerializer, ResearchMemberSerializer, PublicResearchProjectSerializer


class ResearchProjectViewSet(HODScopedQuerysetMixin, AuditLogMixin, viewsets.ModelViewSet):
    """
    HOD creates/submits a research project for their OWN department (forced
    server-side, never trusted from the client) -- it is saved as pending.
    Admin sees all and explicitly approves/reject via dedicated actions
    (Problem 1). Any other authenticated user gets read access via
    ReadOnly, still scoped to their own department by
    HODScopedQuerysetMixin when applicable.
    """

    queryset = ResearchProject.objects.select_related('department', 'principal_investigator__user', 'reviewed_by').all()
    serializer_class = ResearchProjectSerializer
    permission_classes = [IsAdmin | IsHOD | ReadOnly]
    search_fields = ['title', 'description', 'funding_agency', 'principal_investigator__user__first_name', 'principal_investigator__user__last_name']
    ordering_fields = ['title', 'start_date', 'end_date', 'status', 'created_at', 'department', 'principal_investigator']
    filterset_fields = ['department', 'principal_investigator', 'status', 'is_active', 'approval_status']
    hod_department_lookup = 'department'

    def _get_request_hod(self):
        user = self.request.user
        if user.role == UserRole.HOD:
            hod = getattr(user, 'hod_profile', None)
            if hod is None or not hod.is_active:
                raise PermissionDenied('No active HOD profile linked to this account.')
            return hod
        return None

    def perform_create(self, serializer):
        hod = self._get_request_hod()
        if hod is not None:
            # Department and Principal Investigator are derived from the
            # authenticated HOD's own profile -- a HOD can never submit a
            # project for another department or under another teacher's
            # name (Problem 1). Always starts pending, regardless of what
            # the client sent (approval_status is read-only on the
            # serializer anyway).
            serializer.save(
                department=hod.department,
                principal_investigator=hod.teacher,
                approval_status=ApprovalStatus.PENDING,
            )
            return
        # No non-HOD create path exists in the frontend (Admin only reads
        # / approves / rejects research). department and
        # principal_investigator are required, non-null FKs and are now
        # read-only on the serializer, so refuse rather than let this hit
        # an IntegrityError.
        raise PermissionDenied('Only an HOD can submit a new research project.')

    def perform_update(self, serializer):
        hod = self._get_request_hod()
        if hod is not None:
            # A HOD editing their own (still-pending) project may not move
            # it to another department or reset its approval outcome.
            serializer.save(department=hod.department, approval_status=serializer.instance.approval_status)
            return
        serializer.save()

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role == UserRole.ADMIN):
            raise PermissionDenied('Only Admin can approve research projects.')
        project = self.get_object()
        project.approval_status = ApprovalStatus.APPROVED
        project.reviewed_by = request.user
        project.reviewed_at = timezone.now()
        project.save(update_fields=['approval_status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return Response(self.get_serializer(project).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role == UserRole.ADMIN):
            raise PermissionDenied('Only Admin can reject research projects.')
        project = self.get_object()
        project.approval_status = ApprovalStatus.REJECTED
        project.reviewed_by = request.user
        project.reviewed_at = timezone.now()
        project.save(update_fields=['approval_status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return Response(self.get_serializer(project).data)


class PublicResearchProjectListView(ListAPIView):
    """
    Unauthenticated public-website endpoint (Problem 1). Only ever returns
    approved + active projects -- pending/rejected projects are never
    exposed here regardless of query params.
    """
    serializer_class = PublicResearchProjectSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return ResearchProject.objects.select_related('department', 'principal_investigator__user').filter(
            approval_status=ApprovalStatus.APPROVED, is_active=True
        ).order_by('-start_date')


class ResearchMemberViewSet(HODScopedQuerysetMixin, AuditLogMixin, viewsets.ModelViewSet):
    queryset = ResearchMember.objects.all()
    serializer_class = ResearchMemberSerializer
    permission_classes = [IsAdmin | ReadOnly]
    search_fields = ['teacher__user__first_name', 'teacher__user__last_name', 'research_project__title']
    ordering_fields = ['joined_at', 'role', 'created_at', 'research_project', 'teacher']
    filterset_fields = ['research_project', 'teacher', 'role']
    hod_department_lookup = 'research_project__department'

