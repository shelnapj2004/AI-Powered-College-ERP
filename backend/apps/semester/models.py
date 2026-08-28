import uuid
from django.core.exceptions import ValidationError
from django.db import models


class Semester(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    academic_year = models.ForeignKey(
        'academic_year.AcademicYear',
        on_delete=models.PROTECT,
        related_name='semesters',
        verbose_name='Academic Year'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.PROTECT,
        related_name='semesters',
        verbose_name='Course'
    )
    semester_number = models.PositiveIntegerField(
        verbose_name='Semester Number'
    )
    name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Semester Name'
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
        verbose_name = 'Semester'
        verbose_name_plural = 'Semesters'
        ordering = ['academic_year', 'course', 'semester_number']
        indexes = [
            models.Index(fields=['course']),
            models.Index(fields=['academic_year']),
            models.Index(fields=['semester_number']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academic_year', 'course', 'semester_number'],
                name='unique_semester_per_course_academic_year'
            )
        ]

    def __str__(self):
        return f"{self.name} - {self.course.code} - Semester {self.semester_number} ({self.academic_year.name})"

    def clean(self):
        super().clean()
        if self.end_date and self.start_date and self.end_date <= self.start_date:
            raise ValidationError({'end_date': 'End date must be greater than start date.'})
        if self.semester_number and self.semester_number <= 0:
            raise ValidationError({'semester_number': 'Semester number must be positive.'})
        if self.academic_year and self.start_date and self.start_date < self.academic_year.start_date:
            raise ValidationError({'start_date': 'Semester start date must be within the academic year.'})
        if self.academic_year and self.end_date and self.end_date > self.academic_year.end_date:
            raise ValidationError({'end_date': 'Semester end date must be within the academic year.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
