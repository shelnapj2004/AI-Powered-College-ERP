import uuid
from django.conf import settings
from django.db import models


class DocumentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    VERIFIED = 'verified', 'Verified'
    REJECTED = 'rejected', 'Rejected'


# Priority 14 (Student Onboarding Document Fix): the three documents every
# Student must upload AND get Staff-verified before onboarding is complete.
# Stored as plain strings (matching the existing free-text `document_type`
# field) rather than a new model/enum column, so no migration is needed and
# every other existing (non-mandatory) document type keeps working exactly
# as before.
REQUIRED_DOCUMENT_TYPES = (
    'Birth Certificate',
    'SSLC Result Card',
    'Plus Two Result Card',
)


class StudentDocument(models.Model):
    """Minimal database-backed workflow for Staff Document verification
    (Priority 5). No suitable existing model was found in the codebase, so
    this small dedicated app holds only what the current Staff Documents UI
    needs: which student, which document, its verification status, and who
    verified it.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='Student'
    )
    document_type = models.CharField(
        max_length=255,
        verbose_name='Document Type'
    )
    file = models.FileField(
        upload_to='student_documents/',
        blank=True,
        null=True,
        verbose_name='File'
    )
    status = models.CharField(
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.PENDING,
        verbose_name='Status'
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_documents',
        verbose_name='Verified By'
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
        verbose_name = 'Student Document'
        verbose_name_plural = 'Student Documents'
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['status']),
            models.Index(fields=['requested_at']),
        ]

    def __str__(self):
        return f"{self.document_type} - {self.student}"


def build_required_document_status(student, request=None):
    """
    Authoritative, backend-computed mandatory-document status for a Student
    (Priority 14). A required document only counts once Staff has verified
    it -- an upload alone (`pending`) or a `rejected` upload does NOT count
    as complete, and always resets to needing re-upload.

    Picks the most recently *requested* row per required type as the
    "current" one (a Student re-uploading after rejection creates a new
    row rather than editing the old one -- see StudentDocumentViewSet.
    perform_update).
    """
    rows = list(
        StudentDocument.objects
        .filter(student=student, document_type__in=REQUIRED_DOCUMENT_TYPES)
        .order_by('-requested_at')
    )
    latest_by_type = {}
    for row in rows:
        latest_by_type.setdefault(row.document_type, row)

    items = []
    completed_count = 0
    for doc_type in REQUIRED_DOCUMENT_TYPES:
        doc = latest_by_type.get(doc_type)
        if doc is None:
            status = 'missing'
        elif doc.status == DocumentStatus.VERIFIED:
            status = 'verified'
        elif doc.status == DocumentStatus.REJECTED:
            status = 'rejected'
        else:
            status = 'pending'

        if status == 'verified':
            completed_count += 1

        file_url = None
        if doc is not None and doc.file:
            file_url = doc.file.url
            if request is not None:
                file_url = request.build_absolute_uri(file_url)

        items.append({
            'document_type': doc_type,
            'status': status,
            'document_id': str(doc.id) if doc is not None else None,
            'file': file_url,
            'updated_at': doc.updated_at if doc is not None else None,
        })

    total_required = len(REQUIRED_DOCUMENT_TYPES)
    return {
        'documents': items,
        'completed_count': completed_count,
        'total_required': total_required,
        'is_complete': completed_count == total_required,
    }
