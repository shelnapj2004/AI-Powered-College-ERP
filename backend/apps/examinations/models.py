import uuid
from django.db import models
from django.db.models import TextChoices


class ExamType(TextChoices):
    INTERNAL_1 = 'internal_1', 'Internal 1'
    INTERNAL_2 = 'internal_2', 'Internal 2'
    MODEL = 'model', 'Model'
    PRACTICAL = 'practical', 'Practical'
    VIVA = 'viva', 'Viva'
    SEMESTER = 'semester', 'Semester'


class ResultStatus(TextChoices):
    PASS = 'pass', 'Pass'
    FAIL = 'fail', 'Fail'
    WITHHELD = 'withheld', 'Withheld'


class SubjectResult(TextChoices):
    PASS = 'pass', 'Pass'
    FAIL = 'fail', 'Fail'


class Examination(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    subject = models.ForeignKey(
        'subjects.Subject',
        on_delete=models.PROTECT,
        related_name='examinations',
        verbose_name='Subject'
    )
    semester = models.ForeignKey(
        'semester.Semester',
        on_delete=models.PROTECT,
        related_name='examinations',
        verbose_name='Semester'
    )
    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.PROTECT,
        related_name='examinations',
        verbose_name='Teacher'
    )
    exam_type = models.CharField(
        max_length=50,
        choices=ExamType.choices,
        verbose_name='Exam Type'
    )
    title = models.CharField(
        max_length=255,
        verbose_name='Title'
    )
    exam_date = models.DateField(
        verbose_name='Exam Date'
    )
    maximum_marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='Maximum Marks'
    )
    passing_marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='Passing Marks'
    )
    instructions = models.TextField(
        blank=True,
        null=True,
        verbose_name='Instructions'
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
        verbose_name = 'Examination'
        verbose_name_plural = 'Examinations'
        ordering = ['-exam_date', 'subject', 'exam_type']
        indexes = [
            models.Index(fields=['subject']),
            models.Index(fields=['semester']),
            models.Index(fields=['teacher']),
            models.Index(fields=['exam_type']),
            models.Index(fields=['exam_date']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.title} - {self.subject.name} ({self.get_exam_type_display()})"


class InternalMark(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    examination = models.ForeignKey(
        'Examination',
        on_delete=models.CASCADE,
        related_name='internal_marks',
        verbose_name='Examination'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='internal_marks',
        verbose_name='Student'
    )
    marks_obtained = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='Marks Obtained'
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
        verbose_name = 'Internal Mark'
        verbose_name_plural = 'Internal Marks'
        ordering = ['examination', 'student']
        indexes = [
            models.Index(fields=['examination']),
            models.Index(fields=['student']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['examination', 'student'],
                name='unique_examination_student'
            )
        ]

    def __str__(self):
        return f"{self.student} - {self.examination} ({self.marks_obtained})"


class SemesterResult(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='semester_results',
        verbose_name='Student'
    )
    semester = models.ForeignKey(
        'semester.Semester',
        on_delete=models.PROTECT,
        related_name='semester_results',
        verbose_name='Semester'
    )
    sgpa = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        verbose_name='SGPA'
    )
    cgpa = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        verbose_name='CGPA'
    )
    total_credits_earned = models.PositiveIntegerField(
        verbose_name='Total Credits Earned'
    )
    result_status = models.CharField(
        max_length=50,
        choices=ResultStatus.choices,
        verbose_name='Result Status'
    )
    published_date = models.DateField(
        verbose_name='Published Date'
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
        verbose_name = 'Semester Result'
        verbose_name_plural = 'Semester Results'
        ordering = ['-published_date', 'student', 'semester']
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['semester']),
            models.Index(fields=['result_status']),
            models.Index(fields=['published_date']),
        ]

    def __str__(self):
        return f"{self.student} - {self.semester} ({self.result_status})"


class SemesterResultSubject(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    semester_result = models.ForeignKey(
        'SemesterResult',
        on_delete=models.CASCADE,
        related_name='subject_results',
        verbose_name='Semester Result'
    )
    subject = models.ForeignKey(
        'subjects.Subject',
        on_delete=models.PROTECT,
        related_name='semester_result_subjects',
        verbose_name='Subject'
    )
    internal_marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='Internal Marks'
    )
    external_marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='External Marks'
    )
    total_marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='Total Marks'
    )
    grade = models.CharField(
        max_length=10,
        verbose_name='Grade'
    )
    grade_point = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        verbose_name='Grade Point'
    )
    credits_earned = models.PositiveIntegerField(
        verbose_name='Credits Earned'
    )
    result = models.CharField(
        max_length=50,
        choices=SubjectResult.choices,
        verbose_name='Result'
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
        verbose_name = 'Semester Result Subject'
        verbose_name_plural = 'Semester Result Subjects'
        ordering = ['semester_result', 'subject']
        indexes = [
            models.Index(fields=['semester_result']),
            models.Index(fields=['subject']),
            models.Index(fields=['result']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['semester_result', 'subject'],
                name='unique_semester_result_subject'
            )
        ]

    def __str__(self):
        return f"{self.subject.name} - {self.grade} ({self.get_result_display()})"
