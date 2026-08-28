import uuid

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.academic_year.models import AcademicYear
from apps.core.permissions import IsAdmin, IsStaff

from .models import Admission, AdmissionType
from .serializers import AdmissionSerializer


class AdmissionViewSet(viewsets.ModelViewSet):
    """
    Registration/application records.

    Permissions:
      - Anyone (including anonymous visitors): may submit (create) an
        application -- the public /admissions page requires no login,
        matching the existing public Placement/Contact pattern.
      - Admin: full access (edit, delete; the original "Student
        Registration Form" create path).
      - Staff: list/retrieve/update (review + approve/reject + status
        changes) as part of Student Management processing, but cannot
        delete registrations.
    """

    queryset = Admission.objects.select_related('department', 'course', 'academic_year', 'student').all()
    serializer_class = AdmissionSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['application_number', 'first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['application_number', 'admission_date', 'created_at']

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        if self.action == 'destroy':
            return [IsAdmin()]
        return [(IsAdmin | IsStaff)()]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        department = params.get('department')
        if department:
            queryset = queryset.filter(department_id=department)

        admission_status = params.get('admission_status')
        if admission_status:
            queryset = queryset.filter(admission_status=admission_status)

        # Staff Student Management uses this to find registrations that still
        # need a login account created ("Not Created" in the UI).
        account_created = params.get('account_created')
        if account_created is not None:
            wants_created = account_created.lower() in ('true', '1', 'yes')
            if wants_created:
                queryset = queryset.filter(student__isnull=False)
            else:
                queryset = queryset.filter(student__isnull=True)

        return queryset

    @staticmethod
    def _generate_application_number() -> str:
        year = timezone.localdate().year
        for _ in range(20):
            candidate = f"APP{year}{uuid.uuid4().hex[:8].upper()}"
            if not Admission.objects.filter(application_number=candidate).exists():
                return candidate
        # Astronomically unlikely fallback -- still guaranteed unique enough
        # for a hex-in-string collision, kept simple rather than looping
        # forever.
        return f"APP{year}{uuid.uuid4().hex[:12].upper()}"

    def create(self, request, *args, **kwargs):
        """
        Admin's own "Student Registration Form" continues to send every
        field itself and is unaffected. A public, unauthenticated visitor
        only sends what the /admissions page form actually collects (name,
        email, phone, address, department, course) -- this fills in the
        remaining Admin-only fields (application_number, academic_year,
        admission_date, admission_type, previous_school,
        previous_percentage) with sensible defaults ONLY when the client
        omitted them, so no real submitted value is ever overwritten.
        """
        data = request.data.copy()

        if not data.get('application_number'):
            data['application_number'] = self._generate_application_number()
        if not data.get('academic_year'):
            current_year = AcademicYear.objects.filter(is_current=True).first()
            if current_year is not None:
                data['academic_year'] = str(current_year.id)
        if not data.get('admission_date'):
            data['admission_date'] = timezone.localdate().isoformat()
        if not data.get('admission_type'):
            data['admission_type'] = AdmissionType.REGULAR
        if not data.get('previous_school'):
            data['previous_school'] = 'Not specified'
        if not data.get('previous_percentage'):
            data['previous_percentage'] = 0

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
