from decimal import Decimal

from django.db import migrations


# Default amounts (INR) for the three ERP fee types. These are starting
# values only -- Admin/Staff can edit any FeeStructure row afterwards
# through the existing FeeStructure admin/API exactly like any other
# fee structure. No student, course, or academic year data is invented
# here; this migration only reads real existing Semester/Course/
# AcademicYear rows and creates FeeStructure rows against them.
TUITION_AMOUNT = Decimal('25000.00')
EXAM_AMOUNT = Decimal('1500.00')
EVENT_AMOUNT = Decimal('500.00')

ZERO = Decimal('0.00')


def seed_fee_type_structures(apps, schema_editor):
    Semester = apps.get_model('semester', 'Semester')
    FeeStructure = apps.get_model('finance', 'FeeStructure')

    # Every real (course, academic_year, semester_number) combination that
    # actually exists in the database today -- e.g. every semester any
    # course has actually run. No invented courses/years/semesters.
    combos = (
        Semester.objects
        .values_list('course_id', 'academic_year_id', 'semester_number')
        .distinct()
    )

    for course_id, academic_year_id, semester_number in combos:
        # tuition -> real tuition_fee component, total_fee mirrors it
        FeeStructure.objects.get_or_create(
            course_id=course_id,
            academic_year_id=academic_year_id,
            semester_number=semester_number,
            fee_type='tuition',
            defaults=dict(
                tuition_fee=TUITION_AMOUNT,
                exam_fee=ZERO,
                library_fee=ZERO,
                other_fee=ZERO,
                total_fee=TUITION_AMOUNT,
                is_active=True,
            ),
        )
        # exam -> real exam_fee component, total_fee mirrors it
        FeeStructure.objects.get_or_create(
            course_id=course_id,
            academic_year_id=academic_year_id,
            semester_number=semester_number,
            fee_type='exam',
            defaults=dict(
                tuition_fee=ZERO,
                exam_fee=EXAM_AMOUNT,
                library_fee=ZERO,
                other_fee=ZERO,
                total_fee=EXAM_AMOUNT,
                is_active=True,
            ),
        )
        # event -> the model has no dedicated event-fee column, so the
        # existing "other_fee" component (smallest architecture-compatible
        # choice, per the existing aggregate FeeStructure design) is used
        # to represent it; total_fee mirrors it.
        FeeStructure.objects.get_or_create(
            course_id=course_id,
            academic_year_id=academic_year_id,
            semester_number=semester_number,
            fee_type='event',
            defaults=dict(
                tuition_fee=ZERO,
                exam_fee=ZERO,
                library_fee=ZERO,
                other_fee=EVENT_AMOUNT,
                total_fee=EVENT_AMOUNT,
                is_active=True,
            ),
        )


def unseed_fee_type_structures(apps, schema_editor):
    # Reversal only removes rows this migration itself would have created
    # (identified by fee_type + the known default amounts), never touches
    # any FeeStructure a real user has since edited away from these
    # defaults, and never touches unrelated FeeStructure rows.
    FeeStructure = apps.get_model('finance', 'FeeStructure')
    FeeStructure.objects.filter(fee_type='tuition', tuition_fee=TUITION_AMOUNT, exam_fee=ZERO, library_fee=ZERO, other_fee=ZERO, total_fee=TUITION_AMOUNT).delete()
    FeeStructure.objects.filter(fee_type='exam', tuition_fee=ZERO, exam_fee=EXAM_AMOUNT, library_fee=ZERO, other_fee=ZERO, total_fee=EXAM_AMOUNT).delete()
    FeeStructure.objects.filter(fee_type='event', tuition_fee=ZERO, exam_fee=ZERO, library_fee=ZERO, other_fee=EVENT_AMOUNT, total_fee=EVENT_AMOUNT).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0002_alter_feestructure_options_feestructure_fee_type_and_more'),
        ('semester', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_fee_type_structures, unseed_fee_type_structures),
    ]
