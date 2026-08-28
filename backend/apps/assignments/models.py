import uuid
from django.db import models
from django.db.models import TextChoices


class SubmissionStatus(TextChoices):
    SUBMITTED = 'submitted', 'Submitted'
    LATE = 'late', 'Late'
    NOT_SUBMITTED = 'not_submitted', 'Not Submitted'


class Assignment(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    subject = models.ForeignKey(
        'subjects.Subject',
        on_delete=models.PROTECT,
        related_name='assignments',
        verbose_name='Subject'
    )
    semester = models.ForeignKey(
        'semester.Semester',
        on_delete=models.PROTECT,
        related_name='assignments',
        verbose_name='Semester'
    )
    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.PROTECT,
        related_name='assignments',
        verbose_name='Teacher'
    )
    title = models.CharField(
        max_length=255,
        verbose_name='Title'
    )
    description = models.TextField(
        verbose_name='Description'
    )
    assigned_date = models.DateField(
        verbose_name='Assigned Date'
    )
    due_date = models.DateField(
        verbose_name='Due Date'
    )
    maximum_marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='Maximum Marks'
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
        verbose_name = 'Assignment'
        verbose_name_plural = 'Assignments'
        ordering = ['-due_date', 'subject', 'title']
        indexes = [
            models.Index(fields=['subject']),
            models.Index(fields=['semester']),
            models.Index(fields=['teacher']),
            models.Index(fields=['assigned_date']),
            models.Index(fields=['due_date']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.title} - {self.subject.name} (Due: {self.due_date})"


class AssignmentSubmission(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    assignment = models.ForeignKey(
        'Assignment',
        on_delete=models.CASCADE,
        related_name='submissions',
        verbose_name='Assignment'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='assignment_submissions',
        verbose_name='Student'
    )
    submission_file = models.FileField(
        upload_to='assignment_submissions/',
        blank=True,
        null=True,
        verbose_name='Submission File'
    )
    submitted_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Submitted At'
    )
    obtained_marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name='Obtained Marks'
    )
    feedback = models.TextField(
        blank=True,
        null=True,
        verbose_name='Feedback'
    )
    status = models.CharField(
        max_length=50,
        choices=SubmissionStatus.choices,
        verbose_name='Status'
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
        verbose_name = 'Assignment Submission'
        verbose_name_plural = 'Assignment Submissions'
        ordering = ['assignment', 'student']
        indexes = [
            models.Index(fields=['assignment']),
            models.Index(fields=['student']),
            models.Index(fields=['status']),
            models.Index(fields=['submitted_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['assignment', 'student'],
                name='unique_assignment_student'
            )
        ]

    def __str__(self):
        return f"{self.student} - {self.assignment.title} ({self.get_status_display()})"
