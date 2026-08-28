import uuid
from django.conf import settings
from django.db import models


class CertificateType(models.TextChoices):
    BONAFIDE = 'bonafide', 'Bonafide'
    CHARACTER = 'character', 'Character'
    TRANSCRIPT = 'transcript', 'Transcripts'
    MIGRATION = 'migration', 'Migration'


class CertificateStatus(models.TextChoices):
    READY = 'ready', 'Ready'
    ISSUED = 'issued', 'Issued'


def _generate_certificate_number():
    """Server-generated, human-readable certificate number. Never trusted
    from the frontend. Retries on the rare collision instead of relying on
    a DB sequence, since the existing project convention is UUID primary
    keys rather than integer sequences."""
    from django.utils.crypto import get_random_string

    while True:
        candidate = f"CERT{get_random_string(6, allowed_chars='0123456789')}"
        if not Certificate.objects.filter(certificate_number=candidate).exists():
            return candidate


class Certificate(models.Model):
    """Minimal database-backed Staff Certificate issuance workflow
    (Priority 11). No suitable existing model was found in the codebase
    (apps.documents.StudentDocument is a document-verification workflow,
    not certificate issuance), so this small dedicated app holds only what
    the Staff/Admin Certificate Management UI needs.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    certificate_number = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        verbose_name='Certificate Number'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='certificates',
        verbose_name='Student'
    )
    certificate_type = models.CharField(
        max_length=20,
        choices=CertificateType.choices,
        verbose_name='Certificate Type'
    )
    status = models.CharField(
        max_length=20,
        choices=CertificateStatus.choices,
        default=CertificateStatus.READY,
        verbose_name='Status'
    )
    issued_by = models.ForeignKey(
        'staff.Staff',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issued_certificates',
        verbose_name='Issued By'
    )
    issued_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Issued Date'
    )
    requested_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Requested At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Certificate'
        verbose_name_plural = 'Certificates'
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['status']),
            models.Index(fields=['certificate_type']),
            models.Index(fields=['requested_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.certificate_number:
            self.certificate_number = _generate_certificate_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.certificate_number} - {self.student}"
