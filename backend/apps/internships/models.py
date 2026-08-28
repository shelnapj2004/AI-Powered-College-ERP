import uuid
from django.db import models
from django.db.models import TextChoices


class InternshipOpportunity(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    company_name = models.CharField(
        max_length=255,
        verbose_name='Company Name'
    )
    title = models.CharField(
        max_length=255,
        verbose_name='Title'
    )
    description = models.TextField(
        verbose_name='Description'
    )
    location = models.CharField(
        max_length=255,
        verbose_name='Location'
    )
    stipend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Stipend'
    )
    duration = models.CharField(
        max_length=100,
        verbose_name='Duration'
    )
    eligibility = models.TextField(
        verbose_name='Eligibility'
    )
    application_deadline = models.DateField(
        verbose_name='Application Deadline'
    )
    start_date = models.DateField(
        verbose_name='Start Date'
    )
    end_date = models.DateField(
        verbose_name='End Date'
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
        verbose_name = 'Internship Opportunity'
        verbose_name_plural = 'Internship Opportunities'
        ordering = ['-start_date', 'company_name']
        indexes = [
            models.Index(fields=['company_name']),
            models.Index(fields=['start_date']),
            models.Index(fields=['application_deadline']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.company_name} - {self.title}"


class ApplicationStatus(TextChoices):
    APPLIED = 'applied', 'Applied'
    SHORTLISTED = 'shortlisted', 'Shortlisted'
    ACCEPTED = 'accepted', 'Accepted'
    REJECTED = 'rejected', 'Rejected'
    COMPLETED = 'completed', 'Completed'


class InternshipApplication(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    internship_opportunity = models.ForeignKey(
        InternshipOpportunity,
        on_delete=models.CASCADE,
        related_name='applications',
        verbose_name='Internship Opportunity'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='internship_applications',
        verbose_name='Student'
    )
    status = models.CharField(
        max_length=50,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.APPLIED,
        verbose_name='Status'
    )
    applied_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Applied At'
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
        verbose_name = 'Internship Application'
        verbose_name_plural = 'Internship Applications'
        ordering = ['-applied_at']
        indexes = [
            models.Index(fields=['internship_opportunity']),
            models.Index(fields=['student']),
            models.Index(fields=['status']),
            models.Index(fields=['applied_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['internship_opportunity', 'student'],
                name='unique_internship_opportunity_student'
            )
        ]

    def __str__(self):
        return f"{self.student} - {self.internship_opportunity} ({self.get_status_display()})"
