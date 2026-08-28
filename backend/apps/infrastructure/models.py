import uuid
from django.db import models
from django.db.models import TextChoices


class FacilityStatus(TextChoices):
    OPERATIONAL = 'operational', 'Operational'
    UNDER_MAINTENANCE = 'under_maintenance', 'Under Maintenance'


class Facility(models.Model):
    """
    Minimal campus-facility record backing Admin Infrastructure Management.
    Only the fields the existing Admin UI actually uses (name, type,
    capacity, status) -- no larger facilities-management system.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    name = models.CharField(
        max_length=255,
        verbose_name='Facility Name'
    )
    facility_type = models.CharField(
        max_length=100,
        verbose_name='Type'
    )
    capacity = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Capacity'
    )
    status = models.CharField(
        max_length=30,
        choices=FacilityStatus.choices,
        default=FacilityStatus.OPERATIONAL,
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
        verbose_name = 'Facility'
        verbose_name_plural = 'Facilities'
        ordering = ['name']
        indexes = [
            models.Index(fields=['facility_type']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"
