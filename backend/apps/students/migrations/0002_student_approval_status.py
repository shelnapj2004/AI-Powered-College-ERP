# Priority 14: adds Student.approval_status (pending/approved/rejected).
# Default 'approved' preserves every existing Student row exactly as-is --
# only new Staff-direct-created students (Priority 14) start as 'pending'.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='approval_status',
            field=models.CharField(
                choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
                default='approved',
                help_text=(
                    'Pending/Approved/Rejected -- only meaningful for Staff-direct-'
                    'created students (Priority 14). Admission-flow students are '
                    'Approved on creation, matching prior behaviour.'
                ),
                max_length=20,
                verbose_name='Approval Status',
            ),
        ),
    ]
