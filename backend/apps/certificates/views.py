from datetime import date

from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.mixins import StudentScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsStaff, ReadOnly

from .models import Certificate, CertificateStatus
from .serializers import CertificateSerializer


class CertificateViewSet(StudentScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Staff Certificate Management (Priority 11).

    Permissions:
      - Admin: full access.
      - Staff: create/list/retrieve + issue (print-issue) + download.
      - Student: read-only access to ONLY their own certificates
        (StudentScopedQuerysetMixin), never another student's.
      - Any other role: no access.
    """

    queryset = Certificate.objects.select_related('student__user', 'issued_by__user').all()
    serializer_class = CertificateSerializer
    permission_classes = [IsAdmin | IsStaff | ReadOnly]
    student_lookup = 'student'
    search_fields = ['certificate_number', 'certificate_type', 'student__user__first_name', 'student__user__last_name', 'student__admission_number']
    ordering_fields = ['requested_at', 'updated_at', 'status', 'certificate_type']

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        status_param = params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        student = params.get('student')
        if student:
            queryset = queryset.filter(student_id=student)

        return queryset

    def perform_create(self, serializer):
        # issued_by/status/certificate_number are never trusted from the
        # frontend -- the issuing Staff member is always derived from the
        # authenticated request user server-side.
        staff = getattr(self.request.user, 'staff', None)
        serializer.save(issued_by=staff)

    @action(detail=True, methods=['post'], url_path='print-issue')
    def print_issue(self, request, pk=None):
        """Transition a certificate ready -> issued. Staff/Admin only
        (enforced by permission_classes). issued_by is re-derived from the
        authenticated user at issue time so it reflects who actually
        printed/issued it, never a client-supplied value."""
        certificate = self.get_object()
        if certificate.status == CertificateStatus.ISSUED:
            raise ValidationError('This certificate has already been issued.')

        staff = getattr(request.user, 'staff', None)
        certificate.status = CertificateStatus.ISSUED
        certificate.issued_date = date.today()
        if staff is not None:
            certificate.issued_by = staff
        certificate.save(update_fields=['status', 'issued_date', 'issued_by', 'updated_at'])
        return Response(self.get_serializer(certificate).data)

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """Real backend-generated certificate document (no PDF library is
        present in the existing project's requirements.txt, so this uses a
        plain HTML document with a genuine Content-Disposition: attachment
        header -- printable/savable from any browser -- rather than adding
        a new heavy dependency for one feature)."""
        certificate = self.get_object()
        student = certificate.student
        student_name = student.user.get_full_name() if student.user else ''

        html = f"""<!DOCTYPE html>
<html>
<head><meta charset=\"utf-8\"><title>{certificate.certificate_number}</title>
<style>
  body {{ font-family: Georgia, serif; padding: 48px; color: #1e293b; }}
  .cert {{ border: 4px double #1e293b; padding: 40px; text-align: center; }}
  h1 {{ letter-spacing: 2px; text-transform: uppercase; font-size: 22px; }}
  .num {{ color: #64748b; font-size: 12px; margin-top: -8px; }}
  .body {{ margin: 32px 0; font-size: 16px; line-height: 1.8; }}
  .row {{ display: flex; justify-content: space-between; margin-top: 40px; font-size: 13px; color: #475569; }}
</style>
</head>
<body>
  <div class=\"cert\">
    <h1>{certificate.get_certificate_type_display()} Certificate</h1>
    <div class=\"num\">Certificate No: {certificate.certificate_number}</div>
    <div class=\"body\">
      This is to certify that <strong>{student_name}</strong>
      (Admission No: {student.admission_number}) is a bona fide record held by
      the institution, issued as a <strong>{certificate.get_certificate_type_display()}</strong> certificate.
    </div>
    <div class=\"row\">
      <span>Status: {certificate.get_status_display()}</span>
      <span>Issued Date: {certificate.issued_date or '—'}</span>
    </div>
  </div>
</body>
</html>"""

        response = HttpResponse(html, content_type='text/html')
        response['Content-Disposition'] = f'attachment; filename="{certificate.certificate_number}.html"'
        return response
