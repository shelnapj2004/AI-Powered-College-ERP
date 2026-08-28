from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.accounts.models import UserRole
from apps.core.mixins import StudentOwnedWriteMixin, StudentScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsInternalUser, IsStudent
from .models import LeaveApplicantType, LeaveRequest, LeaveStatus
from .serializers import LeaveRequestSerializer


class LeaveRequestViewSet(StudentScopedQuerysetMixin, StudentOwnedWriteMixin, viewsets.ModelViewSet):
    """
    Minimum real API for the existing LeaveRequest model (Student Phase
    1J). Admin/HOD/Staff review and approve. A Student may create their
    own leave request and view ONLY their own -- never another student's,
    and never able to set status/approval fields directly.
    """

    queryset = LeaveRequest.objects.select_related('student', 'teacher', 'staff', 'approved_by').all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsInternalUser]
    student_lookup = 'student'
    search_fields = ['reason', 'student__admission_number']
    ordering_fields = ['start_date', 'end_date', 'status', 'created_at']
    filterset_fields = ['applicant_type', 'student', 'teacher', 'staff', 'status']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        # Teacher sees their OWN leave history plus student leave requests
        # from their own department -- teachers act as first-line approver
        # for their department's students (Priority 4).
        if user.is_authenticated and not user.is_superuser and user.role == UserRole.TEACHER:
            teacher = getattr(user, 'teacher', None)
            if not teacher:
                return queryset.none()
            queryset = queryset.filter(
                Q(teacher=teacher)
                | Q(applicant_type=LeaveApplicantType.STUDENT, student__department_id=teacher.department_id)
            )
        elif user.is_authenticated and not user.is_superuser and user.role == UserRole.STAFF:
            staff = getattr(user, 'staff', None)
            queryset = queryset.filter(staff=staff) if staff else queryset.none()
        return queryset

    def _assert_can_decide(self, user, leave_request):
        """Backend-enforced authorization for approve/reject -- never trust
        a role/department implied by the frontend."""
        if user.is_superuser or user.role == UserRole.ADMIN:
            return
        if user.role == UserRole.HOD:
            hod = getattr(user, 'hod_profile', None)
            applicant_department_id = (
                leave_request.student.department_id if leave_request.student
                else leave_request.teacher.department_id if leave_request.teacher
                else None
            )
            if not hod or not hod.is_active or applicant_department_id != hod.department_id:
                raise PermissionDenied('You may only decide on leave requests within your department.')
            return
        if user.role == UserRole.TEACHER:
            teacher = getattr(user, 'teacher', None)
            if (
                not teacher
                or leave_request.applicant_type != LeaveApplicantType.STUDENT
                or leave_request.student is None
                or leave_request.student.department_id != teacher.department_id
            ):
                raise PermissionDenied('You may only decide on leave requests from students in your department.')
            return
        raise PermissionDenied('You are not authorized to decide on leave requests.')

    @action(detail=True, methods=['post'], url_path='decision')
    def decision(self, request, pk=None):
        """Approve or reject a leave request. Persists to the database and
        records who decided and when -- the frontend never sets status
        directly (see serializer read_only_fields / perform_update above)."""
        leave_request = self.get_object()
        new_status = request.data.get('status')
        if new_status not in (LeaveStatus.APPROVED, LeaveStatus.REJECTED):
            raise ValidationError({'status': "status must be 'approved' or 'rejected'."})

        self._assert_can_decide(request.user, leave_request)

        leave_request.status = new_status
        leave_request.approved_by = request.user
        leave_request.approved_at = timezone.now()
        remarks = request.data.get('remarks')
        if remarks is not None:
            leave_request.remarks = remarks
        leave_request.save(update_fields=['status', 'approved_by', 'approved_at', 'remarks', 'updated_at'])
        return Response(self.get_serializer(leave_request).data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRole.STUDENT:
            student = self.get_request_student()
            serializer.save(applicant_type=LeaveApplicantType.STUDENT, student=student, teacher=None, staff=None)
            return
        if user.role == UserRole.TEACHER:
            teacher = getattr(user, 'teacher', None)
            if teacher is None:
                raise PermissionDenied('No teacher profile linked to this account.')
            serializer.save(applicant_type=LeaveApplicantType.TEACHER, teacher=teacher, student=None, staff=None)
            return
        if user.role == UserRole.STAFF:
            staff = getattr(user, 'staff', None)
            if staff is None:
                raise PermissionDenied('No staff profile linked to this account.')
            serializer.save(applicant_type=LeaveApplicantType.STAFF, staff=staff, student=None, teacher=None)
            return
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if user.role in (UserRole.STUDENT, UserRole.TEACHER, UserRole.STAFF):
            # Applicants may not edit their own request once submitted
            # (status/approval is an Admin/HOD decision, not modelled here
            # beyond the existing status/approved_by/approved_at fields).
            raise PermissionDenied('You may not modify a submitted leave request.')
        serializer.save()
