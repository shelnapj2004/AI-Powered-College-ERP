from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    STUDENT = "student", "Student"
    TEACHER = "teacher", "Teacher"
    STAFF = "staff", "Staff"
    HOD = "hod", "Head of Department"
    ADMIN = "admin", "Administrator"


class User(AbstractUser):
    """
    Custom user model for College ERP.

    Extends Django's AbstractUser with role-based access aligned
    to the frontend dashboard routes.
    """

    email = models.EmailField(unique=True, blank=True, null=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.STUDENT,
        db_index=True,
    )
    phone = models.CharField(max_length=20, blank=True)
    profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)
    employee_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        help_text="Staff/Teacher/HOD employee identifier",
    )
    student_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        help_text="Student roll/enrollment number",
    )
    department = models.CharField(max_length=100, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["role", "is_active"]),
            models.Index(fields=["student_id"]),
            models.Index(fields=["employee_id"]),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_student(self):
        return self.role == UserRole.STUDENT

    @property
    def is_teacher(self):
        return self.role == UserRole.TEACHER

    @property
    def is_staff_member(self):
        return self.role == UserRole.STAFF

    @property
    def is_hod(self):
        return self.role == UserRole.HOD

    @property
    def is_admin_user(self):
        return self.role == UserRole.ADMIN or self.is_superuser

    @property
    def display_id(self):
        """Return the role-appropriate identifier."""
        if self.is_student and self.student_id:
            return self.student_id
        if self.employee_id:
            return self.employee_id
        return self.username
