from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from apps.core.mixins import StudentScopedQuerysetMixin, StudentOwnedWriteMixin
from apps.core.permissions import IsAdmin, IsStaff, IsStudent, ReadOnly
from .models import Scholarship, ScholarshipApplication
from .serializers import ScholarshipSerializer, ScholarshipApplicationSerializer


class ScholarshipViewSet(viewsets.ModelViewSet):
    """Scholarship catalog. Admin/Staff manage (Priority 11: Staff can now
    add scholarships from Staff Scholarship Management); everyone else
    reads (unchanged)."""

    queryset = Scholarship.objects.all()
    serializer_class = ScholarshipSerializer
    permission_classes = [IsAdmin | IsStaff | ReadOnly]
    search_fields = ['name', 'provider', 'scholarship_type']
    ordering_fields = ['name', 'scholarship_type', 'provider', 'amount', 'application_deadline', 'is_active', 'created_at']
    filterset_fields = ['scholarship_type', 'is_active']


class ScholarshipApplicationViewSet(StudentScopedQuerysetMixin, StudentOwnedWriteMixin, viewsets.ModelViewSet):
    """
    Admin/Staff manage/review all applications (Staff may approve/reject,
    same as Admin). A Student may apply (create) and view ONLY their own
    applications -- never another student's, and never able to set their
    own status/remarks (Student Phase 1J).
    """

    queryset = ScholarshipApplication.objects.select_related('scholarship', 'student').all()
    serializer_class = ScholarshipApplicationSerializer
    permission_classes = [IsAdmin | IsStaff | IsStudent | ReadOnly]
    student_lookup = 'student'
    search_fields = ['scholarship__name', 'student__user__first_name', 'student__user__last_name', 'status']
    ordering_fields = ['status', 'applied_at', 'created_at', 'scholarship', 'student']
    filterset_fields = ['scholarship', 'student', 'status']

    def perform_create(self, serializer):
        student = self.get_request_student()
        if student is not None:
            # Student applies under their own identity only; status/remarks
            # (review outcome) are Admin-only and default on the model.
            serializer.save(student=student)
        else:
            serializer.save()

    def perform_update(self, serializer):
        student = self.get_request_student()
        if student is not None:
            raise PermissionDenied('You may not modify a submitted application.')
        serializer.save()
