import uuid
from django.db import models


class ContactMessage(models.Model):
    """Public /contact form submission (Priority 14). No suitable existing
    model was found in the codebase, so this small dedicated app holds only
    what the current public Contact form + Staff Contact page need.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    name = models.CharField(
        max_length=255,
        verbose_name='Full Name'
    )
    email = models.EmailField(
        verbose_name='Email Address'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name='Phone Number'
    )
    subject = models.CharField(
        max_length=255,
        verbose_name='Subject'
    )
    message = models.TextField(
        verbose_name='Message'
    )
    is_read = models.BooleanField(
        default=False,
        verbose_name='Is Read'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )

    class Meta:
        verbose_name = 'Contact Message'
        verbose_name_plural = 'Contact Messages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['is_read']),
        ]

    def __str__(self):
        return f"{self.subject} - {self.name}"
