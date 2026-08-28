import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0001_initial'),
        ('admissions', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='admission',
            name='student',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='admission',
                to='students.student',
                verbose_name='Student',
                help_text='Populated once Staff creates the login account for this registration.',
            ),
        ),
        migrations.AddField(
            model_name='admission',
            name='first_name',
            field=models.CharField(default='', max_length=150, verbose_name='First Name'),
        ),
        migrations.AddField(
            model_name='admission',
            name='last_name',
            field=models.CharField(blank=True, default='', max_length=150, verbose_name='Last Name'),
        ),
        migrations.AddField(
            model_name='admission',
            name='email',
            field=models.EmailField(default='', max_length=254, verbose_name='Email'),
        ),
        migrations.AddField(
            model_name='admission',
            name='phone',
            field=models.CharField(default='', max_length=20, verbose_name='Phone'),
        ),
        migrations.AddField(
            model_name='admission',
            name='date_of_birth',
            field=models.DateField(blank=True, null=True, verbose_name='Date of Birth'),
        ),
        migrations.AddField(
            model_name='admission',
            name='gender',
            field=models.CharField(
                choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')],
                default='other',
                max_length=50,
                verbose_name='Gender',
            ),
        ),
        migrations.AddField(
            model_name='admission',
            name='guardian_name',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='Guardian Name'),
        ),
        migrations.AddField(
            model_name='admission',
            name='guardian_phone',
            field=models.CharField(blank=True, default='', max_length=20, verbose_name='Guardian Phone'),
        ),
        migrations.AddField(
            model_name='admission',
            name='address',
            field=models.TextField(blank=True, default='', verbose_name='Address'),
        ),
        migrations.AddField(
            model_name='admission',
            name='roll_number',
            field=models.CharField(
                blank=True,
                default='',
                max_length=50,
                help_text='Used, together with department + joining year, to generate the Student ID.',
                verbose_name='Roll Number',
            ),
        ),
    ]
