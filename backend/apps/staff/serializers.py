from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import User, UserRole
from apps.departments.serializers import DepartmentSerializer
from apps.teachers.serializers import TeacherUserSerializer

from .models import Staff


class StaffUserCreateSerializer(serializers.ModelSerializer):
    """
    Write-only serializer used ONLY when Admin creates a new Staff account.

    Staff accounts (the ERP operators who manage Students/Teachers/HODs) are
    provisioned by Admin, not by other Staff -- consistent with "Staff must
    NOT have unrestricted Admin privileges."
    """

    password = serializers.CharField(write_only=True, required=True, min_length=6, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'password']


class StaffSerializer(serializers.ModelSerializer):
    user = TeacherUserSerializer(read_only=True)
    department_detail = DepartmentSerializer(source='department', read_only=True)
    user_details = StaffUserCreateSerializer(write_only=True, required=False)

    class Meta:
        model = Staff
        fields = [
            'id', 'user', 'user_details', 'department', 'department_detail', 'employee_id',
            'designation', 'phone', 'email', 'address', 'joining_date', 'profile_photo',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        if self.instance is None and 'user_details' not in attrs:
            raise serializers.ValidationError(
                {'user_details': 'Login account details (first name, last name, password) are required to create a staff member.'}
            )
        return attrs

    def validate_employee_id(self, value):
        instance = self.instance
        queryset = Staff.objects.filter(employee_id=value)
        if instance:
            queryset = queryset.exclude(id=instance.id)
        if queryset.exists():
            raise serializers.ValidationError('Staff member with this employee ID already exists.')
        return value

    @transaction.atomic
    def create(self, validated_data):
        user_details = validated_data.pop('user_details')
        password = user_details.pop('password')
        employee_id = validated_data['employee_id']
        department = validated_data['department']

        if User.objects.filter(username=employee_id).exists():
            raise serializers.ValidationError({'employee_id': f'A login already exists for employee ID {employee_id}.'})

        user = User(
            username=employee_id,
            role=UserRole.STAFF,
            employee_id=employee_id,
            email=validated_data.get('email') or None,
            phone=validated_data.get('phone', ''),
            department=department.code,
            **user_details,
        )
        user.set_password(password)
        user.save()
        return Staff.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('user_details', None)
        return super().update(instance, validated_data)
