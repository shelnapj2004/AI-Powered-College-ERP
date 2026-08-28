from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.departments.models import Department
from .models import Teacher


class TeacherViewSetTestCase(TestCase):
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
        self.teacher = Teacher.objects.create(
            user=self.teacher_user,
            department=self.department,
            employee_id='EMP2025001',
            designation='Professor',
            qualification='Ph.D.',
            specialization='Artificial Intelligence',
            experience_years=10,
            phone='1234567890',
            email='teacher@test.com',
            address='123 Main St',
            joining_date=date(2020, 6, 1),
            is_active=True
        )

    def test_list_teachers(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/teachers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_teacher(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/teachers/{self.teacher.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['employee_id'], 'EMP2025001')

    def test_create_teacher_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        new_user = User.objects.create_user(
            username='teacher2',
            email='teacher2@test.com',
            password='testpass123',
            role=UserRole.TEACHER,
            first_name='Jane',
            last_name='Smith'
        )
        data = {
            'user': str(new_user.id),
            'department': str(self.department.id),
            'employee_id': 'EMP2025002',
            'designation': 'Associate Professor',
            'qualification': 'M.Tech.',
            'specialization': 'Machine Learning',
            'experience_years': 5,
            'phone': '1234567891',
            'email': 'teacher2@test.com',
            'address': '456 Oak Ave',
            'joining_date': '2021-06-01',
            'is_active': True
        }
        response = self.client.post('/api/v1/teachers/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Teacher.objects.count(), 2)

    def test_create_teacher_as_teacher_forbidden(self):
        self.client.force_authenticate(user=self.teacher_user)
        new_user = User.objects.create_user(
            username='teacher2',
            email='teacher2@test.com',
            password='testpass123',
            role=UserRole.TEACHER,
            first_name='Jane',
            last_name='Smith'
        )
        data = {
            'user': str(new_user.id),
            'department': str(self.department.id),
            'employee_id': 'EMP2025002',
            'designation': 'Associate Professor',
            'qualification': 'M.Tech.',
            'specialization': 'Machine Learning',
            'experience_years': 5,
            'phone': '1234567891',
            'email': 'teacher2@test.com',
            'address': '456 Oak Ave',
            'joining_date': '2021-06-01',
            'is_active': True
        }
        response = self.client.post('/api/v1/teachers/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_teacher_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'user': str(self.teacher_user.id),
            'department': str(self.department.id),
            'employee_id': 'EMP2025001',
            'designation': 'Senior Professor',
            'qualification': 'Ph.D.',
            'specialization': 'Artificial Intelligence',
            'experience_years': 12,
            'phone': '1234567890',
            'email': 'teacher@test.com',
            'address': '123 Main St Updated',
            'joining_date': '2020-06-01',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/teachers/{self.teacher.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.experience_years, 12)

    def test_update_teacher_as_teacher_forbidden(self):
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'user': str(self.teacher_user.id),
            'department': str(self.department.id),
            'employee_id': 'EMP2025001',
            'designation': 'Senior Professor',
            'qualification': 'Ph.D.',
            'specialization': 'Artificial Intelligence',
            'experience_years': 12,
            'phone': '1234567890',
            'email': 'teacher@test.com',
            'address': '123 Main St Updated',
            'joining_date': '2020-06-01',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/teachers/{self.teacher.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_teacher_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/teachers/{self.teacher.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Teacher.objects.count(), 0)

    def test_delete_teacher_as_teacher_forbidden(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.delete(f'/api/v1/teachers/{self.teacher.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_id_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        new_user = User.objects.create_user(
            username='teacher2',
            email='teacher2@test.com',
            password='testpass123',
            role=UserRole.TEACHER,
            first_name='Jane',
            last_name='Smith'
        )
        data = {
            'user': str(new_user.id),
            'department': str(self.department.id),
            'employee_id': 'EMP2025001',
            'designation': 'Associate Professor',
            'qualification': 'M.Tech.',
            'specialization': 'Machine Learning',
            'experience_years': 5,
            'phone': '1234567891',
            'email': 'teacher2@test.com',
            'address': '456 Oak Ave',
            'joining_date': '2021-06-01',
            'is_active': True
        }
        response = self.client.post('/api/v1/teachers/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_employee_id_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        new_user = User.objects.create_user(
            username='teacher2',
            email='teacher2@test.com',
            password='testpass123',
            role=UserRole.TEACHER,
            first_name='Jane',
            last_name='Smith'
        )
        data = {
            'user': str(new_user.id),
            'department': str(self.department.id),
            'employee_id': 'EMP2025001',
            'designation': 'Associate Professor',
            'qualification': 'M.Tech.',
            'specialization': 'Machine Learning',
            'experience_years': 5,
            'phone': '1234567891',
            'email': 'teacher2@test.com',
            'address': '456 Oak Ave',
            'joining_date': '2021-06-01',
            'is_active': True
        }
        response = self.client.post('/api/v1/teachers/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/teachers/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_employee_id(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/teachers/?search=EMP2025001')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_user_name(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/teachers/?search=John')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_employee_id(self):
        new_user = User.objects.create_user(
            username='teacher2',
            email='teacher2@test.com',
            password='testpass123',
            role=UserRole.TEACHER,
            first_name='Jane',
            last_name='Smith'
        )
        Teacher.objects.create(
            user=new_user,
            department=self.department,
            employee_id='EMP2025002',
            designation='Associate Professor',
            qualification='M.Tech.',
            specialization='Machine Learning',
            experience_years=5,
            phone='1234567891',
            email='teacher2@test.com',
            address='456 Oak Ave',
            joining_date=date(2021, 6, 1),
            is_active=True
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/teachers/?ordering=employee_id')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_by_department(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/teachers/?department={self.department.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_designation(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/teachers/?designation=Professor')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/teachers/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_teacher_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'experience_years': 15}
        response = self.client.patch(f'/api/v1/teachers/{self.teacher.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.experience_years, 15)

