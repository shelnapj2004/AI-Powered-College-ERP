import uuid
from django.db import models


class Staff(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='staff',
        verbose_name='User'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='staff',
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
        upload_to='staff_profiles/',
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
        verbose_name = 'Staff'
        verbose_name_plural = 'Staff'
        ordering = ['employee_id']
        indexes = [
            models.Index(fields=['employee_id']),
            models.Index(fields=['department']),
            models.Index(fields=['designation']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.employee_id} - {self.user.get_full_name()}"
