import uuid
from django.db import models
from django.db.models import TextChoices


class PageType(TextChoices):
    ABOUT = 'about', 'About'
    VISION = 'vision', 'Vision'
    MISSION = 'mission', 'Mission'
    PRINCIPAL_MESSAGE = 'principal_message', 'Principal Message'
    PRIVACY_POLICY = 'privacy_policy', 'Privacy Policy'
    TERMS = 'terms', 'Terms'
    OTHER = 'other', 'Other'


class ContentPage(models.Model):
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
    slug = models.SlugField(
        unique=True,
        max_length=255,
        verbose_name='Slug'
    )
    page_type = models.CharField(
        max_length=50,
        choices=PageType.choices,
        verbose_name='Page Type'
    )
    content = models.TextField(
        verbose_name='Content'
    )
    meta_title = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Meta Title'
    )
    meta_description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Meta Description'
    )
    is_published = models.BooleanField(
        default=False,
        verbose_name='Is Published'
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
        verbose_name = 'Content Page'
        verbose_name_plural = 'Content Pages'
        ordering = ['page_type', 'title']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['page_type']),
            models.Index(fields=['is_published']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_page_type_display()})"
