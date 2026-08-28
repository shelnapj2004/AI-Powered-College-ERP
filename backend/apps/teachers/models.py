import uuid
from django.db import models


class Teacher(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='teacher',
        verbose_name='User'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='teachers',
        verbose_name='Department'
    )
    employee_id = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Employee ID'
    )
    designation = models.CharField(
        max_length=255,
        verbose_name='Designation'
    )
    qualification = models.CharField(
        max_length=255,
        verbose_name='Qualification'
    )
    specialization = models.CharField(
        max_length=255,
        verbose_name='Specialization'
    )
    experience_years = models.PositiveIntegerField(
        verbose_name='Experience (Years)'
    )
    phone = models.CharField(
        max_length=20,
        verbose_name='Phone'
    )
    email = models.EmailField(
        verbose_name='Email'
    )
    address = models.TextField(
        verbose_name='Address'
    )
    joining_date = models.DateField(
        verbose_name='Joining Date'
    )
    profile_photo = models.ImageField(
        upload_to='teacher_profiles/',
        blank=True,
        null=True,
        verbose_name='Profile Photo'
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
        verbose_name = 'Teacher'
        verbose_name_plural = 'Teachers'
        ordering = ['employee_id']
        indexes = [
            models.Index(fields=['employee_id']),
            models.Index(fields=['department']),
            models.Index(fields=['designation']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.employee_id} - {self.user.get_full_name()}"


class TeacherSubjectAssignment(models.Model):
    """
    Persistent Teacher <-> Subject assignment (Priority 8, Phase D).

    Inspected first: neither Teacher nor Subject nor Timetable carried a
    standalone "which teacher is allowed to teach which subject" relation
    -- Timetable.teacher/subject is a scheduled class slot, not an
    assignment roster, so it cannot double as this relationship (an HOD
    must be able to assign a subject to a teacher before any timetable
    slot exists, and Timetable creation must validate against this
    assignment). This is therefore a new, minimal, non-duplicate model.
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
        related_name='subject_assignments',
        verbose_name='Teacher'
    )
    subject = models.ForeignKey(
        'subjects.Subject',
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
        verbose_name='Subject'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Is Active'
    )
    assigned_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Assigned At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Teacher Subject Assignment'
        verbose_name_plural = 'Teacher Subject Assignments'
        ordering = ['teacher', 'subject']
        indexes = [
            models.Index(fields=['teacher']),
            models.Index(fields=['subject']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['teacher', 'subject'],
                name='unique_teacher_subject_assignment'
            )
        ]

    def __str__(self):
        return f"{self.teacher.employee_id} -> {self.subject.code}"
