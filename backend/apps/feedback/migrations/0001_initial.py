# Generated for Priority 4 (Teacher Feedback real-data backend)

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('students', '0001_initial'),
        ('teachers', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TeacherFeedback',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.PositiveSmallIntegerField(verbose_name='Rating')),
                ('comment', models.TextField(verbose_name='Comment')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created At')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated At')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feedback_given', to='students.student', verbose_name='Student')),
                ('teacher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feedback_received', to='teachers.teacher', verbose_name='Teacher')),
            ],
            options={
                'verbose_name': 'Teacher Feedback',
                'verbose_name_plural': 'Teacher Feedback',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='teacherfeedback',
            index=models.Index(fields=['teacher'], name='feedback_te_teacher_idx'),
        ),
        migrations.AddIndex(
            model_name='teacherfeedback',
            index=models.Index(fields=['student'], name='feedback_te_student_idx'),
        ),
        migrations.AddIndex(
            model_name='teacherfeedback',
            index=models.Index(fields=['created_at'], name='feedback_te_created_idx'),
        ),
        migrations.AddConstraint(
            model_name='teacherfeedback',
            constraint=models.UniqueConstraint(fields=('teacher', 'student'), name='unique_feedback_per_student_teacher'),
        ),
        migrations.AddConstraint(
            model_name='teacherfeedback',
            constraint=models.CheckConstraint(check=models.Q(('rating__gte', 1)) & models.Q(('rating__lte', 5)), name='feedback_rating_1_to_5'),
        ),
    ]
