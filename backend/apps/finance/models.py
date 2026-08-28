import uuid
from django.db import models
from django.db.models import TextChoices


class FeeType(TextChoices):
    TUITION = 'tuition', 'Semester Tuition Fee'
    EXAM = 'exam', 'Exam Registration Fee'
    EVENT = 'event', 'Event Fee'


class FeeStructure(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    fee_type = models.CharField(
        max_length=20,
        choices=FeeType.choices,
        default=FeeType.TUITION,
        verbose_name='Fee Type',
        help_text='Which of the three ERP fee types this structure represents '
                   '(Semester Tuition Fee / Exam Registration Fee / Event Fee).',
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.PROTECT,
        related_name='fee_structures',
        verbose_name='Course'
    )
    academic_year = models.ForeignKey(
        'academic_year.AcademicYear',
        on_delete=models.PROTECT,
        related_name='fee_structures',
        verbose_name='Academic Year'
    )
    semester_number = models.PositiveIntegerField(
        verbose_name='Semester Number'
    )
    tuition_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Tuition Fee'
    )
    exam_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Exam Fee'
    )
    library_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Library Fee'
    )
    other_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Other Fee'
    )
    total_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Total Fee'
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
        verbose_name = 'Fee Structure'
        verbose_name_plural = 'Fee Structures'
        ordering = ['course', 'academic_year', 'semester_number', 'fee_type']
        indexes = [
            models.Index(fields=['course']),
            models.Index(fields=['academic_year']),
            models.Index(fields=['semester_number']),
            models.Index(fields=['is_active']),
            models.Index(fields=['fee_type']),
        ]

    def __str__(self):
        return f"{self.get_fee_type_display()} - {self.course} - {self.academic_year} - Semester {self.semester_number}"


class PaymentStatus(TextChoices):
    PENDING = 'pending', 'Pending'
    PARTIAL = 'partial', 'Partial'
    PAID = 'paid', 'Paid'


class PaymentMethod(TextChoices):
    CASH = 'cash', 'Cash'
    CARD = 'card', 'Card'
    UPI = 'upi', 'UPI'
    BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'


class FeePayment(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='fee_payments',
        verbose_name='Student'
    )
    fee_structure = models.ForeignKey(
        FeeStructure,
        on_delete=models.PROTECT,
        related_name='payments',
        verbose_name='Fee Structure'
    )
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Amount Paid'
    )
    payment_method = models.CharField(
        max_length=50,
        choices=PaymentMethod.choices,
        verbose_name='Payment Method'
    )
    payment_status = models.CharField(
        max_length=50,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        verbose_name='Payment Status'
    )
    transaction_reference = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Transaction Reference'
    )
    payment_date = models.DateField(
        verbose_name='Payment Date'
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
        verbose_name = 'Fee Payment'
        verbose_name_plural = 'Fee Payments'
        ordering = ['-payment_date']
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['fee_structure']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['payment_date']),
        ]

    def __str__(self):
        return f"{self.student} - {self.amount_paid} ({self.get_payment_status_display()})"
