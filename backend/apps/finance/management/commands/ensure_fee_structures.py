from django.core.management.base import BaseCommand

from apps.finance.services import ensure_fee_structures_for_all_semesters


class Command(BaseCommand):
    help = (
        'Idempotently ensure every real Semester has its three FeeStructure '
        'rows (tuition / exam / event). Safe to run any number of times -- '
        'only fills in missing rows via get_or_create, never duplicates or '
        'overwrites an edited FeeStructure. Use this to backfill Semesters '
        'that were created before the finance post_save signal existed.'
    )

    def handle(self, *args, **options):
        ensure_fee_structures_for_all_semesters()
        self.stdout.write(self.style.SUCCESS('FeeStructure rows ensured for all existing Semesters.'))
