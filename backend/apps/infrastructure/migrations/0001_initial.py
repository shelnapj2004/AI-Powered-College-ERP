# Generated manually (no Django available in this environment) to match
# the project's existing migration conventions -- see apps/departments/
# migrations/0001_initial.py for the template this was based on.

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Facility',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Facility Name')),
                ('facility_type', models.CharField(max_length=100, verbose_name='Type')),
                ('capacity', models.CharField(blank=True, max_length=100, verbose_name='Capacity')),
                ('status', models.CharField(choices=[('operational', 'Operational'), ('under_maintenance', 'Under Maintenance')], default='operational', max_length=30, verbose_name='Status')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created At')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated At')),
            ],
            options={
                'verbose_name': 'Facility',
                'verbose_name_plural': 'Facilities',
                'ordering': ['name'],
            },
        ),
        migrations.AddIndex(
            model_name='facility',
            index=models.Index(fields=['facility_type'], name='infra_facility_type_idx'),
        ),
        migrations.AddIndex(
            model_name='facility',
            index=models.Index(fields=['status'], name='infra_facility_status_idx'),
        ),
    ]
