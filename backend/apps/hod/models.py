import uuid
from django.db import models


class HOD(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='hod_profile',
        verbose_name='User'
    )
    teacher = models.OneToOneField(
        'teachers.Teacher',
        on_delete=models.CASCADE,
        related_name='hod_details',
        verbose_name='Teacher'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='hods',
        verbose_name='Department'
    )
    office_phone = models.CharField(
        max_length=20,
        verbose_name='Office Phone'
    )
    office_location = models.CharField(
        max_length=255,
        verbose_name='Office Location'
    )
    appointment_date = models.DateField(
        verbose_name='Appointment Date'
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
        verbose_name = 'Head of Department'
        verbose_name_plural = 'Heads of Department'
        ordering = ['department']
        indexes = [
            models.Index(fields=['department']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.department.name} - {self.user.get_full_name()}"
