from datetime import date, timedelta
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.departments.models import Department
from apps.courses.models import Course
from apps.academic_year.models import AcademicYear
from .models import Semester


class SemesterViewSetTestCase(TestCase):
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

    def test_list_semesters(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/semesters/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_semester(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/semesters/{self.semester.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Semester 1')

    def test_create_semester_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'academic_year': str(self.academic_year.id),
            'course': str(self.course.id),
            'semester_number': 2,
            'name': 'Semester 2',
            'start_date': '2025-11-01',
            'end_date': '2026-03-31',
            'is_active': True
        }
        response = self.client.post('/api/v1/semesters/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Semester.objects.count(), 2)

    def test_create_semester_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'academic_year': str(self.academic_year.id),
            'course': str(self.course.id),
            'semester_number': 2,
            'name': 'Semester 2',
            'start_date': '2025-11-01',
            'end_date': '2026-03-31',
            'is_active': True
        }
        response = self.client.post('/api/v1/semesters/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_semester_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'academic_year': str(self.academic_year.id),
            'course': str(self.course.id),
            'semester_number': 1,
            'name': 'Semester 1 Updated',
            'start_date': '2025-06-01',
            'end_date': '2025-10-31',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/semesters/{self.semester.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.semester.refresh_from_db()
        self.assertEqual(self.semester.is_active, False)

    def test_update_semester_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'academic_year': str(self.academic_year.id),
            'course': str(self.course.id),
            'semester_number': 1,
            'name': 'Semester 1 Updated',
            'start_date': '2025-06-01',
            'end_date': '2025-10-31',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/semesters/{self.semester.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_semester_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/semesters/{self.semester.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Semester.objects.count(), 0)

    def test_delete_semester_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/semesters/{self.semester.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_semester_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'academic_year': str(self.academic_year.id),
            'course': str(self.course.id),
            'semester_number': 1,
            'name': 'Duplicate Semester',
            'start_date': '2025-11-01',
            'end_date': '2026-03-31',
            'is_active': True
        }
        response = self.client.post('/api/v1/semesters/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_semester_number_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'academic_year': str(self.academic_year.id),
            'course': str(self.course.id),
            'semester_number': 0,
            'name': 'Invalid Semester',
            'start_date': '2025-11-01',
            'end_date': '2026-03-31',
            'is_active': True
        }
        response = self.client.post('/api/v1/semesters/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_end_date_after_start_date_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'academic_year': str(self.academic_year.id),
            'course': str(self.course.id),
            'semester_number': 2,
            'name': 'Invalid Dates',
            'start_date': '2026-03-31',
            'end_date': '2025-11-01',
            'is_active': True
        }
        response = self.client.post('/api/v1/semesters/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_semester_dates_inside_academic_year(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'academic_year': str(self.academic_year.id),
            'course': str(self.course.id),
            'semester_number': 2,
            'name': 'Outside Academic Year',
            'start_date': '2024-06-01',
            'end_date': '2024-10-31',
            'is_active': True
        }
        response = self.client.post('/api/v1/semesters/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_semester_end_date_after_academic_year_end_date(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'academic_year': str(self.academic_year.id),
            'course': str(self.course.id),
            'semester_number': 2,
            'name': 'After Academic Year',
            'start_date': '2026-04-01',
            'end_date': '2026-07-31',
            'is_active': True
        }
        response = self.client.post('/api/v1/semesters/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/semesters/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/semesters/?search=Semester')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_course_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/semesters/?search=Computer')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_academic_year_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/semesters/?search=2025')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_academic_year(self):
        new_academic_year = AcademicYear.objects.create(
            name='2026-2027',
            start_date=date(2026, 6, 1),
            end_date=date(2027, 5, 31),
            is_current=False,
            is_active=True
        )
        Semester.objects.create(
            academic_year=new_academic_year,
            course=self.course,
            semester_number=1,
            name='Semester 1 - 2026',
            start_date=date(2026, 6, 1),
            end_date=date(2026, 10, 31),
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/semesters/?ordering=academic_year')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_course(self):
        new_course = Course.objects.create(
            department=self.department,
            name='B.Tech Information Technology',
            code='BTIT',
            degree='bachelor',
            duration_years=4,
            total_semesters=8,
            is_active=True
        )
        Semester.objects.create(
            academic_year=self.academic_year,
            course=new_course,
            semester_number=1,
            name='Semester 1 - IT',
            start_date=date(2025, 6, 1),
            end_date=date(2025, 10, 31),
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/semesters/?ordering=course')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_semester_number(self):
        Semester.objects.create(
            academic_year=self.academic_year,
            course=self.course,
            semester_number=2,
            name='Semester 2',
            start_date=date(2025, 11, 1),
            end_date=date(2026, 3, 31),
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/semesters/?ordering=semester_number')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_by_academic_year(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/semesters/?academic_year={self.academic_year.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_course(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/semesters/?course={self.course.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_semester_number(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/semesters/?semester_number=1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/semesters/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_semester_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'is_active': False}
        response = self.client.patch(f'/api/v1/semesters/{self.semester.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.semester.refresh_from_db()
        self.assertEqual(self.semester.is_active, False)
