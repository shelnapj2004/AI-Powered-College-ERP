from django.db.models import Count, Q, Sum
from django.db.models.functions import ExtractYear, TruncMonth
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, UserRole
from apps.adminpanel.mixins import _client_ip
from apps.adminpanel.models import AuditLog
from apps.adminpanel.serializers import (
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    AuditLogSerializer,
    ChangeRoleSerializer,
    SetPasswordSerializer,
)
from apps.core.pagination import StandardResultsPagination
from apps.core.permissions import IsAdmin


def _log(request, action_type, resource, resource_id="", description=""):
    user = request.user if request.user.is_authenticated else None
    AuditLog.objects.create(
        user=user,
        user_display=f"{user.username} ({user.role})" if user else "system",
        action=action_type,
        resource=resource,
        resource_id=str(resource_id),
        description=description,
        ip_address=_client_ip(request),
    )


class AdminUserViewSet(viewsets.ModelViewSet):
    """Admin-only user management over apps.accounts.User.

    Generic PATCH only touches profile fields (see AdminUserUpdateSerializer);
    role changes and password resets go through their own audited actions.
    No create/delete here — accounts are created by the owning domain flow
    (Admission -> Staff creates Student; Admin creates Staff/Teacher via
    those apps) and are deactivated, not deleted, to preserve FK history.
    """

    permission_classes = [IsAdmin]
    pagination_class = StandardResultsPagination
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        qs = User.objects.all().order_by("-date_joined")
        params = self.request.query_params
        role = params.get("role")
        if role:
            qs = qs.filter(role=role)
        is_active = params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ("1", "true", "yes"))
        search = params.get("search")
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(employee_id__icontains=search)
                | Q(student_id__icontains=search)
            )
        return qs

    def get_serializer_class(self):
        if self.action in ("update", "partial_update"):
            return AdminUserUpdateSerializer
        return AdminUserSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        _log(self.request, AuditLog.Action.UPDATE, "User", instance.pk, "Profile updated")

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active"])
        _log(request, AuditLog.Action.ACTIVATE, "User", user.pk)
        return Response(AdminUserSerializer(user).data)

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        user = self.get_object()
        if user.pk == request.user.pk:
            raise PermissionDenied("You cannot deactivate your own account.")
        user.is_active = False
        user.save(update_fields=["is_active"])
        _log(request, AuditLog.Action.DEACTIVATE, "User", user.pk)
        return Response(AdminUserSerializer(user).data)

    @action(detail=True, methods=["post"], url_path="set-password")
    def set_password(self, request, pk=None):
        user = self.get_object()
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        _log(request, AuditLog.Action.PASSWORD_RESET, "User", user.pk)
        return Response({"success": True, "message": "Password updated."})

    @action(detail=True, methods=["post"], url_path="change-role")
    def change_role(self, request, pk=None):
        """Admin-only role change. Backend-enforced: only an authenticated
        Admin (IsAdmin on the whole viewset) can reach this at all, and an
        admin may not change their own role (no self-demotion / accidental
        lockout). No other role can promote itself — RoleRequired denies
        non-admins before this method ever runs.
        """
        user = self.get_object()
        if user.pk == request.user.pk:
            raise PermissionDenied("You cannot change your own role.")
        serializer = ChangeRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        old_role = user.role
        user.role = serializer.validated_data["role"]
        user.save(update_fields=["role"])
        _log(
            request, AuditLog.Action.ROLE_CHANGE, "User", user.pk,
            f"{old_role} -> {user.role}",
        )
        return Response(AdminUserSerializer(user).data)


class RolesView(APIView):
    """GET /api/v1/admin/roles/ — real role list + live user counts per role.

    Role definitions themselves come from the backend's actual
    accounts.UserRole enum (the single source of truth also used by
    RoleRequired permission classes) — not a separately maintained list.
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        counts = dict(
            User.objects.values_list("role").annotate(c=Count("id")).values_list("role", "c")
        )
        roles = [
            {
                "value": value,
                "label": label,
                "user_count": counts.get(value, 0),
            }
            for value, label in UserRole.choices
        ]
        return Response({"success": True, "results": roles})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only. Admin-only. Logs are written by AuditLogMixin / _log()
    calls elsewhere — this endpoint never accepts writes."""

    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        qs = AuditLog.objects.select_related("user").all()
        params = self.request.query_params
        action_f = params.get("action")
        if action_f:
            qs = qs.filter(action=action_f)
        resource = params.get("resource")
        if resource:
            qs = qs.filter(resource__iexact=resource)
        user_id = params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
        date_from = params.get("date_from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        date_to = params.get("date_to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs


class AdminAnalyticsView(APIView):
    """GET /api/v1/admin/analytics/ — real Django ORM aggregates.

    Every field here is computed from actual rows at request time. A metric
    is included only when a real backing model/field exists; nothing is
    hardcoded or estimated.
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        from apps.students.models import Student
        from apps.teachers.models import Teacher
        from apps.staff.models import Staff
        from apps.hod.models import HOD
        from apps.departments.models import Department
        from apps.courses.models import Course

        data = {
            "totals": {
                "students": Student.objects.count(),
                "active_students": Student.objects.filter(is_active=True).count(),
                "teachers": Teacher.objects.count(),
                "active_teachers": Teacher.objects.filter(is_active=True).count(),
                "staff": Staff.objects.count(),
                "active_staff": Staff.objects.filter(is_active=True).count(),
                "hods": HOD.objects.count(),
                "departments": Department.objects.filter(is_active=True).count(),
                "courses": Course.objects.filter(is_active=True).count(),
            },
            "department_wise_students": list(
                Student.objects.filter(is_active=True)
                .values("department__name")
                .annotate(count=Count("id"))
                .order_by("-count")
            ),
            "course_wise_students": list(
                Student.objects.filter(is_active=True)
                .values("course__name")
                .annotate(count=Count("id"))
                .order_by("-count")
            ),
            # Real enrollment trend -- students grouped by their actual
            # admission year (Student.admission_date), not an estimate.
            "enrollment_trend": [
                {"year": row["year"], "students": row["count"]}
                for row in (
                    Student.objects.annotate(year=ExtractYear("admission_date"))
                    .values("year")
                    .annotate(count=Count("id"))
                    .order_by("year")
                )
                if row["year"] is not None
            ],
        }

        try:
            from apps.admissions.models import Admission
            data["admissions"] = {
                "total": Admission.objects.count(),
                "by_status": list(
                    Admission.objects.values("admission_status").annotate(count=Count("id"))
                ),
            }
        except Exception:
            pass

        try:
            from apps.placements.models import PlacementApplication, PlacementDrive
            data["placements"] = {
                "total_drives": PlacementDrive.objects.count(),
                "active_drives": PlacementDrive.objects.filter(is_active=True).count(),
                "total_applications": PlacementApplication.objects.count(),
                "by_status": list(
                    PlacementApplication.objects.values("status").annotate(count=Count("id"))
                ),
            }
        except Exception:
            pass

        try:
            from apps.finance.models import FeePayment, PaymentStatus
            data["fees"] = {
                "total_payments": FeePayment.objects.count(),
                "total_collected": FeePayment.objects.filter(
                    payment_status=PaymentStatus.PAID
                ).aggregate(total=Sum("amount_paid"))["total"] or 0,
                "by_status": list(
                    FeePayment.objects.values("payment_status").annotate(count=Count("id"))
                ),
            }
            # Real month-wise fee collection (paid vs pending amounts), from
            # actual FeePayment rows grouped by payment_date's month.
            monthly = (
                FeePayment.objects.annotate(month=TruncMonth("payment_date"))
                .values("month", "payment_status")
                .annotate(total=Sum("amount_paid"))
                .order_by("month")
            )
            by_month: dict = {}
            for row in monthly:
                if row["month"] is None:
                    continue
                key = row["month"].strftime("%Y-%m")
                bucket = by_month.setdefault(key, {"month": key, "collected": 0, "pending": 0})
                if row["payment_status"] == PaymentStatus.PAID:
                    bucket["collected"] += float(row["total"] or 0)
                else:
                    bucket["pending"] += float(row["total"] or 0)
            data["fees"]["monthly_collection"] = sorted(by_month.values(), key=lambda r: r["month"])
        except Exception:
            pass

        try:
            from apps.research.models import ResearchProject
            data["research"] = {"total_projects": ResearchProject.objects.count()}
        except Exception:
            pass

        data["generated_at"] = timezone.now()
        return Response({"success": True, **data})
