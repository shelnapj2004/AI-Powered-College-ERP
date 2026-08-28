import uuid
from django.db import models
from django.db.models import TextChoices


class AttendanceStatus(TextChoices):
    PRESENT = 'present', 'Present'
    ABSENT = 'absent', 'Absent'
    LATE = 'late', 'Late'
    LEAVE = 'leave', 'Leave'


class AttendanceSession(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    timetable = models.ForeignKey(
        'timetable.Timetable',
        on_delete=models.PROTECT,
        related_name='attendance_sessions',
        verbose_name='Timetable'
    )
    attendance_date = models.DateField(
        verbose_name='Attendance Date'
    )
    topic_covered = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='Topic Covered'
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
        verbose_name = 'Attendance Session'
        verbose_name_plural = 'Attendance Sessions'
        ordering = ['-attendance_date', 'timetable']
        indexes = [
            models.Index(fields=['timetable']),
            models.Index(fields=['attendance_date']),
        ]

    def __str__(self):
        return f"{self.timetable} - {self.attendance_date}"


class AttendanceRecord(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    attendance_session = models.ForeignKey(
        'AttendanceSession',
        on_delete=models.CASCADE,
        related_name='attendance_records',
        verbose_name='Attendance Session'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='attendance_records',
        verbose_name='Student'
    )
    status = models.CharField(
        max_length=50,
        choices=AttendanceStatus.choices,
        verbose_name='Status'
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
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'
        ordering = ['attendance_session', 'student']
        indexes = [
            models.Index(fields=['attendance_session']),
            models.Index(fields=['student']),
            models.Index(fields=['status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['attendance_session', 'student'],
                name='unique_attendance_session_student'
            )
        ]

    def __str__(self):
        return f"{self.student} - {self.attendance_session} ({self.get_status_display()})"
