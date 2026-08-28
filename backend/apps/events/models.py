import uuid
from django.db import models
from django.db.models import TextChoices


class EventType(TextChoices):
    SEMINAR = 'seminar', 'Seminar'
    WORKSHOP = 'workshop', 'Workshop'
    CONFERENCE = 'conference', 'Conference'
    CULTURAL = 'cultural', 'Cultural'
    SPORTS = 'sports', 'Sports'
    PLACEMENT = 'placement', 'Placement'
    OTHER = 'other', 'Other'


class Event(models.Model):
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
    description = models.TextField(
        verbose_name='Description'
    )
    event_type = models.CharField(
        max_length=50,
        choices=EventType.choices,
        verbose_name='Event Type'
    )
    venue = models.CharField(
        max_length=255,
        verbose_name='Venue'
    )
    event_date = models.DateField(
        verbose_name='Event Date'
    )
    start_time = models.TimeField(
        verbose_name='Start Time'
    )
    end_time = models.TimeField(
        verbose_name='End Time'
    )
    organizer = models.CharField(
        max_length=255,
        verbose_name='Organizer'
    )
    registration_required = models.BooleanField(
        default=True,
        verbose_name='Registration Required'
    )
    registration_deadline = models.DateField(
        blank=True,
        null=True,
        verbose_name='Registration Deadline'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Is Active'
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
        verbose_name = 'Event'
        verbose_name_plural = 'Events'
        ordering = ['-event_date', 'start_time']
        indexes = [
            models.Index(fields=['event_date']),
            models.Index(fields=['event_type']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_event_type_display()})"


class RegistrationStatus(TextChoices):
    REGISTERED = 'registered', 'Registered'
    ATTENDED = 'attended', 'Attended'
    CANCELLED = 'cancelled', 'Cancelled'


class EventRegistration(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='registrations',
        verbose_name='Event'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='event_registrations',
        verbose_name='Student'
    )
    status = models.CharField(
        max_length=50,
        choices=RegistrationStatus.choices,
        default=RegistrationStatus.REGISTERED,
        verbose_name='Status'
    )
    registered_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Registered At'
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
        verbose_name = 'Event Registration'
        verbose_name_plural = 'Event Registrations'
        ordering = ['-registered_at']
        indexes = [
            models.Index(fields=['event']),
            models.Index(fields=['student']),
            models.Index(fields=['status']),
            models.Index(fields=['registered_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['event', 'student'],
                name='unique_event_student'
            )
        ]

    def __str__(self):
        return f"{self.student} - {self.event} ({self.get_status_display()})"
