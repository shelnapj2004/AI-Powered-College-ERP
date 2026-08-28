import uuid
from django.db import models
from django.db.models import TextChoices


class ScholarshipType(TextChoices):
    MERIT = 'merit', 'Merit'
    NEED_BASED = 'need_based', 'Need Based'
    SPORTS = 'sports', 'Sports'
    GOVERNMENT = 'government', 'Government'
    PRIVATE = 'private', 'Private'


class Scholarship(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    name = models.CharField(
        max_length=255,
        verbose_name='Name'
    )
    scholarship_type = models.CharField(
        max_length=50,
        choices=ScholarshipType.choices,
        verbose_name='Scholarship Type'
    )
    provider = models.CharField(
        max_length=255,
        verbose_name='Provider'
    )
    description = models.TextField(
        verbose_name='Description'
    )
    eligibility_criteria = models.TextField(
        verbose_name='Eligibility Criteria'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Amount'
    )
    application_deadline = models.DateField(
        verbose_name='Application Deadline'
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
        verbose_name = 'Scholarship'
        verbose_name_plural = 'Scholarships'
        ordering = ['-application_deadline', 'name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['scholarship_type']),
            models.Index(fields=['provider']),
            models.Index(fields=['application_deadline']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_scholarship_type_display()})"


class ApplicationStatus(TextChoices):
    APPLIED = 'applied', 'Applied'
    UNDER_REVIEW = 'under_review', 'Under Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class ScholarshipApplication(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    scholarship = models.ForeignKey(
        Scholarship,
        on_delete=models.CASCADE,
        related_name='applications',
        verbose_name='Scholarship'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='scholarship_applications',
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
        verbose_name = 'Scholarship Application'
        verbose_name_plural = 'Scholarship Applications'
        ordering = ['-applied_at']
        indexes = [
            models.Index(fields=['scholarship']),
            models.Index(fields=['student']),
            models.Index(fields=['status']),
            models.Index(fields=['applied_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['scholarship', 'student'],
                name='unique_scholarship_student'
            )
        ]

    def __str__(self):
        return f"{self.student} - {self.scholarship} ({self.get_status_display()})"
