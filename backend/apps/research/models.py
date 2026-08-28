import uuid
from django.db import models
from django.db.models import TextChoices


class ProjectStatus(TextChoices):
    PLANNING = 'planning', 'Planning'
    ONGOING = 'ongoing', 'Ongoing'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'


class ApprovalStatus(TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class ResearchProject(models.Model):
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
    principal_investigator = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.PROTECT,
        related_name='led_research_projects',
        verbose_name='Principal Investigator'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='research_projects',
        verbose_name='Department'
    )
    funding_agency = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Funding Agency'
    )
    budget = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name='Budget'
    )
    start_date = models.DateField(
        verbose_name='Start Date'
    )
    end_date = models.DateField(
        blank=True,
        null=True,
        verbose_name='End Date'
    )
    status = models.CharField(
        max_length=50,
        choices=ProjectStatus.choices,
        default=ProjectStatus.PLANNING,
        verbose_name='Status'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Is Active'
    )
    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
        verbose_name='Approval Status'
    )
    reviewed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        related_name='reviewed_research_projects',
        null=True,
        blank=True,
        verbose_name='Reviewed By'
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Reviewed At'
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
        verbose_name = 'Research Project'
        verbose_name_plural = 'Research Projects'
        ordering = ['-start_date', 'title']
        indexes = [
            models.Index(fields=['principal_investigator']),
            models.Index(fields=['department']),
            models.Index(fields=['status']),
            models.Index(fields=['start_date']),
            models.Index(fields=['is_active']),
            models.Index(fields=['approval_status']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


class MemberRole(TextChoices):
    CO_INVESTIGATOR = 'co_investigator', 'Co-Investigator'
    RESEARCH_ASSISTANT = 'research_assistant', 'Research Assistant'
    FACULTY_MEMBER = 'faculty_member', 'Faculty Member'


class ResearchMember(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    research_project = models.ForeignKey(
        ResearchProject,
        on_delete=models.CASCADE,
        related_name='members',
        verbose_name='Research Project'
    )
    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.CASCADE,
        related_name='research_memberships',
        verbose_name='Teacher'
    )
    role = models.CharField(
        max_length=50,
        choices=MemberRole.choices,
        verbose_name='Role'
    )
    joined_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Joined At'
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
        verbose_name = 'Research Member'
        verbose_name_plural = 'Research Members'
        ordering = ['-joined_at']
        indexes = [
            models.Index(fields=['research_project']),
            models.Index(fields=['teacher']),
            models.Index(fields=['role']),
            models.Index(fields=['joined_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['research_project', 'teacher'],
                name='unique_research_project_teacher'
            )
        ]

    def __str__(self):
        return f"{self.teacher} - {self.research_project} ({self.get_role_display()})"
