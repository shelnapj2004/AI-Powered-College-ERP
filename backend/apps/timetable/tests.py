from datetime import date, time
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.departments.models import Department
from apps.courses.models import Course
from apps.academic_year.models import AcademicYear
from apps.semester.models import Semester
from apps.subjects.models import Subject
from apps.teachers.models import Teacher
from .models import Timetable, DayOfWeek


class TimetableViewSetTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            role=UserRole.ADMIN
        )
        self.student_user = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            role=UserRole.STUDENT
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
        self.subject = Subject.objects.create(
            course=self.course,
            semester=self.semester,
            code='CS101',
            name='Introduction to Programming',
            credits=4,
            subject_type='theory',
            description='Basic programming concepts',
            is_active=True
        )
        self.teacher = Teacher.objects.create(
            user=self.teacher_user,
            department=self.department,
            employee_id='T001',
            designation='Professor',
            qualification='Ph.D',
            specialization='Computer Science',
            experience_years=10,
            phone='1234567890',
            email='teacher@test.com',
            address='123 Street',
            joining_date=date(2020, 1, 1),
            is_active=True
        )
        self.timetable = Timetable.objects.create(
            department=self.department,
            course=self.course,
            semester=self.semester,
            subject=self.subject,
            teacher=self.teacher,
            day_of_week=DayOfWeek.MONDAY,
            period_number=1,
            room_number='101',
            start_time=time(9, 0),
            end_time=time(10, 0),
            is_active=True
        )

    def test_list_timetables(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_timetable(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/timetables/{self.timetable.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['room_number'], '101')

    def test_create_timetable_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'department': str(self.department.id),
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'subject': str(self.subject.id),
            'teacher': str(self.teacher.id),
            'day_of_week': DayOfWeek.TUESDAY,
            'period_number': 2,
            'room_number': '102',
            'start_time': '10:00:00',
            'end_time': '11:00:00',
            'is_active': True
        }
        response = self.client.post('/api/v1/timetables/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Timetable.objects.count(), 2)

    def test_create_timetable_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'department': str(self.department.id),
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'subject': str(self.subject.id),
            'teacher': str(self.teacher.id),
            'day_of_week': DayOfWeek.TUESDAY,
            'period_number': 2,
            'room_number': '102',
            'start_time': '10:00:00',
            'end_time': '11:00:00',
            'is_active': True
        }
        response = self.client.post('/api/v1/timetables/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_timetable_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'department': str(self.department.id),
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'subject': str(self.subject.id),
            'teacher': str(self.teacher.id),
            'day_of_week': DayOfWeek.MONDAY,
            'period_number': 1,
            'room_number': '103',
            'start_time': '09:00:00',
            'end_time': '10:00:00',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/timetables/{self.timetable.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.timetable.refresh_from_db()
        self.assertEqual(self.timetable.room_number, '103')

    def test_update_timetable_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'department': str(self.department.id),
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'subject': str(self.subject.id),
            'teacher': str(self.teacher.id),
            'day_of_week': DayOfWeek.MONDAY,
            'period_number': 1,
            'room_number': '103',
            'start_time': '09:00:00',
            'end_time': '10:00:00',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/timetables/{self.timetable.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_timetable_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/timetables/{self.timetable.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Timetable.objects.count(), 0)

    def test_delete_timetable_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/timetables/{self.timetable.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/timetables/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_room_number(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/?search=101')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_subject_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/?search=Programming')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_course_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/?search=Computer')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_department_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/?search=Science')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_day_of_week(self):
        Timetable.objects.create(
            department=self.department,
            course=self.course,
            semester=self.semester,
            subject=self.subject,
            teacher=self.teacher,
            day_of_week=DayOfWeek.WEDNESDAY,
            period_number=1,
            room_number='102',
            start_time=time(9, 0),
            end_time=time(10, 0),
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/?ordering=day_of_week')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_period_number(self):
        Timetable.objects.create(
            department=self.department,
            course=self.course,
            semester=self.semester,
            subject=self.subject,
            teacher=self.teacher,
            day_of_week=DayOfWeek.MONDAY,
            period_number=2,
            room_number='102',
            start_time=time(10, 0),
            end_time=time(11, 0),
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/?ordering=period_number')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_start_time(self):
        Timetable.objects.create(
            department=self.department,
            course=self.course,
            semester=self.semester,
            subject=self.subject,
            teacher=self.teacher,
            day_of_week=DayOfWeek.MONDAY,
            period_number=2,
            room_number='102',
            start_time=time(10, 0),
            end_time=time(11, 0),
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/?ordering=start_time')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_by_department(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/timetables/?department={self.department.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_course(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/timetables/?course={self.course.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_semester(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/timetables/?semester={self.semester.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_subject(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/timetables/?subject={self.subject.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_teacher(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/timetables/?teacher={self.teacher.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_day_of_week(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/?day_of_week=monday')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_period_number(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/?period_number=1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_room_number(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/?room_number=101')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/timetables/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_timetable_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'is_active': False}
        response = self.client.patch(f'/api/v1/timetables/{self.timetable.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.timetable.refresh_from_db()
        self.assertEqual(self.timetable.is_active, False)
