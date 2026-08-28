import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('students', '0001_initial'),
        ('staff', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Certificate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='ID')),
                ('certificate_number', models.CharField(editable=False, max_length=20, unique=True, verbose_name='Certificate Number')),
                ('certificate_type', models.CharField(choices=[('bonafide', 'Bonafide'), ('character', 'Character'), ('transcript', 'Transcripts'), ('migration', 'Migration')], max_length=20, verbose_name='Certificate Type')),
                ('status', models.CharField(choices=[('ready', 'Ready'), ('issued', 'Issued')], default='ready', max_length=20, verbose_name='Status')),
                ('issued_date', models.DateField(blank=True, null=True, verbose_name='Issued Date')),
                ('requested_at', models.DateTimeField(auto_now_add=True, verbose_name='Requested At')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated At')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='certificates', to='students.student', verbose_name='Student')),
                ('issued_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='issued_certificates', to='staff.staff', verbose_name='Issued By')),
            ],
            options={
                'verbose_name': 'Certificate',
                'verbose_name_plural': 'Certificates',
                'ordering': ['-requested_at'],
            },
        ),
        migrations.AddIndex(
            model_name='certificate',
            index=models.Index(fields=['student'], name='certificate_student_c17a41_idx'),
        ),
        migrations.AddIndex(
            model_name='certificate',
            index=models.Index(fields=['status'], name='certificate_status_5b9c02_idx'),
        ),
        migrations.AddIndex(
            model_name='certificate',
            index=models.Index(fields=['certificate_type'], name='certificate_certifi_8e2f14_idx'),
        ),
        migrations.AddIndex(
            model_name='certificate',
            index=models.Index(fields=['requested_at'], name='certificate_request_3a6d99_idx'),
        ),
    ]
