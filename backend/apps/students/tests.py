from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.departments.models import Department
from apps.courses.models import Course
from apps.academic_year.models import AcademicYear
from apps.semester.models import Semester
from .models import Student


class StudentViewSetTestCase(TestCase):
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

    def test_list_students(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/students/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_student(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/students/{self.student.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['admission_number'], 'ADM2025001')

    def test_create_student_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        new_user = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='testpass123',
            role=UserRole.STUDENT,
            first_name='Jane',
            last_name='Smith'
        )
        data = {
            'user': str(new_user.id),
            'department': str(self.department.id),
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'admission_number': 'ADM2025002',
            'roll_number': 'CS002',
            'registration_number': 'REG2025002',
            'date_of_birth': '2000-02-01',
            'gender': 'female',
            'phone': '1234567891',
            'email': 'student2@test.com',
            'guardian_name': 'John Smith',
            'guardian_phone': '0987654322',
            'address': '456 Oak Ave',
            'admission_date': '2025-06-01',
            'current_semester': 1,
            'is_active': True
        }
        response = self.client.post('/api/v1/students/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Student.objects.count(), 2)

    def test_create_student_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        new_user = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='testpass123',
            role=UserRole.STUDENT,
            first_name='Jane',
            last_name='Smith'
        )
        data = {
            'user': str(new_user.id),
            'department': str(self.department.id),
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'admission_number': 'ADM2025002',
            'roll_number': 'CS002',
            'registration_number': 'REG2025002',
            'date_of_birth': '2000-02-01',
            'gender': 'female',
            'phone': '1234567891',
            'email': 'student2@test.com',
            'guardian_name': 'John Smith',
            'guardian_phone': '0987654322',
            'address': '456 Oak Ave',
            'admission_date': '2025-06-01',
            'current_semester': 1,
            'is_active': True
        }
        response = self.client.post('/api/v1/students/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_student_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'user': str(self.student_user.id),
            'department': str(self.department.id),
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'admission_number': 'ADM2025001',
            'roll_number': 'CS001',
            'registration_number': 'REG2025001',
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'phone': '1234567890',
            'email': 'student@test.com',
            'guardian_name': 'Jane Doe',
            'guardian_phone': '0987654321',
            'address': '123 Main St Updated',
            'admission_date': '2025-06-01',
            'current_semester': 2,
            'is_active': False
        }
        response = self.client.put(f'/api/v1/students/{self.student.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.current_semester, 2)

    def test_update_student_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'user': str(self.student_user.id),
            'department': str(self.department.id),
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'admission_number': 'ADM2025001',
            'roll_number': 'CS001',
            'registration_number': 'REG2025001',
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'phone': '1234567890',
            'email': 'student@test.com',
            'guardian_name': 'Jane Doe',
            'guardian_phone': '0987654321',
            'address': '123 Main St Updated',
            'admission_date': '2025-06-01',
            'current_semester': 2,
            'is_active': False
        }
        response = self.client.put(f'/api/v1/students/{self.student.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_student_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/students/{self.student.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Student.objects.count(), 0)

    def test_delete_student_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/students/{self.student.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_current_semester_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        new_user = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='testpass123',
            role=UserRole.STUDENT,
            first_name='Jane',
            last_name='Smith'
        )
        data = {
            'user': str(new_user.id),
            'department': str(self.department.id),
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'admission_number': 'ADM2025002',
            'roll_number': 'CS002',
            'registration_number': 'REG2025002',
            'date_of_birth': '2000-02-01',
            'gender': 'female',
            'phone': '1234567891',
            'email': 'student2@test.com',
            'guardian_name': 'John Smith',
            'guardian_phone': '0987654322',
            'address': '456 Oak Ave',
            'admission_date': '2025-06-01',
            'current_semester': 0,
            'is_active': True
        }
        response = self.client.post('/api/v1/students/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_admission_number_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        new_user = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='testpass123',
            role=UserRole.STUDENT,
            first_name='Jane',
            last_name='Smith'
        )
        data = {
            'user': str(new_user.id),
            'department': str(self.department.id),
            'course': str(self.course.id),
            'semester': str(self.semester.id),
            'admission_number': 'ADM2025001',
            'roll_number': 'CS002',
            'registration_number': 'REG2025002',
            'date_of_birth': '2000-02-01',
            'gender': 'female',
            'phone': '1234567891',
            'email': 'student2@test.com',
            'guardian_name': 'John Smith',
            'guardian_phone': '0987654322',
            'address': '456 Oak Ave',
            'admission_date': '2025-06-01',
            'current_semester': 1,
            'is_active': True
        }
        response = self.client.post('/api/v1/students/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/students/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_admission_number(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/students/?search=ADM2025001')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_roll_number(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/students/?search=CS001')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_user_name(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/students/?search=John')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_admission_number(self):
        new_user = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='testpass123',
            role=UserRole.STUDENT,
            first_name='Jane',
            last_name='Smith'
        )
        Student.objects.create(
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
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/students/?ordering=admission_number')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_current_semester(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/students/?ordering=current_semester')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_department(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/students/?department={self.department.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_course(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/students/?course={self.course.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_semester(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/students/?semester={self.semester.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_gender(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/students/?gender=male')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/students/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_student_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'current_semester': 2}
        response = self.client.patch(f'/api/v1/students/{self.student.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.current_semester, 2)
