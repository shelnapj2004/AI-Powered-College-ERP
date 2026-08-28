import uuid
from django.db import models
from django.db.models import TextChoices


class ImageCategory(TextChoices):
    CAMPUS = 'campus', 'Campus'
    EVENT = 'event', 'Event'
    LAB = 'lab', 'Lab'
    SPORTS = 'sports', 'Sports'
    CULTURAL = 'cultural', 'Cultural'
    OTHER = 'other', 'Other'


class GalleryImage(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    title = models.CharField(
        max_length=255,
        verbose_name='Title'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Description'
    )
    category = models.CharField(
        max_length=50,
        choices=ImageCategory.choices,
        verbose_name='Category'
    )
    image = models.ImageField(
        upload_to='gallery/',
        verbose_name='Image'
    )
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gallery_images',
        verbose_name='Uploaded By'
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Uploaded At'
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
        verbose_name = 'Gallery Image'
        verbose_name_plural = 'Gallery Images'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_category_display()})"
