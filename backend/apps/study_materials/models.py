import uuid
from django.db import models
from django.db.models import TextChoices


class MaterialType(TextChoices):
    NOTES = 'notes', 'Notes'
    PDF = 'pdf', 'PDF'
    PPT = 'ppt', 'PPT'
    VIDEO = 'video', 'Video'
    LINK = 'link', 'Link'
    OTHER = 'other', 'Other'


class StudyMaterial(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    subject = models.ForeignKey(
        'subjects.Subject',
        on_delete=models.PROTECT,
        related_name='study_materials',
        verbose_name='Subject'
    )
    semester = models.ForeignKey(
        'semester.Semester',
        on_delete=models.PROTECT,
        related_name='study_materials',
        verbose_name='Semester'
    )
    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.PROTECT,
        related_name='study_materials',
        verbose_name='Teacher'
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
    material_type = models.CharField(
        max_length=50,
        choices=MaterialType.choices,
        verbose_name='Material Type'
    )
    file = models.FileField(
        upload_to='study_materials/',
        blank=True,
        null=True,
        verbose_name='File'
    )
    external_url = models.URLField(
        blank=True,
        null=True,
        verbose_name='External URL'
    )
    uploaded_at = models.DateTimeField(
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
        verbose_name = 'Study Material'
        verbose_name_plural = 'Study Materials'
        ordering = ['-uploaded_at', 'subject', 'title']
        indexes = [
            models.Index(fields=['subject']),
            models.Index(fields=['semester']),
            models.Index(fields=['teacher']),
            models.Index(fields=['material_type']),
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.title} - {self.subject.name} ({self.get_material_type_display()})"
