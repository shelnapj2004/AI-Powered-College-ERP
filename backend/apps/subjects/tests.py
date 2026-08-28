from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.departments.models import Department
from apps.courses.models import Course
from apps.academic_year.models import AcademicYear
from apps.semester.models import Semester
from .models import Subject


class SubjectViewSetTestCase(TestCase):
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
            name='Semester 1',
            course=self.course,
            academic_year=self.academic_year,
            semester_number=1,
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

    def test_list_subjects(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/subjects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_subject(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/subjects/{self.subject.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'CS101')

    def test_create_subject_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'code': 'CS102',
            'name': 'Data Structures',
            'credits': 3,
            'subject_type': 'theory',
            'description': 'Data structures and algorithms',
            'is_active': True
        }
        response = self.client.post('/api/v1/subjects/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Subject.objects.count(), 2)

    def test_create_subject_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'code': 'CS102',
            'name': 'Data Structures',
            'credits': 3,
            'subject_type': 'theory',
            'description': 'Data structures and algorithms',
            'is_active': True
        }
        response = self.client.post('/api/v1/subjects/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_subject_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'code': 'CS101',
            'name': 'Introduction to Programming Updated',
            'credits': 4,
            'subject_type': 'theory',
            'description': 'Basic programming concepts',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/subjects/{self.subject.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.subject.refresh_from_db()
        self.assertEqual(self.subject.is_active, False)

    def test_update_subject_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'code': 'CS101',
            'name': 'Introduction to Programming Updated',
            'credits': 4,
            'subject_type': 'theory',
            'description': 'Basic programming concepts',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/subjects/{self.subject.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_subject_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/subjects/{self.subject.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Subject.objects.count(), 0)

    def test_delete_subject_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/subjects/{self.subject.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_credits_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'code': 'CS102',
            'name': 'Data Structures',
            'credits': 0,
            'subject_type': 'theory',
            'description': 'Data structures and algorithms',
            'is_active': True
        }
        response = self.client.post('/api/v1/subjects/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/subjects/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_code(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/subjects/?search=CS101')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/subjects/?search=Programming')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_course_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/subjects/?search=Computer')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_semester_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/subjects/?search=Semester')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_code(self):
        Subject.objects.create(
            course=self.course,
            semester=self.semester,
            code='CS102',
            name='Data Structures',
            credits=3,
            subject_type='theory',
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/subjects/?ordering=code')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_name(self):
        Subject.objects.create(
            course=self.course,
            semester=self.semester,
            code='CS102',
            name='Data Structures',
            credits=3,
            subject_type='theory',
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/subjects/?ordering=name')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_credits(self):
        Subject.objects.create(
            course=self.course,
            semester=self.semester,
            code='CS102',
            name='Data Structures',
            credits=3,
            subject_type='theory',
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/subjects/?ordering=credits')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_by_course(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/subjects/?course={self.course.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_semester(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/subjects/?semester={self.semester.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_subject_type(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/subjects/?subject_type=theory')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/subjects/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_subject_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'is_active': False}
        response = self.client.patch(f'/api/v1/subjects/{self.subject.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.subject.refresh_from_db()
        self.assertEqual(self.subject.is_active, False)
