"""
Idempotent FeeStructure provisioning.

Root cause of Problem 2 (Staff Issue Fee dropdown empty): migration
0003_seed_fee_type_structures only seeds FeeStructure rows for Semester
combinations that already existed AT MIGRATE TIME. Any Semester created
afterwards (the normal case -- Admin creates Semesters through the UI
after the app is already deployed) never gets the three matching
FeeStructure rows, so the dropdown stays empty even though the seed
migration "ran".

This module is the single source of truth for creating those three rows
for one (course, academic_year, semester_number) combination. It is:
  - called from a post_save signal on Semester (apps/finance/signals.py)
    so every NEW semester gets its fee structures immediately, and
  - called from FeeStructureViewSet.list() as a self-healing bootstrap
    (Option B) so existing Semester rows that predate the signal (or any
    the signal ever missed) are backfilled on the next read, and
  - reusable from a management command for an explicit one-off backfill.

Amounts match migration 0003 exactly -- this is not a new/duplicate
architecture, just the same defaults made reachable outside migrate time.
Never touches a row a user has since edited (get_or_create only fills in
missing rows, defaults are only applied on first creation).
"""
from decimal import Decimal

TUITION_AMOUNT = Decimal('25000.00')
EXAM_AMOUNT = Decimal('1500.00')
EVENT_AMOUNT = Decimal('500.00')
ZERO = Decimal('0.00')


def ensure_fee_structures_for(course_id, academic_year_id, semester_number):
    """get_or_create the tuition/exam/event FeeStructure rows for one
    real (course, academic_year, semester_number) combination. Safe to
    call repeatedly -- never duplicates, never overwrites an edited row.
    """
    from .models import FeeStructure

    if not (course_id and academic_year_id and semester_number):
        return

    FeeStructure.objects.get_or_create(
        course_id=course_id, academic_year_id=academic_year_id,
        semester_number=semester_number, fee_type='tuition',
        defaults=dict(tuition_fee=TUITION_AMOUNT, exam_fee=ZERO, library_fee=ZERO,
                      other_fee=ZERO, total_fee=TUITION_AMOUNT, is_active=True),
    )
    FeeStructure.objects.get_or_create(
        course_id=course_id, academic_year_id=academic_year_id,
        semester_number=semester_number, fee_type='exam',
        defaults=dict(tuition_fee=ZERO, exam_fee=EXAM_AMOUNT, library_fee=ZERO,
                      other_fee=ZERO, total_fee=EXAM_AMOUNT, is_active=True),
    )
    FeeStructure.objects.get_or_create(
        course_id=course_id, academic_year_id=academic_year_id,
        semester_number=semester_number, fee_type='event',
        defaults=dict(tuition_fee=ZERO, exam_fee=ZERO, library_fee=ZERO,
                      other_fee=EVENT_AMOUNT, total_fee=EVENT_AMOUNT, is_active=True),
    )


def ensure_fee_structures_for_all_semesters():
    """Backfill: ensure every real Semester row currently in the database
    has its three FeeStructure rows. Used by the bootstrap-on-read safety
    net and the explicit management command. Reads only real existing
    Semester rows -- creates no Course/AcademicYear/Semester data.
    """
    from apps.semester.models import Semester

    combos = (
        Semester.objects
        .values_list('course_id', 'academic_year_id', 'semester_number')
        .distinct()
    )
    for course_id, academic_year_id, semester_number in combos:
        ensure_fee_structures_for(course_id, academic_year_id, semester_number)
