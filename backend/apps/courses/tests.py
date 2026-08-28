from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.departments.models import Department
from .models import Course


class CourseViewSetTestCase(TestCase):
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

    def test_list_courses(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/courses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_course(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/courses/{self.course.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'BTCS')

    def test_create_course_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'department': str(self.department.id),
            'name': 'B.Tech Information Technology',
            'code': 'BTIT',
            'degree': 'bachelor',
            'duration_years': 4,
            'total_semesters': 8,
            'is_active': True
        }
        response = self.client.post('/api/v1/courses/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Course.objects.count(), 2)

    def test_create_course_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'department': str(self.department.id),
            'name': 'B.Tech Information Technology',
            'code': 'BTIT',
            'degree': 'bachelor',
            'duration_years': 4,
            'total_semesters': 8,
            'is_active': True
        }
        response = self.client.post('/api/v1/courses/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_course_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'department': str(self.department.id),
            'name': 'B.Tech Computer Science Updated',
            'code': 'BTCS',
            'degree': 'bachelor',
            'duration_years': 4,
            'total_semesters': 8,
            'is_active': False
        }
        response = self.client.put(f'/api/v1/courses/{self.course.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.course.refresh_from_db()
        self.assertEqual(self.course.is_active, False)

    def test_update_course_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'department': str(self.department.id),
            'name': 'B.Tech Computer Science Updated',
            'code': 'BTCS',
            'degree': 'bachelor',
            'duration_years': 4,
            'total_semesters': 8,
            'is_active': False
        }
        response = self.client.put(f'/api/v1/courses/{self.course.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_course_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/courses/{self.course.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Course.objects.count(), 0)

    def test_delete_course_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/courses/{self.course.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duration_years_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'department': str(self.department.id),
            'name': 'B.Tech Information Technology',
            'code': 'BTIT',
            'degree': 'bachelor',
            'duration_years': 0,
            'total_semesters': 8,
            'is_active': True
        }
        response = self.client.post('/api/v1/courses/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_total_semesters_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'department': str(self.department.id),
            'name': 'B.Tech Information Technology',
            'code': 'BTIT',
            'degree': 'bachelor',
            'duration_years': 4,
            'total_semesters': 0,
            'is_active': True
        }
        response = self.client.post('/api/v1/courses/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/courses/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/courses/?search=Computer')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_code(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/courses/?search=BTCS')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_department_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/courses/?search=Science')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_name(self):
        Course.objects.create(
            department=self.department,
            name='B.Tech Information Technology',
            code='BTIT',
            degree='bachelor',
            duration_years=4,
            total_semesters=8,
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/courses/?ordering=name')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_code(self):
        Course.objects.create(
            department=self.department,
            name='B.Tech Information Technology',
            code='BTIT',
            degree='bachelor',
            duration_years=4,
            total_semesters=8,
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/courses/?ordering=code')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_degree(self):
        Course.objects.create(
            department=self.department,
            name='M.Tech Computer Science',
            code='MTCS',
            degree='master',
            duration_years=2,
            total_semesters=4,
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/courses/?ordering=degree')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_by_department(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/courses/?department={self.department.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_degree(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/courses/?degree=bachelor')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/courses/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_course_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'is_active': False}
        response = self.client.patch(f'/api/v1/courses/{self.course.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.course.refresh_from_db()
        self.assertEqual(self.course.is_active, False)
