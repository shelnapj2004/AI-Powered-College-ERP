from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.departments.models import Department
from apps.courses.models import Course
from apps.academic_year.models import AcademicYear
from apps.semester.models import Semester
from apps.students.models import Student
from apps.subjects.models import Subject
from apps.teachers.models import Teacher
from apps.timetable.models import Timetable
from .models import AttendanceSession, AttendanceRecord


class AttendanceSessionViewSetTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            role=UserRole.ADMIN,
            first_name='Admin',
            last_name='User'
        )
        self.teacher_user = User.objects.create_user(
            username='teacher',
            email='teacher@test.com',
            password='testpass123',
            role=UserRole.TEACHER,
            first_name='John',
            last_name='Doe'
        )
        self.department = Department.objects.create(
            name='Computer Science',
            code='CS',
            is_active=True
        )
        self.course = Course.objects.create(
            department=self.department,
            name='B.Tech Computer Science',
            code='BTCS',
            degree='bachelor',
            duration_years=4,
            total_semesters=8,
            is_active=True
        )
        self.academic_year = AcademicYear.objects.create(
            name='2025-2026',
            start_date=date(2025, 6, 1),
            end_date=date(2026, 5, 31),
            is_current=True,
            is_active=True
        )
        self.semester = Semester.objects.create(
            academic_year=self.academic_year,
            course=self.course,
            semester_number=1,
            name='Semester 1',
            start_date=date(2025, 6, 1),
            end_date=date(2025, 10, 31),
            is_active=True
        )
        self.teacher = Teacher.objects.create(
            user=self.teacher_user,
            department=self.department,
            employee_id='EMP2025001',
            designation='Professor',
            qualification='Ph.D.',
            specialization='Computer Science',
            experience_years=10,
            phone='1234567890',
            email='teacher@test.com',
            address='123 Main St',
            joining_date=date(2020, 6, 1),
            is_active=True
        )
        self.subject = Subject.objects.create(
            name='Python Programming',
            code='CS101',
            course=self.course,
            semester=self.semester,
            credits=4,
            subject_type='theory',
            is_active=True
        )
        self.timetable = Timetable.objects.create(
            department=self.department,
            course=self.course,
            semester=self.semester,
            subject=self.subject,
            teacher=self.teacher,
            day_of_week='Monday',
            period_number=1,
            room_number='101',
            start_time='09:00',
            end_time='10:00',
            is_active=True
        )
        self.attendance_session = AttendanceSession.objects.create(
            timetable=self.timetable,
            attendance_date=date(2025, 7, 1),
            topic_covered='Introduction to Python',
            remarks='First class'
        )

    def test_list_attendance_sessions(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/attendance-sessions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_attendance_session(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/attendance-sessions/{self.attendance_session.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['topic_covered'], 'Introduction to Python')

    def test_create_attendance_session_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'timetable': str(self.timetable.id),
            'attendance_date': '2025-07-02',
            'topic_covered': 'Variables and Data Types',
            'remarks': 'Second class'
        }
        response = self.client.post('/api/v1/attendance-sessions/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AttendanceSession.objects.count(), 2)

    def test_create_attendance_session_as_teacher_forbidden(self):
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'timetable': str(self.timetable.id),
            'attendance_date': '2025-07-02',
            'topic_covered': 'Variables and Data Types',
            'remarks': 'Second class'
        }
        response = self.client.post('/api/v1/attendance-sessions/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_attendance_session_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'timetable': str(self.timetable.id),
            'attendance_date': '2025-07-01',
            'topic_covered': 'Introduction to Python Updated',
            'remarks': 'First class updated'
        }
        response = self.client.put(f'/api/v1/attendance-sessions/{self.attendance_session.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.attendance_session.refresh_from_db()
        self.assertEqual(self.attendance_session.topic_covered, 'Introduction to Python Updated')

    def test_delete_attendance_session_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/attendance-sessions/{self.attendance_session.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(AttendanceSession.objects.count(), 0)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/attendance-sessions/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AttendanceRecordViewSetTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            role=UserRole.ADMIN,
            first_name='Admin',
            last_name='User'
        )
        self.student_user = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            role=UserRole.STUDENT,
            first_name='John',
            last_name='Doe'
        )
        self.department = Department.objects.create(
            name='Computer Science',
            code='CS',
            is_active=True
        )
        self.course = Course.objects.create(
            department=self.department,
            name='B.Tech Computer Science',
            code='BTCS',
            degree='bachelor',
            duration_years=4,
            total_semesters=8,
            is_active=True
        )
        self.academic_year = AcademicYear.objects.create(
            name='2025-2026',
            start_date=date(2025, 6, 1),
            end_date=date(2026, 5, 31),
            is_current=True,
            is_active=True
        )
        self.semester = Semester.objects.create(
            academic_year=self.academic_year,
            course=self.course,
            semester_number=1,
            name='Semester 1',
            start_date=date(2025, 6, 1),
            end_date=date(2025, 10, 31),
            is_active=True
        )
        self.student = Student.objects.create(
            user=self.student_user,
            department=self.department,
            course=self.course,
            semester=self.semester,
            admission_number='ADM2025001',
            roll_number='CS001',
            registration_number='REG2025001',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            phone='1234567890',
            email='student@test.com',
            guardian_name='Jane Doe',
            guardian_phone='0987654321',
            address='123 Main St',
            admission_date=date(2025, 6, 1),
            current_semester=1,
            is_active=True
        )
        self.teacher = Teacher.objects.create(
            user=self.admin_user,
            department=self.department,
            employee_id='EMP2025002',
            designation='Professor',
            qualification='Ph.D.',
            specialization='Computer Science',
            experience_years=10,
            phone='1234567890',
            email='admin@test.com',
            address='123 Main St',
            joining_date=date(2020, 6, 1),
            is_active=True
        )
        self.subject = Subject.objects.create(
            name='Python Programming',
            code='CS101',
            course=self.course,
            semester=self.semester,
            credits=4,
            subject_type='theory',
            is_active=True
        )
        self.timetable = Timetable.objects.create(
            department=self.department,
            course=self.course,
            semester=self.semester,
            subject=self.subject,
            teacher=self.teacher,
            day_of_week='Monday',
            period_number=1,
            room_number='101',
            start_time='09:00',
            end_time='10:00',
            is_active=True
        )
        self.attendance_session = AttendanceSession.objects.create(
            timetable=self.timetable,
            attendance_date=date(2025, 7, 1),
            topic_covered='Introduction to Python'
        )
        self.attendance_record = AttendanceRecord.objects.create(
            attendance_session=self.attendance_session,
            student=self.student,
            status='present',
            remarks='On time'
        )

    def test_list_attendance_records(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/attendance-records/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_attendance_record(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/attendance-records/{self.attendance_record.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'present')

    def test_create_attendance_record_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        new_user = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='testpass123',
            role=UserRole.STUDENT,
            first_name='Jane',
            last_name='Smith'
        )
        new_student = Student.objects.create(
            user=new_user,
            department=self.department,
            course=self.course,
            semester=self.semester,
            admission_number='ADM2025002',
            roll_number='CS002',
            registration_number='REG2025002',
            date_of_birth=date(2000, 2, 1),
            gender='female',
            phone='1234567891',
            email='student2@test.com',
            guardian_name='John Smith',
            guardian_phone='0987654322',
            address='456 Oak Ave',
            admission_date=date(2025, 6, 1),
            current_semester=1,
            is_active=True
        )
        data = {
            'attendance_session': str(self.attendance_session.id),
            'student': str(new_student.id),
            'status': 'absent',
            'remarks': 'Sick leave'
        }
        response = self.client.post('/api/v1/attendance-records/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AttendanceRecord.objects.count(), 2)

    def test_create_attendance_record_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'attendance_session': str(self.attendance_session.id),
            'student': str(self.student.id),
            'status': 'absent',
            'remarks': 'Sick leave'
        }
        response = self.client.post('/api/v1/attendance-records/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_attendance_record_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'attendance_session': str(self.attendance_session.id),
            'student': str(self.student.id),
            'status': 'late',
            'remarks': 'Arrived 10 minutes late'
        }
        response = self.client.put(f'/api/v1/attendance-records/{self.attendance_record.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.attendance_record.refresh_from_db()
        self.assertEqual(self.attendance_record.status, 'late')

    def test_delete_attendance_record_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/attendance-records/{self.attendance_record.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(AttendanceRecord.objects.count(), 0)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/attendance-records/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_filter_by_status(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/attendance-records/?status=present')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_student(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/attendance-records/?student={self.student.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

