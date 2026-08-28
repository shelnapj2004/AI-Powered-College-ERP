import uuid
from django.db import models
from django.db.models import TextChoices


class QuestionType(TextChoices):
    MCQ = 'MCQ', 'MCQ'
    SHORT_ANSWER = 'Short Answer', 'Short Answer'
    DESCRIPTIVE = 'Descriptive', 'Descriptive'


class Question(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    subject = models.ForeignKey(
        'subjects.Subject',
        on_delete=models.PROTECT,
        related_name='question_bank_questions',
        verbose_name='Subject'
    )
    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.PROTECT,
        related_name='question_bank_questions',
        verbose_name='Teacher'
    )
    topic = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Topic'
    )
    question_text = models.TextField(
        verbose_name='Question'
    )
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        verbose_name='Question Type'
    )
    options = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Options'
    )
    correct_answer = models.TextField(
        verbose_name='Correct Answer'
    )
    marks = models.PositiveIntegerField(
        verbose_name='Marks'
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
        verbose_name = 'Question'
        verbose_name_plural = 'Questions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subject']),
            models.Index(fields=['teacher']),
            models.Index(fields=['question_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.subject.name} - {self.question_text[:40]}"
