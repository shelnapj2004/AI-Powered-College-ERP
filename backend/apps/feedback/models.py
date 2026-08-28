import uuid
from django.db import models


class TeacherFeedback(models.Model):
    """Minimal database-backed workflow for Student -> Teacher feedback
    (Priority 4). No suitable existing model was found in the codebase, so
    this small dedicated app holds only what the current UI needs: a
    rating, a comment, and who it's about/from.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.CASCADE,
        related_name='feedback_received',
        verbose_name='Teacher'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='feedback_given',
        verbose_name='Student'
    )
    rating = models.PositiveSmallIntegerField(
        verbose_name='Rating'
    )
    comment = models.TextField(
        verbose_name='Comment'
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
        verbose_name = 'Teacher Feedback'
        verbose_name_plural = 'Teacher Feedback'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['teacher']),
            models.Index(fields=['student']),
            models.Index(fields=['created_at']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['teacher', 'student'], name='unique_feedback_per_student_teacher'),
            models.CheckConstraint(check=models.Q(rating__gte=1) & models.Q(rating__lte=5), name='feedback_rating_1_to_5'),
        ]

    def __str__(self):
        return f"{self.student} -> {self.teacher}: {self.rating}"
