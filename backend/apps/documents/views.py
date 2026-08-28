from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.accounts.models import UserRole
from apps.adminpanel.mixins import AuditLogMixin
from apps.core.mixins import StudentOwnedWriteMixin
from apps.core.permissions import IsAdmin, IsStaff, IsStudent, ReadOnly
from apps.students.models import Student

from .models import DocumentStatus, StudentDocument, build_required_document_status
from .serializers import StudentDocumentSerializer


class StudentDocumentViewSet(StudentOwnedWriteMixin, AuditLogMixin, viewsets.ModelViewSet):
    """
    Student document verification records.

    Permissions:
      - Admin/Staff: full access (list, retrieve, verify/reject, see every
        student's documents).
      - Student: may upload (create) and view ONLY their own documents --
        never another student's, and never able to set status/verified_by
        directly.
      - Any other authenticated role: read-only.

    Verification is a dedicated action rather than a raw PATCH on `status`
    so `verified_by` is always taken from the authenticated request user,
    never trusted from the frontend.
    """

    queryset = StudentDocument.objects.select_related('student__user', 'verified_by').all()
    serializer_class = StudentDocumentSerializer
    permission_classes = [IsAdmin | IsStaff | IsStudent | ReadOnly]
    search_fields = ['document_type', 'student__user__first_name', 'student__user__last_name', 'student__admission_number']
    ordering_fields = ['requested_at', 'updated_at', 'status']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # A Student may only ever see their own uploaded documents -- never
        # another student's, regardless of what `student` query param is
        # passed. Staff/Admin (and any other role, gated by ReadOnly) keep
        # full visibility.
        if user.is_authenticated and user.role == UserRole.STUDENT:
            student = getattr(user, 'student', None)
            if student is None:
                return queryset.none()
            return queryset.filter(student=student)

        params = self.request.query_params

        status_param = params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        student = params.get('student')
        if student:
            queryset = queryset.filter(student_id=student)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRole.STUDENT:
            # Student identity comes from the authenticated account, never
            # from the request body -- prevents uploading on another
            # student's behalf and prevents setting status on creation.
            student = self.get_request_student()
            serializer.save(student=student, status=DocumentStatus.PENDING, verified_by=None)
            return
        # Staff/Admin uploading on behalf of a student must still supply
        # `student` explicitly -- it's optional at the serializer level
        # only so Students aren't forced to send it.
        if not serializer.validated_data.get('student'):
            raise ValidationError({'student': 'This field is required.'})
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if user.role == UserRole.STUDENT:
            # Students may view their upload but not edit it directly --
            # the existing backend has no re-upload/edit workflow to expose
            # beyond the verify/reject actions staff perform.
            raise PermissionDenied('You may not modify a submitted document.')
        serializer.save()

    def _assert_can_verify(self, request):
        """
        Staff/Admin only. The class-level `permission_classes` (IsAdmin |
        IsStaff | IsStudent | ReadOnly) intentionally allow a Student
        through for list/retrieve/create of their OWN documents -- but that
        same combinator would also let a Student call verify/reject on
        their own document (get_queryset already scopes it to "their own").
        Phase 8 explicitly forbids a Student verifying/rejecting their own
        upload, so that check has to happen here, per-action.
        """
        user = request.user
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.STAFF):
            return
        raise PermissionDenied('Only Staff/Admin may verify or reject documents.')

    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None):
        """Mark a document Verified. Staff/Admin only."""
        self._assert_can_verify(request)
        document = self.get_object()
        document.status = DocumentStatus.VERIFIED
        document.verified_by = request.user
        document.save(update_fields=['status', 'verified_by', 'updated_at'])
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Mark a document Rejected. Staff/Admin only."""
        self._assert_can_verify(request)
        document = self.get_object()
        document.status = DocumentStatus.REJECTED
        document.verified_by = request.user
        document.save(update_fields=['status', 'verified_by', 'updated_at'])
        return Response(self.get_serializer(document).data)

    @action(detail=False, methods=['get'], url_path='required-status')
    def required_status(self, request):
        """
        Priority 14 -- authoritative mandatory-document completion status
        (Birth Certificate / SSLC Result Card / Plus Two Result Card).

        - Student: always their own status (`student` query param ignored).
        - Staff/Admin + `?student=<id>`: that one student's status.
        - Staff/Admin, no `student` param: a status summary for every
          student, so Staff can identify students with missing/pending/
          rejected mandatory documents, not just ones who already uploaded
          something (Phase 3).
        """
        user = request.user

        if user.role == UserRole.STUDENT:
            student = getattr(user, 'student', None)
            if student is None:
                raise PermissionDenied('No student profile linked to this account.')
            return Response(build_required_document_status(student, request))

        student_id = request.query_params.get('student')
        if student_id:
            try:
                student = Student.objects.select_related('user').get(pk=student_id)
            except Student.DoesNotExist:
                raise NotFound('Student not found.')
            return Response(build_required_document_status(student, request))

        summaries = []
        for student in Student.objects.select_related('user').all():
            summary = build_required_document_status(student, request)
            summary['student_id'] = str(student.id)
            summary['student_name'] = student.user.get_full_name()
            summary['admission_number'] = student.admission_number
            summaries.append(summary)
        return Response(summaries)
