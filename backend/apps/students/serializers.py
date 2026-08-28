from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User, UserRole
from apps.admissions.models import Admission
from apps.courses.models import Course
from apps.courses.serializers import CourseSerializer
from apps.departments.models import Department
from apps.departments.serializers import DepartmentSerializer
from apps.semester.serializers import SemesterSerializer
from apps.semester.models import Semester

from .models import Student, StudentApprovalStatus
from .services import generate_unique_student_id


class StudentUserSerializer(serializers.ModelSerializer):
    """Read-only nested representation of the linked User account."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']
        read_only_fields = fields


class StudentSerializer(serializers.ModelSerializer):
    # Read-only nested representations so the frontend gets real names, not bare UUIDs.
    user = StudentUserSerializer(read_only=True)
    department_detail = DepartmentSerializer(source='department', read_only=True)
    course_detail = CourseSerializer(source='course', read_only=True)
    semester_detail = SemesterSerializer(source='semester', read_only=True)
    student_id = serializers.CharField(source='user.student_id', read_only=True)

    class Meta:
        model = Student
        fields = [
            'id', 'user', 'student_id',
            'department', 'department_detail',
            'course', 'course_detail',
            'semester', 'semester_detail',
            'admission_number', 'roll_number', 'registration_number',
            'date_of_birth', 'gender', 'phone', 'email',
            'guardian_name', 'guardian_phone', 'address',
            'admission_date', 'current_semester', 'profile_photo',
            'is_active', 'approval_status', 'created_at', 'updated_at',
        ]
        # `approval_status` is deliberately read-only here -- it can only be
        # changed via the dedicated approve/reject actions (Admin-only), so
        # Staff can never approve their own Staff-created student through a
        # generic PATCH.
        read_only_fields = ['id', 'approval_status', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Direct creation is intentionally not supported: a Student account
        # can ONLY be created via the "create account" workflow (Admin
        # registration -> Staff review -> POST /students/create-account/),
        # which generates the Student ID on the backend and provisions the
        # linked User atomically. See StudentViewSet.create_account.
        raise serializers.ValidationError(
            'Students cannot be created directly. Use POST /api/v1/students/create-account/ '
            'with a registered admission ID to create a student login account.'
        )

    def validate_current_semester(self, value):
        if value <= 0:
            raise serializers.ValidationError('Current semester must be positive.')
        return value

    def validate_admission_number(self, value):
        instance = self.instance
        queryset = Student.objects.filter(admission_number=value)
        if instance:
            queryset = queryset.exclude(id=instance.id)
        if queryset.exists():
            raise serializers.ValidationError('Student with this admission number already exists.')
        return value


class StudentAccountCreateSerializer(serializers.Serializer):
    """
    STAFF creates a Student login account, in one of two supported flows:

    FLOW A -- ADMISSION-BACKED (unchanged from before Priority 14):
      ADMIN registers an Admission -> STAFF reviews it -> STAFF supplies
      `admission` (+ semester + password) here. Student data is copied from
      the reviewed Admission record. Approved immediately (`approval_status`
      = APPROVED), exactly as before -- the Admission review IS the review.

    FLOW B -- STAFF-DIRECT (Priority 14, new):
      STAFF enters the student's details directly -- no Admission record
      required/used. `admission` is omitted; `first_name`, `department`,
      `course`, `date_of_birth`, `guardian_name`, `guardian_phone`, etc. are
      supplied instead. The resulting Student starts life
      `approval_status` = PENDING and the linked User is created with
      `is_active=False`, so the account cannot log in (Django's auth
      backend rejects inactive users) until Admin approves it via
      StudentViewSet.approve.

    Either way the backend:
      1. Generates the canonical Student ID (EDU21MCA-I006 format) from
         department code + joining year + roll number -- never trusted
         from the frontend.
      2. Creates the User (username = generated Student ID, role=student)
         with a securely hashed password.
      3. Creates the Student profile.
      4. (Flow A only) Links the Admission back to the new Student record.

    All in a single atomic transaction: if any step fails, nothing is
    persisted (no orphan User, no orphan Student).
    """

    admission = serializers.PrimaryKeyRelatedField(
        queryset=Admission.objects.filter(student__isnull=True), required=False, allow_null=True,
    )
    semester = serializers.PrimaryKeyRelatedField(queryset=Semester.objects.none())
    password = serializers.CharField(write_only=True, min_length=6, style={'input_type': 'password'})
    roll_number = serializers.CharField(required=False, allow_blank=True)
    registration_number = serializers.CharField(required=False, allow_blank=True)
    current_semester = serializers.IntegerField(required=False, min_value=1, default=1)

    # --- Flow B (Staff-direct) only: ignored/overridden by Admission data
    # in Flow A. Not required at the field level since Flow A doesn't need
    # them -- cross-checked in validate() depending on which flow applies.
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    guardian_name = serializers.CharField(required=False, allow_blank=True)
    guardian_phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False)
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), required=False)
    admission_date = serializers.DateField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Local import to avoid app-loading order issues at module import time.
        from apps.semester.models import Semester
        self.fields['semester'].queryset = Semester.objects.all()

    def validate_admission(self, admission: Admission):
        if admission is not None and admission.student_id is not None:  # FK column, not the Student ID string
            raise serializers.ValidationError('This registration already has a login account.')
        return admission

    def validate(self, attrs):
        admission = attrs.get('admission')

        if admission is not None:
            return self._validate_flow_a_admission(attrs, admission)
        return self._validate_flow_b_direct(attrs)

    def _validate_flow_a_admission(self, attrs, admission: Admission):
        roll_number = attrs.get('roll_number') or admission.roll_number
        if not roll_number:
            raise serializers.ValidationError(
                {'roll_number': 'Roll number is required (either on the registration or supplied here) to generate the Student ID.'}
            )
        attrs['roll_number'] = roll_number
        attrs['registration_number'] = attrs.get('registration_number') or admission.application_number

        required_admission_fields = {
            'first_name': admission.first_name,
            'email': admission.email,
            'phone': admission.phone,
            'date_of_birth': admission.date_of_birth,
            'guardian_name': admission.guardian_name,
            'guardian_phone': admission.guardian_phone,
            'address': admission.address,
        }
        # Staff may fill in any of these directly in this same request if
        # the Admission record is missing them, instead of being blocked
        # entirely -- avoids forcing Staff back to Admin just to patch a
        # registration for a field that's easy to supply at account-creation
        # time. Values explicitly supplied here take priority.
        missing = [
            name for name, admission_value in required_admission_fields.items()
            if not admission_value and not attrs.get(name)
        ]
        if missing:
            raise serializers.ValidationError(
                {'admission': f'Registration is missing required field(s) before an account can be created: {", ".join(missing)}. '
                               'Supply them directly in this request, or update the registration first.'}
            )
        return attrs

    def _validate_flow_b_direct(self, attrs):
        required_fields = ['first_name', 'department', 'course', 'date_of_birth', 'gender',
                            'phone', 'email', 'guardian_name', 'guardian_phone', 'address']
        missing = [name for name in required_fields if not attrs.get(name)]
        if missing:
            raise serializers.ValidationError(
                {name: 'This field is required to create a student directly (without a registration).' for name in missing}
            )
        roll_number = attrs.get('roll_number')
        if not roll_number:
            raise serializers.ValidationError(
                {'roll_number': 'Roll number is required to generate the Student ID.'}
            )
        attrs.setdefault('admission_date', timezone.now().date())
        return attrs

    @transaction.atomic
    def save(self, **kwargs) -> Student:
        admission = self.validated_data.get('admission')
        if admission is not None:
            return self._save_flow_a_admission(admission)
        return self._save_flow_b_direct()

    def _save_flow_a_admission(self, admission: Admission) -> Student:
        semester = self.validated_data['semester']
        password = self.validated_data['password']
        roll_number = self.validated_data['roll_number']
        registration_number = self.validated_data['registration_number']
        current_semester = self.validated_data['current_semester']
        # Staff-supplied overrides take priority over the Admission record
        # (used to fill in fields the registration was missing).
        v = self.validated_data
        date_of_birth = v.get('date_of_birth') or admission.date_of_birth
        guardian_name = v.get('guardian_name') or admission.guardian_name
        guardian_phone = v.get('guardian_phone') or admission.guardian_phone
        address = v.get('address') or admission.address
        email = v.get('email') or admission.email
        phone = v.get('phone') or admission.phone

        joining_year = admission.admission_date.year if admission.admission_date else admission.created_at.year
        student_id = generate_unique_student_id(
            department_code=admission.department.code,
            joining_year=joining_year,
            roll_number=roll_number,
        )

        user = User(
            username=student_id,
            role=UserRole.STUDENT,
            student_id=student_id,
            email=email or None,
            first_name=admission.first_name,
            last_name=admission.last_name,
            phone=phone,
            department=admission.department.code,
            is_active=True,
        )
        user.set_password(password)
        user.save()

        student = Student.objects.create(
            user=user,
            department=admission.department,
            course=admission.course,
            semester=semester,
            admission_number=admission.application_number,
            roll_number=roll_number,
            registration_number=registration_number,
            date_of_birth=date_of_birth,
            gender=admission.gender,
            phone=phone,
            email=email,
            guardian_name=guardian_name,
            guardian_phone=guardian_phone,
            address=address,
            admission_date=admission.admission_date,
            current_semester=current_semester,
            is_active=True,
            approval_status=StudentApprovalStatus.APPROVED,
        )

        admission.student = student
        admission.save(update_fields=['student', 'updated_at'])

        return student

    def _save_flow_b_direct(self) -> Student:
        v = self.validated_data
        semester = v['semester']
        password = v['password']
        roll_number = v['roll_number']
        registration_number = v.get('registration_number') or roll_number
        current_semester = v['current_semester']
        department = v['department']
        course = v['course']

        joining_year = v['admission_date'].year
        student_id = generate_unique_student_id(
            department_code=department.code,
            joining_year=joining_year,
            roll_number=roll_number,
        )

        # Pending Admin approval: the login account exists but cannot be
        # used to authenticate until Admin approves it (see
        # StudentViewSet.approve). Django's auth backend already rejects
        # inactive users on login -- no separate gate needed.
        user = User(
            username=student_id,
            role=UserRole.STUDENT,
            student_id=student_id,
            email=v.get('email') or None,
            first_name=v['first_name'],
            last_name=v.get('last_name', ''),
            phone=v.get('phone', ''),
            department=department.code,
            is_active=False,
        )
        user.set_password(password)
        user.save()

        student = Student.objects.create(
            user=user,
            department=department,
            course=course,
            semester=semester,
            admission_number=student_id,
            roll_number=roll_number,
            registration_number=registration_number,
            date_of_birth=v['date_of_birth'],
            gender=v['gender'],
            phone=v.get('phone', ''),
            email=v.get('email', ''),
            guardian_name=v['guardian_name'],
            guardian_phone=v['guardian_phone'],
            address=v['address'],
            admission_date=v['admission_date'],
            current_semester=current_semester,
            is_active=True,
            approval_status=StudentApprovalStatus.PENDING,
        )

        return student


class StudentSetPasswordSerializer(serializers.Serializer):
    """Staff/Admin resets a student's login password. Never echoes it back."""

    password = serializers.CharField(write_only=True, min_length=6, style={'input_type': 'password'})

    def save(self, **kwargs):
        student: Student = self.context['student']
        student.user.set_password(self.validated_data['password'])
        student.user.save(update_fields=['password'])
        return student
