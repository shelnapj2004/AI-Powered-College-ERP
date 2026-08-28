"""
Management command: seed_demo_users

Creates the minimal set of development/demo accounts needed to log into
each of the five existing portals (Student, Teacher, Staff, HOD, Admin)
during local development.

Design notes:
- Uses the EXISTING User model (apps.accounts.models.User) and the
  EXISTING role field/choices — no parallel auth system.
- Idempotent: safe to run multiple times. Existing users/records are
  detected by unique keys (username, employee_id, admission_number, etc.)
  and are left alone (or minimally updated) rather than duplicated.
- Never flushes, resets, or deletes any existing data.
- Creates only the minimum related profile record required by each
  role's existing model (Student/Teacher/Staff/HOD), plus one shared
  Department, Course, Semester and AcademicYear if none exist yet,
  since Student.course/semester and Teacher/Staff/HOD.department are
  required (PROTECT) foreign keys.

Usage:
    python manage.py seed_demo_users
"""
from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User, UserRole

DEV_PASSWORDS = {
    "student1": "Student@123",
    "teacher1": "Teacher@123",
    "staff1": "Staff@123",
    "hod1": "Hod@123",
    "admin1": "Admin@123",
}


class Command(BaseCommand):
    help = "Create/repair minimal development accounts for every portal role (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        # Local imports: these apps aren't guaranteed to be installed in
        # every deployment of this command's parent app, and importing
        # here keeps the command resilient to app-loading order.
        from apps.departments.models import Department
        from apps.courses.models import Course
        from apps.academic_year.models import AcademicYear
        from apps.semester.models import Semester
        from apps.students.models import Student, Gender
        from apps.teachers.models import Teacher
        from apps.staff.models import Staff
        from apps.hod.models import HOD

        dept, created = Department.objects.get_or_create(
            code="CSE",
            defaults={
                "name": "Computer Science",
                "description": "Department of Computer Science and Engineering",
                "is_active": True,
            },
        )
        self.log_created("Department", dept, created)

        ay, created = AcademicYear.objects.get_or_create(
            name="2025-2026",
            defaults={
                "start_date": date(2025, 6, 1),
                "end_date": date(2026, 5, 31),
                "is_current": True,
                "is_active": True,
            },
        )
        self.log_created("AcademicYear", ay, created)

        course, created = Course.objects.get_or_create(
            code="CSE-BTECH",
            defaults={
                "department": dept,
                "name": "B.Tech Computer Science Engineering",
                "degree": "bachelor",
                "duration_years": 4,
                "total_semesters": 8,
                "description": "Seeded for development login testing",
                "is_active": True,
            },
        )
        self.log_created("Course", course, created)

        semester, created = Semester.objects.get_or_create(
            academic_year=ay,
            course=course,
            semester_number=1,
            defaults={
                "start_date": date(2025, 6, 1),
                "end_date": date(2025, 11, 30),
                "is_active": True,
                "name": "Semester 1",
            },
        )
        self.log_created("Semester", semester, created)

        # --- student1 -------------------------------------------------
        student_user = self.get_or_create_user(
            "student1", UserRole.STUDENT, "Demo", "Student",
            student_id="CSE2025001", department_name="Computer Science",
        )
        student_profile, created = Student.objects.get_or_create(
            user=student_user,
            defaults=dict(
                department=dept, course=course, semester=semester,
                admission_number="CSE2025001", roll_number="CSE001",
                registration_number="REG-CSE2025001",
                date_of_birth=date(2005, 1, 1), gender=Gender.OTHER,
                phone="9999999999", email="student1@eduverse.dev",
                guardian_name="Guardian Dev", guardian_phone="9999999998",
                address="Dev Address, Test City",
                admission_date=date(2025, 6, 1), current_semester=1,
                is_active=True,
            ),
        )
        self.log_created("Student profile", student_profile, created)

        # --- teacher1 ---------------------------------------------------
        teacher_user = self.get_or_create_user(
            "teacher1", UserRole.TEACHER, "Demo", "Teacher",
            employee_id="EMP-T0001", department_name="Computer Science",
        )
        teacher_profile, created = Teacher.objects.get_or_create(
            user=teacher_user,
            defaults=dict(
                department=dept, employee_id="EMP-T0001",
                designation="Assistant Professor", qualification="M.Tech",
                specialization="Computer Science", experience_years=5,
                phone="9999999997", email="teacher1@eduverse.dev",
                address="Dev Address, Test City",
                joining_date=date(2025, 6, 1), is_active=True,
            ),
        )
        self.log_created("Teacher profile", teacher_profile, created)

        # --- staff1 -------------------------------------------------
        staff_user = self.get_or_create_user(
            "staff1", UserRole.STAFF, "Demo", "Staff",
            employee_id="EMP-S0001", department_name="Computer Science",
        )
        staff_profile, created = Staff.objects.get_or_create(
            user=staff_user,
            defaults=dict(
                department=dept, employee_id="EMP-S0001",
                designation="Administrative Staff",
                phone="9999999996", email="staff1@eduverse.dev",
                address="Dev Address, Test City",
                joining_date=date(2025, 6, 1), is_active=True,
            ),
        )
        self.log_created("Staff profile", staff_profile, created)

        # --- hod1 (also needs its own backing Teacher record) -------
        hod_user = self.get_or_create_user(
            "hod1", UserRole.HOD, "Demo", "HOD",
            employee_id="EMP-H0001", department_name="Computer Science",
        )
        hod_teacher_profile, created = Teacher.objects.get_or_create(
            user=hod_user,
            defaults=dict(
                department=dept, employee_id="EMP-H0001",
                designation="Professor & HOD", qualification="Ph.D",
                specialization="Computer Science", experience_years=12,
                phone="9999999995", email="hod1@eduverse.dev",
                address="Dev Address, Test City",
                joining_date=date(2020, 6, 1), is_active=True,
            ),
        )
        self.log_created("Teacher profile (for HOD)", hod_teacher_profile, created)

        hod_profile, created = HOD.objects.get_or_create(
            user=hod_user,
            defaults=dict(
                teacher=hod_teacher_profile, department=dept,
                office_phone="9999999994", office_location="CSE Block, Room 101",
                appointment_date=date(2020, 6, 1), is_active=True,
            ),
        )
        self.log_created("HOD profile", hod_profile, created)

        # --- admin1 (role + is_superuser is sufficient; no profile app) ---
        self.get_or_create_user(
            "admin1", UserRole.ADMIN, "Demo", "Admin",
            is_superuser=True, is_staff=True,
        )

        self.stdout.write(self.style.SUCCESS("\nDevelopment accounts ready:"))
        for username, password in DEV_PASSWORDS.items():
            self.stdout.write(f"  {username} / {password}")

    def get_or_create_user(self, username, role, first_name, last_name, **extra):
        password = DEV_PASSWORDS[username]
        is_superuser = extra.pop("is_superuser", False)
        is_staff = extra.pop("is_staff", is_superuser)
        student_id = extra.pop("student_id", None)
        employee_id = extra.pop("employee_id", None)
        department_name = extra.pop("department_name", "")

        user, created = User.objects.get_or_create(
            username=username,
            defaults=dict(
                first_name=first_name, last_name=last_name,
                email=f"{username}@eduverse.dev", role=role,
                phone="9999999999", is_active=True,
                is_superuser=is_superuser, is_staff=is_staff,
                student_id=student_id, employee_id=employee_id,
                department=department_name,
            ),
        )
        if created:
            user.set_password(password)
            user.save(update_fields=["password"])
            self.stdout.write(f"  created user {username} (role={role})")
        else:
            # Existing username: don't overwrite unnecessarily — only
            # repair what's needed for dev login (role + password), and
            # only if it's actually different from what's required.
            changed = []
            if user.role != role:
                user.role = role
                changed.append("role")
            if not user.check_password(password):
                user.set_password(password)
                changed.append("password")
            if not user.is_active:
                user.is_active = True
                changed.append("is_active")
            if changed:
                user.save()
                self.stdout.write(f"  updated existing user {username}: {', '.join(changed)}")
            else:
                self.stdout.write(f"  user {username} already correct, left untouched")
        return user

    def log_created(self, label, obj, created):
        verb = "created" if created else "already exists"
        self.stdout.write(f"  {label} {verb}: {obj}")
