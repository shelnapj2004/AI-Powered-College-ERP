import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('subjects', '0001_initial'),
        ('teachers', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TeacherSubjectAssignment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_active', models.BooleanField(default=True, verbose_name='Is Active')),
                ('assigned_at', models.DateTimeField(auto_now_add=True, verbose_name='Assigned At')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated At')),
                ('subject', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='teacher_assignments', to='subjects.subject', verbose_name='Subject')),
                ('teacher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subject_assignments', to='teachers.teacher', verbose_name='Teacher')),
            ],
            options={
                'verbose_name': 'Teacher Subject Assignment',
                'verbose_name_plural': 'Teacher Subject Assignments',
                'ordering': ['teacher', 'subject'],
            },
        ),
        migrations.AddIndex(
            model_name='teachersubjectassignment',
            index=models.Index(fields=['teacher'], name='teachers_tsa_teacher_idx'),
        ),
        migrations.AddIndex(
            model_name='teachersubjectassignment',
            index=models.Index(fields=['subject'], name='teachers_tsa_subject_idx'),
        ),
        migrations.AddIndex(
            model_name='teachersubjectassignment',
            index=models.Index(fields=['is_active'], name='teachers_tsa_active_idx'),
        ),
        migrations.AddConstraint(
            model_name='teachersubjectassignment',
            constraint=models.UniqueConstraint(fields=('teacher', 'subject'), name='unique_teacher_subject_assignment'),
        ),
    ]
