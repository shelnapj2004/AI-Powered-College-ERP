import uuid
from django.db import models
from django.db.models import TextChoices


class DayOfWeek(TextChoices):
    MONDAY = 'monday', 'Monday'
    TUESDAY = 'tuesday', 'Tuesday'
    WEDNESDAY = 'wednesday', 'Wednesday'
    THURSDAY = 'thursday', 'Thursday'
    FRIDAY = 'friday', 'Friday'
    SATURDAY = 'saturday', 'Saturday'
    SUNDAY = 'sunday', 'Sunday'


class Timetable(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='ID'
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='timetables',
        verbose_name='Department'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.PROTECT,
        related_name='timetables',
        verbose_name='Course'
    )
    semester = models.ForeignKey(
        'semester.Semester',
        on_delete=models.PROTECT,
        related_name='timetables',
        verbose_name='Semester'
    )
    subject = models.ForeignKey(
        'subjects.Subject',
        on_delete=models.PROTECT,
        related_name='timetables',
        verbose_name='Subject'
    )
    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.PROTECT,
        related_name='timetables',
        verbose_name='Teacher'
    )
    day_of_week = models.CharField(
        max_length=50,
        choices=DayOfWeek.choices,
        verbose_name='Day of Week'
    )
    period_number = models.PositiveIntegerField(
        verbose_name='Period Number'
    )
    room_number = models.CharField(
        max_length=50,
        verbose_name='Room Number'
    )
    start_time = models.TimeField(
        verbose_name='Start Time'
    )
    end_time = models.TimeField(
        verbose_name='End Time'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Is Active'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Timetable'
        verbose_name_plural = 'Timetables'
        ordering = ['day_of_week', 'period_number', 'start_time']
        indexes = [
            models.Index(fields=['department']),
            models.Index(fields=['course']),
            models.Index(fields=['semester']),
            models.Index(fields=['subject']),
            models.Index(fields=['teacher']),
            models.Index(fields=['day_of_week']),
            models.Index(fields=['period_number']),
            models.Index(fields=['room_number']),
            models.Index(fields=['start_time']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.get_day_of_week_display()} - Period {self.period_number} - {self.subject.name} ({self.room_number})"
