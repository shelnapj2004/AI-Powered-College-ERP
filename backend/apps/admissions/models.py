import uuid
from django.db import models
from django.db.models import TextChoices


class AdmissionType(TextChoices):
    REGULAR = 'regular', 'Regular'
    LATERAL = 'lateral', 'Lateral'
    MANAGEMENT = 'management', 'Management'


class AdmissionStatus(TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    CANCELLED = 'cancelled', 'Cancelled'


class Gender(TextChoices):
    MALE = 'male', 'Male'
    FEMALE = 'female', 'Female'
    OTHER = 'other', 'Other'


class Admission(models.Model):
    """
    Registration/application record created by ADMIN.

    Business workflow (see project brief):
        ADMIN -> Student Registration Form -> Admission record (this model)
        STAFF -> Student Management -> reviews Admission -> creates login
                 account (User + Student), which is then linked back here
                 via `student`.

    `student` is intentionally nullable: an Admission exists *before* any
    User/Student account is created. `student` is populated only once Staff
    processes the registration and creates the account — at that point
    `account_created` becomes True and the record shows up as such in the
    Staff UI.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    student = models.OneToOneField(
        'students.Student',
        on_delete=models.SET_NULL,
        related_name='admission',
        verbose_name='Student',
        null=True,
        blank=True,
        help_text='Populated once Staff creates the login account for this registration.',
    )

    # --- Applicant/registration data (captured by Admin at registration time,
    # before any User/Student account exists) ---
    first_name = models.CharField(max_length=150, verbose_name='First Name', default='')
    last_name = models.CharField(max_length=150, verbose_name='Last Name', blank=True, default='')
    email = models.EmailField(verbose_name='Email', default='')
    phone = models.CharField(max_length=20, verbose_name='Phone', default='')
    date_of_birth = models.DateField(verbose_name='Date of Birth', null=True, blank=True)
    gender = models.CharField(max_length=50, choices=Gender.choices, verbose_name='Gender', default=Gender.OTHER)
    guardian_name = models.CharField(max_length=255, verbose_name='Guardian Name', blank=True, default='')
    guardian_phone = models.CharField(max_length=20, verbose_name='Guardian Phone', blank=True, default='')
    address = models.TextField(verbose_name='Address', blank=True, default='')
    roll_number = models.CharField(
        max_length=50,
        verbose_name='Roll Number',
        blank=True,
        default='',
        help_text='Used, together with department + joining year, to generate the Student ID.',
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='admissions',
        verbose_name='Department'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.PROTECT,
        related_name='admissions',
        verbose_name='Course'
    )
    academic_year = models.ForeignKey(
        'academic_year.AcademicYear',
        on_delete=models.PROTECT,
        related_name='admissions',
        verbose_name='Academic Year'
    )
    application_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Application Number'
    )
    admission_date = models.DateField(
        verbose_name='Admission Date'
    )
    admission_type = models.CharField(
        max_length=50,
        choices=AdmissionType.choices,
        verbose_name='Admission Type'
    )
    admission_status = models.CharField(
        max_length=50,
        choices=AdmissionStatus.choices,
        default=AdmissionStatus.PENDING,
        verbose_name='Admission Status'
    )
    previous_school = models.CharField(
        max_length=255,
        verbose_name='Previous School'
    )
    previous_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='Previous Percentage'
    )
    entrance_exam_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name='Entrance Exam Score'
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
        verbose_name = 'Admission'
        verbose_name_plural = 'Admissions'
        ordering = ['application_number']
        indexes = [
            models.Index(fields=['application_number']),
            models.Index(fields=['department']),
            models.Index(fields=['course']),
            models.Index(fields=['academic_year']),
            models.Index(fields=['admission_type']),
            models.Index(fields=['admission_status']),
        ]

    def __str__(self):
        return f"{self.application_number} - {self.full_name}"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def account_created(self) -> bool:
        return self.student_id is not None
