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
from .models import PlacementDrive, PlacementApplication, EmploymentType, ApplicationStatus


class PlacementDriveViewSetTestCase(TestCase):
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
        self.placement_drive = PlacementDrive.objects.create(
            company_name='Tech Corp',
            job_title='Software Engineer',
            employment_type=EmploymentType.FULL_TIME,
            package_lpa=10.50,
            location='Bangalore',
            eligibility_criteria='B.Tech with 60% aggregate',
            application_deadline=date(2025, 12, 31),
            drive_date=date(2026, 1, 15),
            description='Software development role',
            is_active=True
        )

    def test_list_placement_drives(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/placement-drives/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_placement_drive(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/placement-drives/{self.placement_drive.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['company_name'], 'Tech Corp')

    def test_create_placement_drive_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'company_name': 'Google',
            'job_title': 'Data Scientist',
            'employment_type': EmploymentType.FULL_TIME,
            'package_lpa': 15.00,
            'location': 'Hyderabad',
            'eligibility_criteria': 'M.Tech with 70% aggregate',
            'application_deadline': '2025-12-31',
            'drive_date': '2026-02-01',
            'description': 'Data science role',
            'is_active': True
        }
        response = self.client.post('/api/v1/placement-drives/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PlacementDrive.objects.count(), 2)

    def test_create_placement_drive_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'company_name': 'Google',
            'job_title': 'Data Scientist',
            'employment_type': EmploymentType.FULL_TIME,
            'package_lpa': 15.00,
            'location': 'Hyderabad',
            'eligibility_criteria': 'M.Tech with 70% aggregate',
            'application_deadline': '2025-12-31',
            'drive_date': '2026-02-01',
            'description': 'Data science role',
            'is_active': True
        }
        response = self.client.post('/api/v1/placement-drives/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_placement_drive_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'company_name': 'Tech Corp Updated',
            'job_title': 'Software Engineer',
            'employment_type': EmploymentType.FULL_TIME,
            'package_lpa': 12.00,
            'location': 'Bangalore',
            'eligibility_criteria': 'B.Tech with 65% aggregate',
            'application_deadline': '2025-12-31',
            'drive_date': '2026-01-15',
            'description': 'Software development role updated',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/placement-drives/{self.placement_drive.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.placement_drive.refresh_from_db()
        self.assertEqual(self.placement_drive.company_name, 'Tech Corp Updated')

    def test_update_placement_drive_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'company_name': 'Tech Corp Updated',
            'job_title': 'Software Engineer',
            'employment_type': EmploymentType.FULL_TIME,
            'package_lpa': 12.00,
            'location': 'Bangalore',
            'eligibility_criteria': 'B.Tech with 65% aggregate',
            'application_deadline': '2025-12-31',
            'drive_date': '2026-01-15',
            'description': 'Software development role updated',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/placement-drives/{self.placement_drive.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_placement_drive_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/placement-drives/{self.placement_drive.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(PlacementDrive.objects.count(), 0)

    def test_delete_placement_drive_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/placement-drives/{self.placement_drive.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/placement-drives/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_company_name(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/placement-drives/?search=Tech')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_job_title(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/placement-drives/?search=Software')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_drive_date(self):
        PlacementDrive.objects.create(
            company_name='Another Corp',
            job_title='Developer',
            employment_type=EmploymentType.FULL_TIME,
            package_lpa=8.00,
            location='Mumbai',
            eligibility_criteria='B.Tech with 60% aggregate',
            application_deadline=date(2025, 11, 30),
            drive_date=date(2026, 2, 1),
            is_active=True
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/placement-drives/?ordering=drive_date')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_by_employment_type(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/placement-drives/?employment_type={EmploymentType.FULL_TIME}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/placement-drives/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)


class PlacementApplicationViewSetTestCase(TestCase):
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
        self.placement_drive = PlacementDrive.objects.create(
            company_name='Tech Corp',
            job_title='Software Engineer',
            employment_type=EmploymentType.FULL_TIME,
            package_lpa=10.50,
            location='Bangalore',
            eligibility_criteria='B.Tech with 60% aggregate',
            application_deadline=date(2025, 12, 31),
            drive_date=date(2026, 1, 15),
            description='Software development role',
            is_active=True
        )
        self.placement_application = PlacementApplication.objects.create(
            placement_drive=self.placement_drive,
            student=self.student,
            status=ApplicationStatus.APPLIED,
            remarks='Interested candidate'
        )

    def test_list_placement_applications(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/placement-applications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_placement_application(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/placement-applications/{self.placement_application.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ApplicationStatus.APPLIED)

    def test_create_placement_application_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        new_placement_drive = PlacementDrive.objects.create(
            company_name='Google',
            job_title='Data Scientist',
            employment_type=EmploymentType.FULL_TIME,
            package_lpa=15.00,
            location='Hyderabad',
            eligibility_criteria='M.Tech with 70% aggregate',
            application_deadline=date(2025, 12, 31),
            drive_date=date(2026, 2, 1),
            description='Data science role',
            is_active=True
        )
        data = {
            'placement_drive': str(new_placement_drive.id),
            'student': str(self.student.id),
            'status': ApplicationStatus.APPLIED,
            'remarks': 'Strong candidate'
        }
        response = self.client.post('/api/v1/placement-applications/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PlacementApplication.objects.count(), 2)

    def test_create_placement_application_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'placement_drive': str(self.placement_drive.id),
            'student': str(self.student.id),
            'status': ApplicationStatus.APPLIED,
            'remarks': 'Strong candidate'
        }
        response = self.client.post('/api/v1/placement-applications/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_placement_application_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'placement_drive': str(self.placement_drive.id),
            'student': str(self.student.id),
            'status': ApplicationStatus.SHORTLISTED,
            'remarks': 'Shortlisted for interview'
        }
        response = self.client.put(f'/api/v1/placement-applications/{self.placement_application.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.placement_application.refresh_from_db()
        self.assertEqual(self.placement_application.status, ApplicationStatus.SHORTLISTED)

    def test_update_placement_application_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'placement_drive': str(self.placement_drive.id),
            'student': str(self.student.id),
            'status': ApplicationStatus.SHORTLISTED,
            'remarks': 'Shortlisted for interview'
        }
        response = self.client.put(f'/api/v1/placement-applications/{self.placement_application.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_placement_application_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/placement-applications/{self.placement_application.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(PlacementApplication.objects.count(), 0)

    def test_delete_placement_application_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/placement-applications/{self.placement_application.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/placement-applications/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_student_admission_number(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/placement-applications/?search=ADM2025001')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_student_name(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/placement-applications/?search=John')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_placement_drive(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/placement-applications/?placement_drive={self.placement_drive.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_student(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/placement-applications/?student={self.student.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_status(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/v1/placement-applications/?status={ApplicationStatus.APPLIED}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_applied_at(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/placement-applications/?ordering=applied_at')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_status(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/placement-applications/?ordering=status')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
