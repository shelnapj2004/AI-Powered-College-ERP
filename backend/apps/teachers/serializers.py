from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import User, UserRole

from .models import Teacher, TeacherSubjectAssignment


class TeacherUserSerializer(serializers.ModelSerializer):
    """Read-only nested representation of the linked User account."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active']
        read_only_fields = fields


class TeacherUserCreateSerializer(serializers.ModelSerializer):
    """
    Write-only serializer used ONLY when Staff creates a new Teacher.

    Teacher.user is a required OneToOneField; Staff provisions the linked
    login account (role=teacher) in the same request, atomically.
    """

    password = serializers.CharField(write_only=True, required=True, min_length=6, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'password']

    def validate(self, attrs):
        if not attrs.get('first_name', '').strip():
            raise serializers.ValidationError({'first_name': 'First name is required.'})
        return attrs


class TeacherUserUpdateSerializer(serializers.ModelSerializer):
    """
    Write-only serializer used when Admin edits an EXISTING Teacher's
    linked User account. Unlike TeacherUserCreateSerializer, no password
    is required here -- password resets go through the dedicated
    set-password endpoint, and both fields stay optional so a partial
    (PATCH) update is possible.
    """

    class Meta:
        model = User
        fields = ['first_name', 'last_name']
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
        }


class TeacherSerializer(serializers.ModelSerializer):
    user = TeacherUserSerializer(read_only=True)
    # Write-only placeholder; the real per-request field (create vs update
    # shape) is swapped in by get_fields() below.
    user_details = TeacherUserCreateSerializer(write_only=True, required=False)

    class Meta:
        model = Teacher
        fields = [
            'id', 'user', 'user_details', 'department', 'employee_id', 'designation',
            'qualification', 'specialization', 'experience_years', 'phone', 'email',
            'address', 'joining_date', 'profile_photo', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_fields(self):
        fields = super().get_fields()
        # user_details is write-only; its shape differs between create
        # (name + password required, provisions a new User) and update
        # (name only, optional -- syncs onto the existing linked User).
        if self.instance is not None:
            fields['user_details'] = TeacherUserUpdateSerializer(write_only=True, required=False)
        return fields

    def validate(self, attrs):
        if self.instance is None and 'user_details' not in attrs:
            raise serializers.ValidationError(
                {'user_details': 'Login account details (first name, last name, password) are required to create a teacher.'}
            )
        return attrs

    def validate_employee_id(self, value):
        instance = self.instance
        queryset = Teacher.objects.filter(employee_id=value)
        if instance:
            queryset = queryset.exclude(id=instance.id)
        if queryset.exists():
            raise serializers.ValidationError('Teacher with this employee ID already exists.')
        return value

    @transaction.atomic
    def create(self, validated_data):
        user_details = validated_data.pop('user_details')
        password = user_details.pop('password')
        employee_id = validated_data['employee_id']
        department = validated_data['department']

        # Username = Employee ID, mirroring the Student ID convention: the
        # backend-managed business identifier IS the login username, never a
        # frontend-supplied/incrementing placeholder like "teacher1".
        if User.objects.filter(username=employee_id).exists():
            raise serializers.ValidationError({'employee_id': f'A login already exists for employee ID {employee_id}.'})

        user = User(
            username=employee_id,
            role=UserRole.TEACHER,
            employee_id=employee_id,
            email=validated_data.get('email') or None,
            phone=validated_data.get('phone', ''),
            department=department.code,
            **user_details,
        )
        user.set_password(password)
        user.save()
        return Teacher.objects.create(user=user, **validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        user_details = validated_data.pop('user_details', None)
        if user_details:
            user = instance.user
            update_fields = []
            if 'first_name' in user_details:
                user.first_name = user_details['first_name']
                update_fields.append('first_name')
            if 'last_name' in user_details:
                user.last_name = user_details['last_name']
                update_fields.append('last_name')
            if update_fields:
                user.save(update_fields=update_fields)
        return super().update(instance, validated_data)


class TeacherSubjectAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for the persistent Teacher <-> Subject assignment
    (Priority 8, Phase D). Nested read-only detail fields mirror the
    convention already used by CourseSerializer/StudentSerializer, so the
    frontend gets real teacher/subject names, not bare UUIDs.
    """
    teacher_detail = TeacherSerializer(source='teacher', read_only=True)
    subject_detail = serializers.SerializerMethodField()

    class Meta:
        model = TeacherSubjectAssignment
        fields = ['id', 'teacher', 'teacher_detail', 'subject', 'subject_detail', 'is_active', 'assigned_at', 'updated_at']
        read_only_fields = ['id', 'assigned_at', 'updated_at']

    def get_subject_detail(self, obj):
        # Local import avoids a circular import between apps.subjects and
        # apps.teachers at module load time.
        from apps.subjects.serializers import SubjectSerializer
        return SubjectSerializer(obj.subject).data

    def validate(self, attrs):
        teacher = attrs.get('teacher', getattr(self.instance, 'teacher', None))
        subject = attrs.get('subject', getattr(self.instance, 'subject', None))
        if teacher and subject and teacher.department_id != subject.course.department_id:
            raise serializers.ValidationError(
                {'subject': 'This subject does not belong to the teacher\'s department.'}
            )
        return attrs
