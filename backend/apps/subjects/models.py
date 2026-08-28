import uuid
from django.db import models
from django.db.models import TextChoices


class SubjectType(TextChoices):
    THEORY = 'theory', 'Theory'
    LAB = 'lab', 'Lab'


class Subject(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.PROTECT,
        related_name='subjects',
        verbose_name='Course'
    )
    semester = models.ForeignKey(
        'semester.Semester',
        on_delete=models.PROTECT,
        related_name='subjects',
        verbose_name='Semester'
    )
    code = models.CharField(
        max_length=50,
        verbose_name='Subject Code'
    )
    name = models.CharField(
        max_length=255,
        verbose_name='Subject Name'
    )
    credits = models.PositiveIntegerField(
        verbose_name='Credits'
    )
    subject_type = models.CharField(
        max_length=50,
        choices=SubjectType.choices,
        verbose_name='Subject Type'
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
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
        ordering = ['course', 'code']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['course']),
            models.Index(fields=['semester']),
            models.Index(fields=['subject_type']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name} ({self.get_subject_type_display()})"
