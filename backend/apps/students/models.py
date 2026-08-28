import uuid
from django.db import models
from django.db.models import TextChoices


class Gender(TextChoices):
    MALE = 'male', 'Male'
    FEMALE = 'female', 'Female'
    OTHER = 'other', 'Other'


class StudentApprovalStatus(TextChoices):
    """
    Priority 14: Staff can now create a Student directly (no Admission
    record required). Such a student must be reviewed by Admin before the
    login account can be used -- see StudentViewSet.approve/reject.

    Default is APPROVED so every pre-existing Student row (created via the
    long-standing Admission -> Staff create-account flow, which is already
    Admin-reviewed at the Admission stage) is unaffected by this addition.
    Only newly Staff-direct-created students start life as PENDING.
    """
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class Student(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='student',
        verbose_name='User'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='students',
        verbose_name='Department'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.PROTECT,
        related_name='students',
        verbose_name='Course'
    )
    semester = models.ForeignKey(
        'semester.Semester',
        on_delete=models.PROTECT,
        related_name='students',
        verbose_name='Semester'
    )
    admission_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Admission Number'
    )
    roll_number = models.CharField(
        max_length=50,
        verbose_name='Roll Number'
    )
    registration_number = models.CharField(
        max_length=50,
        verbose_name='Registration Number'
    )
    date_of_birth = models.DateField(
        verbose_name='Date of Birth'
    )
    gender = models.CharField(
        max_length=50,
        choices=Gender.choices,
        verbose_name='Gender'
    )
    phone = models.CharField(
        max_length=20,
        verbose_name='Phone'
    )
    email = models.EmailField(
        verbose_name='Email'
    )
    guardian_name = models.CharField(
        max_length=255,
        verbose_name='Guardian Name'
    )
    guardian_phone = models.CharField(
        max_length=20,
        verbose_name='Guardian Phone'
    )
    address = models.TextField(
        verbose_name='Address'
    )
    admission_date = models.DateField(
        verbose_name='Admission Date'
    )
    current_semester = models.PositiveIntegerField(
        verbose_name='Current Semester'
    )
    profile_photo = models.ImageField(
        upload_to='student_profiles/',
        blank=True,
        null=True,
        verbose_name='Profile Photo'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Is Active'
    )
    approval_status = models.CharField(
        max_length=20,
        choices=StudentApprovalStatus.choices,
        default=StudentApprovalStatus.APPROVED,
        verbose_name='Approval Status',
        help_text=(
            'Pending/Approved/Rejected -- only meaningful for Staff-direct-'
            'created students (Priority 14). Admission-flow students are '
            'Approved on creation, matching prior behaviour.'
        ),
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
        verbose_name = 'Student'
        verbose_name_plural = 'Students'
        ordering = ['admission_number']
        indexes = [
            models.Index(fields=['admission_number']),
            models.Index(fields=['roll_number']),
            models.Index(fields=['department']),
            models.Index(fields=['course']),
            models.Index(fields=['semester']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.admission_number} - {self.user.get_full_name()}"
