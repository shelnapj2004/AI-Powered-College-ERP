import uuid
from django.db import models
from django.db.models import TextChoices


class SenderType(TextChoices):
    USER = 'user', 'User'
    AI = 'ai', 'AI'


class ChatSession(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='chat_sessions',
        verbose_name='User'
    )
    title = models.CharField(
        max_length=255,
        verbose_name='Title'
    )
    started_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Started At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Is Active'
    )

    class Meta:
        verbose_name = 'Chat Session'
        verbose_name_plural = 'Chat Sessions'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['is_active']),
            models.Index(fields=['started_at']),
            models.Index(fields=['updated_at']),
        ]

    def __str__(self):
        return f"{self.title} ({self.user})"


class ChatMessage(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    chat_session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Chat Session'
    )
    sender_type = models.CharField(
        max_length=50,
        choices=SenderType.choices,
        verbose_name='Sender Type'
    )
    message = models.TextField(
        verbose_name='Message'
    )
    response_time_ms = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name='Response Time (ms)'
    )
    token_count = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name='Token Count'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )

    class Meta:
        verbose_name = 'Chat Message'
        verbose_name_plural = 'Chat Messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['chat_session']),
            models.Index(fields=['sender_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.get_sender_type_display()}: {self.message[:50]}..."
