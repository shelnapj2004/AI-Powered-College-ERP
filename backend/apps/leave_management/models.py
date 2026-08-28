import uuid
from django.db import models
from django.db.models import TextChoices


class LeaveApplicantType(TextChoices):
    STUDENT = 'student', 'Student'
    TEACHER = 'teacher', 'Teacher'
    STAFF = 'staff', 'Staff'


class LeaveStatus(TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    CANCELLED = 'cancelled', 'Cancelled'


class LeaveRequest(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    applicant_type = models.CharField(
        max_length=50,
        choices=LeaveApplicantType.choices,
        verbose_name='Applicant Type'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='leave_requests',
        blank=True,
        null=True,
        verbose_name='Student'
    )
    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.CASCADE,
        related_name='leave_requests',
        blank=True,
        null=True,
        verbose_name='Teacher'
    )
    staff = models.ForeignKey(
        'staff.Staff',
        on_delete=models.CASCADE,
        related_name='leave_requests',
        blank=True,
        null=True,
        verbose_name='Staff'
    )
    start_date = models.DateField(
        verbose_name='Start Date'
    )
    end_date = models.DateField(
        verbose_name='End Date'
    )
    reason = models.TextField(
        verbose_name='Reason'
    )
    status = models.CharField(
        max_length=50,
        choices=LeaveStatus.choices,
        default=LeaveStatus.PENDING,
        verbose_name='Status'
    )
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        related_name='approved_leave_requests',
        blank=True,
        null=True,
        verbose_name='Approved By'
    )
    approved_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Approved At'
    )
    remarks = models.TextField(
        blank=True,
        null=True,
        verbose_name='Remarks'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Leave Request'
        verbose_name_plural = 'Leave Requests'
        ordering = ['-created_at', 'status', 'start_date']
        indexes = [
            models.Index(fields=['applicant_type']),
            models.Index(fields=['student']),
            models.Index(fields=['teacher']),
            models.Index(fields=['staff']),
            models.Index(fields=['start_date']),
            models.Index(fields=['end_date']),
            models.Index(fields=['status']),
            models.Index(fields=['approved_by']),
        ]

    def __str__(self):
        applicant = self.student or self.teacher or self.staff
        return f"{applicant} - {self.get_applicant_type_display()} ({self.get_status_display()})"
