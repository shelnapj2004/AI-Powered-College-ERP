import uuid
from django.db import models
from django.db.models import TextChoices


class NotificationType(TextChoices):
    GENERAL = 'general', 'General'
    ACADEMIC = 'academic', 'Academic'
    EXAM = 'exam', 'Exam'
    EVENT = 'event', 'Event'
    PLACEMENT = 'placement', 'Placement'
    SCHOLARSHIP = 'scholarship', 'Scholarship'
    FINANCE = 'finance', 'Finance'


class TargetAudience(TextChoices):
    ALL = 'all', 'All'
    STUDENTS = 'students', 'Students'
    TEACHERS = 'teachers', 'Teachers'
    STAFF = 'staff', 'Staff'
    HODS = 'hods', 'HODs'


class Notification(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    title = models.CharField(
        max_length=255,
        verbose_name='Title'
    )
    message = models.TextField(
        verbose_name='Message'
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        verbose_name='Notification Type'
    )
    target_audience = models.CharField(
        max_length=50,
        choices=TargetAudience.choices,
        verbose_name='Target Audience'
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        related_name='created_notifications',
        null=True,
        verbose_name='Created By'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Is Active'
    )
    published_at = models.DateTimeField(
        verbose_name='Published At'
    )
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Expires At'
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
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-published_at', 'notification_type', 'title']
        indexes = [
            models.Index(fields=['notification_type']),
            models.Index(fields=['target_audience']),
            models.Index(fields=['created_by']),
            models.Index(fields=['published_at']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.title} - {self.get_notification_type_display()} ({self.get_target_audience_display()})"
