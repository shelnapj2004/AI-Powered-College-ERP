import uuid
from django.db import models
from django.db.models import TextChoices


class EmploymentType(TextChoices):
    FULL_TIME = 'full_time', 'Full Time'
    INTERNSHIP = 'internship', 'Internship'
    CONTRACT = 'contract', 'Contract'


class PlacementDrive(models.Model):
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
    job_title = models.CharField(
        max_length=255,
        verbose_name='Job Title'
    )
    employment_type = models.CharField(
        max_length=50,
        choices=EmploymentType.choices,
        verbose_name='Employment Type'
    )
    package_lpa = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Package (LPA)'
    )
    location = models.CharField(
        max_length=255,
        verbose_name='Location'
    )
    eligibility_criteria = models.TextField(
        verbose_name='Eligibility Criteria'
    )
    application_deadline = models.DateField(
        verbose_name='Application Deadline'
    )
    drive_date = models.DateField(
        verbose_name='Drive Date'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Description'
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
        verbose_name = 'Placement Drive'
        verbose_name_plural = 'Placement Drives'
        ordering = ['-drive_date', 'company_name']
        indexes = [
            models.Index(fields=['company_name']),
            models.Index(fields=['drive_date']),
            models.Index(fields=['application_deadline']),
            models.Index(fields=['employment_type']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.company_name} - {self.job_title} ({self.get_employment_type_display()})"


class ApplicationStatus(TextChoices):
    APPLIED = 'applied', 'Applied'
    SHORTLISTED = 'shortlisted', 'Shortlisted'
    INTERVIEW = 'interview', 'Interview'
    SELECTED = 'selected', 'Selected'
    REJECTED = 'rejected', 'Rejected'


class PlacementApplication(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    placement_drive = models.ForeignKey(
        PlacementDrive,
        on_delete=models.CASCADE,
        related_name='applications',
        verbose_name='Placement Drive'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='placement_applications',
        verbose_name='Student'
    )
    status = models.CharField(
        max_length=50,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.APPLIED,
        verbose_name='Status'
    )
    remarks = models.TextField(
        blank=True,
        null=True,
        verbose_name='Remarks'
    )
    applied_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Applied At'
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
        verbose_name = 'Placement Application'
        verbose_name_plural = 'Placement Applications'
        ordering = ['-applied_at']
        indexes = [
            models.Index(fields=['placement_drive']),
            models.Index(fields=['student']),
            models.Index(fields=['status']),
            models.Index(fields=['applied_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['placement_drive', 'student'],
                name='unique_placement_drive_student'
            )
        ]

    def __str__(self):
        return f"{self.student} - {self.placement_drive} ({self.get_status_display()})"
