"""
Role-based permission classes for College ERP.

Roles align with the frontend dashboards:
  student, teacher, staff, hod, admin
"""
from rest_framework.permissions import BasePermission

from apps.accounts.models import UserRole


class RoleRequired(BasePermission):
    """
    Base permission that checks the authenticated user's role.
    Subclasses set `allowed_roles`.
    """

    allowed_roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.role in self.allowed_roles


class IsStudent(RoleRequired):
    allowed_roles = (UserRole.STUDENT,)


class IsTeacher(RoleRequired):
    allowed_roles = (UserRole.TEACHER,)


class IsStaff(RoleRequired):
    allowed_roles = (UserRole.STAFF,)


class IsHOD(RoleRequired):
    allowed_roles = (UserRole.HOD,)


class IsAdmin(RoleRequired):
    allowed_roles = (UserRole.ADMIN,)


class IsAdminOrHOD(RoleRequired):
    allowed_roles = (UserRole.ADMIN, UserRole.HOD)


class IsFaculty(RoleRequired):
    """Teacher or HOD — academic staff with teaching responsibilities."""

    allowed_roles = (UserRole.TEACHER, UserRole.HOD)


class IsInternalUser(RoleRequired):
    """Any authenticated ERP user (excludes public/anonymous)."""

    allowed_roles = (
        UserRole.STUDENT,
        UserRole.TEACHER,
        UserRole.STAFF,
        UserRole.HOD,
        UserRole.ADMIN,
    )


class ReadOnly(BasePermission):
    """Allow safe methods for any authenticated user."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.method in ("GET", "HEAD", "OPTIONS")


class PublicReadOnly(BasePermission):
    """
    Allow safe (GET/HEAD/OPTIONS) methods for ANYONE, including anonymous
    visitors. Used only on the handful of lookup endpoints the public
    Admissions registration form needs (Department/Course dropdowns) --
    never for endpoints exposing student/staff data.
    """

    def has_permission(self, request, view):
        return request.method in ("GET", "HEAD", "OPTIONS")
