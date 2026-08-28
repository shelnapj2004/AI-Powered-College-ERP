from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import UserRole
from apps.departments.serializers import DepartmentSerializer
from apps.teachers.models import Teacher
from apps.teachers.serializers import TeacherUserSerializer

from .models import HOD


class HODTeacherSerializer(serializers.ModelSerializer):
    """Read-only nested representation of the linked Teacher (and its User)."""

    user = TeacherUserSerializer(read_only=True)

    class Meta:
        model = Teacher
        fields = ['id', 'user', 'employee_id', 'designation', 'department']
        read_only_fields = fields


class HODSerializer(serializers.ModelSerializer):
    """
    HOD CRUD.

    Business rule: an HOD is promoted FROM an existing Teacher record --
    Staff selects a Teacher, and that Teacher's own login account (role
    changed from 'teacher' to 'hod') becomes the HOD login. This preserves
    the existing User<->Teacher relationship instead of creating a second,
    disconnected account for the same person.
    """

    teacher_detail = HODTeacherSerializer(source='teacher', read_only=True)
    department_detail = DepartmentSerializer(source='department', read_only=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = HOD
        fields = [
            'id', 'user', 'teacher', 'teacher_detail', 'department', 'department_detail',
            'office_phone', 'office_location', 'appointment_date', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def validate_teacher(self, teacher: Teacher):
        if hasattr(teacher, 'hod_details'):
            raise serializers.ValidationError('This teacher is already assigned as an HOD.')
        return teacher

    def validate(self, attrs):
        teacher = attrs.get('teacher') or (self.instance.teacher if self.instance else None)
        department = attrs.get('department') or (self.instance.department if self.instance else None)
        if teacher and department and teacher.department_id != department.id:
            raise serializers.ValidationError(
                {'department': 'HOD department must match the selected teacher\'s department.'}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        teacher: Teacher = validated_data['teacher']
        user = teacher.user
        user.role = UserRole.HOD
        user.save(update_fields=['role'])
        return HOD.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('teacher', None)  # the User<->Teacher link is fixed at creation time
        return super().update(instance, validated_data)


class HODSetPasswordSerializer(serializers.Serializer):
    """Staff/Admin resets an HOD's login password. Never echoes it back."""

    password = serializers.CharField(write_only=True, min_length=6, style={'input_type': 'password'})

    def save(self, **kwargs):
        hod: HOD = self.context['hod']
        hod.user.set_password(self.validated_data['password'])
        hod.user.save(update_fields=['password'])
        return hod
