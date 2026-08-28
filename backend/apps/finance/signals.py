from django.db.models.signals import post_save
from django.dispatch import receiver


def connect():
    """Connect the Semester -> FeeStructure provisioning signal.

    Imported lazily from FinanceConfig.ready() so app-loading order never
    matters (apps.semester is a separate app, imported here rather than
    at module import time to avoid AppRegistryNotReady).
    """
    from apps.semester.models import Semester
    from .services import ensure_fee_structures_for

    @receiver(post_save, sender=Semester, dispatch_uid='finance_ensure_fee_structures_on_semester_save')
    def _on_semester_saved(sender, instance, **kwargs):
        # Whenever Admin creates (or edits) a Semester -- via /admin/semesters
        # or the API directly -- make sure the three real FeeStructure rows
        # (tuition/exam/event) exist for it. This is the fix for Problem 2:
        # previously only migration 0003 created these, and only for
        # Semesters that already existed at migrate time.
        ensure_fee_structures_for(instance.course_id, instance.academic_year_id, instance.semester_number)
