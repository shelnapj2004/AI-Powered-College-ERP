from datetime import date
from django.utils import timezone
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
from .models import StudyMaterial, MaterialType


class StudyMaterialViewSetTestCase(TestCase):
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
        self.study_material = StudyMaterial.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            title='Python Basics',
            description='Introduction to Python programming',
            material_type=MaterialType.PDF,
            uploaded_at=timezone.now(),
            is_active=True
        )

    def test_list_study_materials(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/study-materials/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_study_material(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/study-materials/{self.study_material.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Python Basics')

    def test_create_study_material_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Data Structures',
            'description': 'Advanced data structures',
            'material_type': MaterialType.NOTES,
            'uploaded_at': timezone.now().isoformat(),
            'is_active': True
        }
        response = self.client.post('/api/v1/study-materials/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StudyMaterial.objects.count(), 2)

    def test_create_study_material_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Data Structures',
            'description': 'Advanced data structures',
            'material_type': MaterialType.NOTES,
            'uploaded_at': timezone.now().isoformat(),
            'is_active': True
        }
        response = self.client.post('/api/v1/study-materials/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_study_material_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Python Basics Updated',
            'description': 'Introduction to Python programming',
            'material_type': MaterialType.PDF,
            'uploaded_at': timezone.now().isoformat(),
            'is_active': False
        }
        response = self.client.put(f'/api/v1/study-materials/{self.study_material.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.study_material.refresh_from_db()
        self.assertEqual(self.study_material.title, 'Python Basics Updated')

    def test_update_study_material_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Python Basics Updated',
            'description': 'Introduction to Python programming',
            'material_type': MaterialType.PDF,
            'uploaded_at': timezone.now().isoformat(),
            'is_active': False
        }
        response = self.client.put(f'/api/v1/study-materials/{self.study_material.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_study_material_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/study-materials/{self.study_material.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(StudyMaterial.objects.count(), 0)

    def test_delete_study_material_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/study-materials/{self.study_material.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/study-materials/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_title(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/study-materials/?search=Python')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_description(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/study-materials/?search=programming')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_subject_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/study-materials/?search=Programming')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_semester_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/study-materials/?search=Semester')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_title(self):
        StudyMaterial.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            title='Algorithms',
            description='Algorithm design',
            material_type=MaterialType.NOTES,
            uploaded_at=timezone.now(),
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/study-materials/?ordering=title')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_uploaded_at(self):
        StudyMaterial.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            title='Algorithms',
            description='Algorithm design',
            material_type=MaterialType.NOTES,
            uploaded_at=timezone.now(),
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/study-materials/?ordering=uploaded_at')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_material_type(self):
        StudyMaterial.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            title='Algorithms',
            description='Algorithm design',
            material_type=MaterialType.VIDEO,
            uploaded_at=timezone.now(),
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/study-materials/?ordering=material_type')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_by_subject(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/study-materials/?subject={self.subject.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_semester(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/study-materials/?semester={self.semester.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_teacher(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/study-materials/?teacher={self.teacher.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_material_type(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/study-materials/?material_type=pdf')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/study-materials/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_study_material_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'is_active': False}
        response = self.client.patch(f'/api/v1/study-materials/{self.study_material.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.study_material.refresh_from_db()
        self.assertEqual(self.study_material.is_active, False)
