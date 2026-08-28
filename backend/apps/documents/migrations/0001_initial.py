import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('students', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='StudentDocument',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_type', models.CharField(max_length=255, verbose_name='Document Type')),
                ('file', models.FileField(blank=True, null=True, upload_to='student_documents/', verbose_name='File')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('verified', 'Verified'), ('rejected', 'Rejected')], default='pending', max_length=20, verbose_name='Status')),
                ('requested_at', models.DateTimeField(auto_now_add=True, verbose_name='Requested At')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated At')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='students.student', verbose_name='Student')),
                ('verified_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='verified_documents', to=settings.AUTH_USER_MODEL, verbose_name='Verified By')),
            ],
            options={
                'verbose_name': 'Student Document',
                'verbose_name_plural': 'Student Documents',
                'ordering': ['-requested_at'],
            },
        ),
        migrations.AddIndex(
            model_name='studentdocument',
            index=models.Index(fields=['student'], name='documents_s_student_2f6b3a_idx'),
        ),
        migrations.AddIndex(
            model_name='studentdocument',
            index=models.Index(fields=['status'], name='documents_s_status_9b1c47_idx'),
        ),
        migrations.AddIndex(
            model_name='studentdocument',
            index=models.Index(fields=['requested_at'], name='documents_s_request_5e8d21_idx'),
        ),
    ]
