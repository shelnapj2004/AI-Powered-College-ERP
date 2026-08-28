from django.db.models import Avg, Count, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.adminpanel.mixins import AuditLogMixin
from apps.attendance.models import AttendanceRecord, AttendanceStatus
from apps.core.permissions import IsAdmin, IsHOD, IsInternalUser, IsStaff, ReadOnly
from apps.courses.models import Course
from apps.examinations.models import SemesterResult
from apps.placements.models import ApplicationStatus, PlacementApplication
from apps.research.models import ResearchProject
from apps.students.models import Student
from apps.subjects.models import Subject
from apps.teachers.models import Teacher

from .models import HOD
from .serializers import HODSerializer, HODSetPasswordSerializer


class HODViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    HOD CRUD.

    Permissions:
      - Admin: full access.
      - Staff: create/update/activate-deactivate/reset-password (Staff HOD
        Management), matching Student/Teacher Management's operational scope.
      - Any other authenticated role: read-only.
    """

    queryset = HOD.objects.select_related('user', 'teacher', 'teacher__user', 'department').all()
    serializer_class = HODSerializer
    permission_classes = [IsAdmin | IsStaff | ReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['teacher__employee_id', 'teacher__user__first_name', 'teacher__user__last_name', 'office_location']
    ordering_fields = ['appointment_date', 'created_at']

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

    def get_permissions(self):
        if self.action == 'me':
            return [IsInternalUser()]
        if self.action == 'analytics':
            return [(IsAdmin | IsHOD)()]
        return super().get_permissions()

    def _get_own_hod(self, request):
        """Resolves the logged-in HOD's own department-scoped profile. Never
        trusts a client-supplied department id -- HOD Phase 2."""
        if request.user.is_superuser or request.user.role == 'admin':
            return None
        hod = HOD.objects.select_related('department').filter(user=request.user, is_active=True).first()
        if hod is None:
            raise PermissionDenied('No active HOD profile linked to this account.')
        return hod

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """
        Returns the logged-in HOD's OWN profile (with department_detail),
        derived from the authenticated user -- never from a client-supplied
        id. Used by HODDashboard so it never hardcodes a department/name
        (HOD Phase 1).
        """
        hod = HOD.objects.select_related('user', 'teacher', 'teacher__user', 'department').filter(
            user=request.user
        ).first()
        if hod is None:
            raise NotFound('No HOD profile linked to this account.')
        return Response(HODSerializer(hod).data)

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        """
        Real-time department analytics for the logged-in HOD, computed via
        ORM aggregation -- never hardcoded (HOD Phase 4). Scoped strictly
        to HOD.department; an HOD can never pull another department's
        numbers by passing a department query param (there is none).
        """
        hod = self._get_own_hod(request)
        department_id = hod.department_id if hod is not None else request.query_params.get('department')
        if department_id is None:
            raise PermissionDenied('A department is required for analytics.')

        teachers_qs = Teacher.objects.filter(department_id=department_id)
        students_qs = Student.objects.filter(department_id=department_id)
        courses_qs = Course.objects.filter(department_id=department_id)
        subjects_qs = Subject.objects.filter(course__department_id=department_id)

        attendance_agg = AttendanceRecord.objects.filter(
            attendance_session__timetable__department_id=department_id
        ).aggregate(
            total=Count('id'),
            present=Count('id', filter=Q(status=AttendanceStatus.PRESENT)),
        )
        total_attendance = attendance_agg['total'] or 0
        present_attendance = attendance_agg['present'] or 0
        avg_attendance_pct = round((present_attendance / total_attendance) * 100, 1) if total_attendance else None

        results_agg = SemesterResult.objects.filter(student__department_id=department_id).aggregate(
            avg_sgpa=Avg('sgpa'),
            avg_cgpa=Avg('cgpa'),
            count=Count('id'),
        )

        research_agg = ResearchProject.objects.filter(department_id=department_id).aggregate(
            total_projects=Count('id'),
            ongoing_projects=Count('id', filter=Q(status='ongoing')),
        )

        placement_agg = PlacementApplication.objects.filter(student__department_id=department_id).aggregate(
            total_applications=Count('id'),
            selected=Count('id', filter=Q(status=ApplicationStatus.SELECTED)),
        )
        total_placement_apps = placement_agg['total_applications'] or 0
        selected_count = placement_agg['selected'] or 0
        placement_rate_pct = round((selected_count / total_placement_apps) * 100, 1) if total_placement_apps else None

        return Response({
            'department': str(department_id),
            'faculty_count': teachers_qs.count(),
            'student_count': students_qs.count(),
            'course_count': courses_qs.count(),
            'subject_count': subjects_qs.count(),
            'attendance': {
                'total_records': total_attendance,
                'present_records': present_attendance,
                'avg_attendance_pct': avg_attendance_pct,
            },
            'results': {
                'result_count': results_agg['count'] or 0,
                'avg_sgpa': round(results_agg['avg_sgpa'], 2) if results_agg['avg_sgpa'] is not None else None,
                'avg_cgpa': round(results_agg['avg_cgpa'], 2) if results_agg['avg_cgpa'] is not None else None,
            },
            'research': {
                'total_projects': research_agg['total_projects'] or 0,
                'ongoing_projects': research_agg['ongoing_projects'] or 0,
            },
            'placements': {
                'total_applications': total_placement_apps,
                'selected': selected_count,
                'placement_rate_pct': placement_rate_pct,
            },
        })

    @action(detail=True, methods=['post'], url_path='set-password')
    def set_password(self, request, pk=None):
        """Staff/Admin resets an HOD's password. Plaintext is never stored or returned."""
        hod = self.get_object()
        serializer = HODSetPasswordSerializer(data=request.data, context={'hod': hod})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'success': True, 'message': 'Password updated.'})
