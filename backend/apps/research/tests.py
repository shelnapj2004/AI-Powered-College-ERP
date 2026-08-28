from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.departments.models import Department
from apps.teachers.models import Teacher
from .models import ResearchProject, ResearchMember, ProjectStatus, MemberRole


class ResearchProjectViewSetTestCase(TestCase):
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
        self.research_project = ResearchProject.objects.create(
            title='AI in Healthcare',
            description='Research on AI applications in healthcare',
            principal_investigator=self.teacher,
            department=self.department,
            funding_agency='National Science Foundation',
            budget=500000.00,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            status=ProjectStatus.ONGOING,
            is_active=True
        )

    def test_list_research_projects(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/research-projects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_research_project(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/research-projects/{self.research_project.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'AI in Healthcare')

    def test_create_research_project_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'title': 'Machine Learning in Finance',
            'description': 'Research on ML applications in finance',
            'principal_investigator': str(self.teacher.id),
            'department': str(self.department.id),
            'funding_agency': 'National Institutes of Health',
            'budget': 750000.00,
            'start_date': '2025-02-01',
            'end_date': '2026-01-31',
            'status': 'planning',
            'is_active': True
        }
        response = self.client.post('/api/v1/research-projects/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ResearchProject.objects.count(), 2)

    def test_create_research_project_as_teacher_forbidden(self):
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'title': 'Machine Learning in Finance',
            'description': 'Research on ML applications in finance',
            'principal_investigator': str(self.teacher.id),
            'department': str(self.department.id),
            'funding_agency': 'National Institutes of Health',
            'budget': 750000.00,
            'start_date': '2025-02-01',
            'end_date': '2026-01-31',
            'status': 'planning',
            'is_active': True
        }
        response = self.client.post('/api/v1/research-projects/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_research_project_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'title': 'AI in Healthcare Updated',
            'description': 'Research on AI applications in healthcare',
            'principal_investigator': str(self.teacher.id),
            'department': str(self.department.id),
            'funding_agency': 'National Science Foundation',
            'budget': 600000.00,
            'start_date': '2025-01-01',
            'end_date': '2025-12-31',
            'status': 'ongoing',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/research-projects/{self.research_project.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.research_project.refresh_from_db()
        self.assertEqual(self.research_project.budget, 600000.00)

    def test_update_research_project_as_teacher_forbidden(self):
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'title': 'AI in Healthcare Updated',
            'description': 'Research on AI applications in healthcare',
            'principal_investigator': str(self.teacher.id),
            'department': str(self.department.id),
            'funding_agency': 'National Science Foundation',
            'budget': 600000.00,
            'start_date': '2025-01-01',
            'end_date': '2025-12-31',
            'status': 'ongoing',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/research-projects/{self.research_project.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_research_project_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/research-projects/{self.research_project.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ResearchProject.objects.count(), 0)

    def test_delete_research_project_as_teacher_forbidden(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.delete(f'/api/v1/research-projects/{self.research_project.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_end_date_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'title': 'Invalid Dates',
            'description': 'Research with invalid dates',
            'principal_investigator': str(self.teacher.id),
            'department': str(self.department.id),
            'funding_agency': 'Test Agency',
            'budget': 100000.00,
            'start_date': '2025-12-31',
            'end_date': '2025-01-01',
            'status': 'planning',
            'is_active': True
        }
        response = self.client.post('/api/v1/research-projects/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/research-projects/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_title(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/research-projects/?search=Healthcare')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_principal_investigator(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/research-projects/?search=John')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_title(self):
        ResearchProject.objects.create(
            title='Blockchain Research',
            description='Research on blockchain technology',
            principal_investigator=self.teacher,
            department=self.department,
            start_date=date(2025, 3, 1),
            status=ProjectStatus.PLANNING,
            is_active=True
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/research-projects/?ordering=title')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_by_department(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/research-projects/?department={self.department.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_status(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/research-projects/?status=ongoing')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/research-projects/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_research_project_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'budget': 550000.00}
        response = self.client.patch(f'/api/v1/research-projects/{self.research_project.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.research_project.refresh_from_db()
        self.assertEqual(self.research_project.budget, 550000.00)


class ResearchMemberViewSetTestCase(TestCase):
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
        self.teacher_user2 = User.objects.create_user(
            username='teacher2',
            email='teacher2@test.com',
            password='testpass123',
            role=UserRole.TEACHER,
            first_name='Jane',
            last_name='Smith'
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
        self.teacher2 = Teacher.objects.create(
            user=self.teacher_user2,
            department=self.department,
            employee_id='EMP2025002',
            designation='Associate Professor',
            qualification='Ph.D.',
            specialization='Machine Learning',
            experience_years=5,
            phone='1234567891',
            email='teacher2@test.com',
            address='456 Oak Ave',
            joining_date=date(2021, 6, 1),
            is_active=True
        )
        self.research_project = ResearchProject.objects.create(
            title='AI in Healthcare',
            description='Research on AI applications in healthcare',
            principal_investigator=self.teacher,
            department=self.department,
            funding_agency='National Science Foundation',
            budget=500000.00,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            status=ProjectStatus.ONGOING,
            is_active=True
        )
        self.research_member = ResearchMember.objects.create(
            research_project=self.research_project,
            teacher=self.teacher2,
            role=MemberRole.CO_INVESTIGATOR
        )

    def test_list_research_members(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/research-members/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_research_member(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/research-members/{self.research_member.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'co_investigator')

    def test_create_research_member_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'research_project': str(self.research_project.id),
            'teacher': str(self.teacher.id),
            'role': 'research_assistant'
        }
        response = self.client.post('/api/v1/research-members/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ResearchMember.objects.count(), 2)

    def test_create_research_member_as_teacher_forbidden(self):
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'research_project': str(self.research_project.id),
            'teacher': str(self.teacher.id),
            'role': 'research_assistant'
        }
        response = self.client.post('/api/v1/research-members/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_research_member_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'research_project': str(self.research_project.id),
            'teacher': str(self.teacher2.id),
            'role': 'faculty_member'
        }
        response = self.client.put(f'/api/v1/research-members/{self.research_member.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.research_member.refresh_from_db()
        self.assertEqual(self.research_member.role, 'faculty_member')

    def test_update_research_member_as_teacher_forbidden(self):
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'research_project': str(self.research_project.id),
            'teacher': str(self.teacher2.id),
            'role': 'faculty_member'
        }
        response = self.client.put(f'/api/v1/research-members/{self.research_member.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_research_member_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/research-members/{self.research_member.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ResearchMember.objects.count(), 0)

    def test_delete_research_member_as_teacher_forbidden(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.delete(f'/api/v1/research-members/{self.research_member.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/research-members/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_teacher_name(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/research-members/?search=Jane')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_project_title(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/research-members/?search=Healthcare')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_joined_at(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/research-members/?ordering=joined_at')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_research_project(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/research-members/?research_project={self.research_project.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_teacher(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/research-members/?teacher={self.teacher2.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_role(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/research-members/?role=co_investigator')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_research_member_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'role': 'research_assistant'}
        response = self.client.patch(f'/api/v1/research-members/{self.research_member.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.research_member.refresh_from_db()
        self.assertEqual(self.research_member.role, 'research_assistant')

