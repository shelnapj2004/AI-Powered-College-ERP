from decimal import Decimal

from django.db.models import Sum
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.adminpanel.mixins import AuditLogMixin
from apps.core.mixins import StudentScopedQuerysetMixin
from apps.core.permissions import IsAdmin, IsStaff, ReadOnly
from apps.students.models import Student
from .models import FeeStructure, FeePayment
from .serializers import FeeStructureSerializer, FeePaymentSerializer
from .services import ensure_fee_structures_for_all_semesters


class FeeStructureViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """Fee structures are Admin-managed; everyone else reads (course/year/semester fee schedule).

    Problem 2 self-heal: a post_save signal on Semester (apps/finance/
    signals.py) provisions the tuition/exam/event FeeStructure rows going
    forward, but any Semester created before that signal existed would
    otherwise stay unbacked. list() bootstraps -- idempotent, cheap
    get_or_create only -- so Staff Issue Fee's dropdown is never empty as
    long as real Semester rows exist, regardless of when they were
    created relative to migrations/signal wiring.
    """

    queryset = FeeStructure.objects.select_related('course', 'academic_year').all()
    serializer_class = FeeStructureSerializer
    permission_classes = [IsAdmin | ReadOnly]
    search_fields = ['course__name', 'academic_year__name']
    ordering_fields = ['course', 'academic_year', 'semester_number', 'total_fee', 'created_at', 'fee_type']
    filterset_fields = ['course', 'academic_year', 'semester_number', 'is_active', 'fee_type']

    def list(self, request, *args, **kwargs):
        ensure_fee_structures_for_all_semesters()
        return super().list(request, *args, **kwargs)


class FeePaymentViewSet(AuditLogMixin, StudentScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Admin/Staff manage payment records (Priority 11: Staff can now issue/
    assign a due fee to a Student from Staff Fee Management). A Student
    gets READ-ONLY access to ONLY their own payment records -- never
    another student's (Student Phase 1J). Write access is Admin/Staff only
    (ReadOnly denies students any create/update/delete).
    """

    queryset = FeePayment.objects.select_related('student', 'fee_structure').all()
    serializer_class = FeePaymentSerializer
    permission_classes = [IsAdmin | IsStaff | ReadOnly]
    student_lookup = 'student'
    search_fields = ['student__admission_number', 'student__user__first_name', 'student__user__last_name', 'transaction_reference']
    ordering_fields = ['payment_date', 'amount_paid', 'payment_status', 'created_at', 'student']
    filterset_fields = ['student', 'fee_structure', 'payment_status', 'payment_method']


class FeeSummaryView(APIView):
    """
    Admin Fee Management summary: one row per Student who has at least one
    FeePayment record, with totals aggregated server-side (Django ORM) from
    the real FeeStructure/FeePayment tables. No fake/fallback rows -- a
    Student with no FeePayment records simply does not appear here.

    Total   = sum of total_fee for every distinct FeeStructure the student
              has been billed against (i.e. has a FeePayment referencing it).
    Paid    = sum of amount_paid across all of the student's FeePayments.
    Pending = Total - Paid (floored at 0).
    Status  = 'cleared' if fully paid, 'partial' if something paid but not
              fully, 'overdue' if nothing paid yet.
    """

    permission_classes = [IsAdmin | IsStaff]

    def get(self, request):
        student_ids = FeePayment.objects.values_list('student', flat=True).distinct()
        students = (
            Student.objects.filter(id__in=student_ids)
            .select_related('user', 'department')
        )

        search = request.query_params.get('search', '').strip().lower()

        rows = []
        for student in students:
            full_name = student.user.get_full_name() if student.user else ''
            if search and search not in full_name.lower() and search not in (student.admission_number or '').lower():
                continue

            payments = FeePayment.objects.filter(student=student)
            fee_structure_ids = payments.values_list('fee_structure', flat=True).distinct()
            total = FeeStructure.objects.filter(id__in=fee_structure_ids).aggregate(
                t=Sum('total_fee')
            )['t'] or Decimal('0')
            paid = payments.aggregate(p=Sum('amount_paid'))['p'] or Decimal('0')
            pending = total - paid
            if pending < 0:
                pending = Decimal('0')

            if pending <= 0 and paid > 0:
                status = 'cleared'
            elif paid > 0:
                status = 'partial'
            else:
                status = 'overdue'

            rows.append({
                'student_id': str(student.id),
                'admission_number': student.admission_number,
                'name': full_name,
                'department': student.department.code if student.department_id else '',
                'total': str(total),
                'paid': str(paid),
                'pending': str(pending),
                'status': status,
            })

        return Response(rows)
