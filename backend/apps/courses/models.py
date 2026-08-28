import uuid
from django.db import models
from django.db.models import TextChoices


class DegreeType(TextChoices):
    BACHELOR = 'bachelor', 'Bachelor'
    MASTER = 'master', 'Master'
    PHD = 'phd', 'PhD'
    DIPLOMA = 'diploma', 'Diploma'
    CERTIFICATE = 'certificate', 'Certificate'


class Course(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='courses',
        verbose_name='Department'
    )
    name = models.CharField(
        max_length=255,
        verbose_name='Course Name'
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Course Code'
    )
    degree = models.CharField(
        max_length=50,
        choices=DegreeType.choices,
        verbose_name='Degree Type'
    )
    duration_years = models.PositiveIntegerField(
        verbose_name='Duration (Years)'
    )
    total_semesters = models.PositiveIntegerField(
        verbose_name='Total Semesters'
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
        verbose_name = 'Course'
        verbose_name_plural = 'Courses'
        ordering = ['department', 'name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['department']),
            models.Index(fields=['degree']),
            models.Index(fields=['is_active']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name} ({self.get_degree_display()})"
