from datetime import date, timedelta
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.departments.models import Department
from apps.courses.models import Course
from apps.academic_year.models import AcademicYear
from apps.semester.models import Semester
from apps.students.models import Student
from .models import Scholarship, ScholarshipApplication, ScholarshipType, ApplicationStatus


class ScholarshipViewSetTestCase(TestCase):
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
        self.student = Student.objects.create(
            user=self.student_user,
            department=self.department,
            course=self.course,
            semester=self.semester,
            admission_number='ADM001',
            roll_number='R001',
            registration_number='REG001',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            phone='1234567890',
            email='student@test.com',
            guardian_name='Guardian',
            guardian_phone='0987654321',
            address='Test Address',
            admission_date=date(2025, 6, 1),
            current_semester=1,
            is_active=True
        )
        self.scholarship = Scholarship.objects.create(
            name='Merit Scholarship',
            scholarship_type=ScholarshipType.MERIT,
            provider='College',
            description='Scholarship for meritorious students',
            eligibility_criteria='CGPA above 8.5',
            amount=50000.00,
            application_deadline=date(2025, 12, 31),
            is_active=True
        )

    def test_list_scholarships(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarships/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_scholarship(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/scholarships/{self.scholarship.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Merit Scholarship')

    def test_create_scholarship_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'name': 'Sports Scholarship',
            'scholarship_type': ScholarshipType.SPORTS,
            'provider': 'Sports Authority',
            'description': 'Scholarship for sports achievers',
            'eligibility_criteria': 'State level participation',
            'amount': 30000.00,
            'application_deadline': '2025-11-30',
            'is_active': True
        }
        response = self.client.post('/api/v1/scholarships/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scholarship.objects.count(), 2)

    def test_create_scholarship_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'name': 'Sports Scholarship',
            'scholarship_type': ScholarshipType.SPORTS,
            'provider': 'Sports Authority',
            'description': 'Scholarship for sports achievers',
            'eligibility_criteria': 'State level participation',
            'amount': 30000.00,
            'application_deadline': '2025-11-30',
            'is_active': True
        }
        response = self.client.post('/api/v1/scholarships/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_scholarship_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'name': 'Merit Scholarship Updated',
            'scholarship_type': ScholarshipType.MERIT,
            'provider': 'College',
            'description': 'Scholarship for meritorious students',
            'eligibility_criteria': 'CGPA above 9.0',
            'amount': 60000.00,
            'application_deadline': '2025-12-31',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/scholarships/{self.scholarship.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.scholarship.refresh_from_db()
        self.assertEqual(self.scholarship.is_active, False)

    def test_update_scholarship_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'name': 'Merit Scholarship Updated',
            'scholarship_type': ScholarshipType.MERIT,
            'provider': 'College',
            'description': 'Scholarship for meritorious students',
            'eligibility_criteria': 'CGPA above 9.0',
            'amount': 60000.00,
            'application_deadline': '2025-12-31',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/scholarships/{self.scholarship.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_scholarship_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/scholarships/{self.scholarship.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Scholarship.objects.count(), 0)

    def test_delete_scholarship_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/scholarships/{self.scholarship.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_amount_validation_negative(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'name': 'Invalid Scholarship',
            'scholarship_type': ScholarshipType.MERIT,
            'provider': 'College',
            'description': 'Test',
            'eligibility_criteria': 'Test',
            'amount': -1000.00,
            'application_deadline': '2025-12-31',
            'is_active': True
        }
        response = self.client.post('/api/v1/scholarships/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_amount_validation_zero(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'name': 'Invalid Scholarship',
            'scholarship_type': ScholarshipType.MERIT,
            'provider': 'College',
            'description': 'Test',
            'eligibility_criteria': 'Test',
            'amount': 0.00,
            'application_deadline': '2025-12-31',
            'is_active': True
        }
        response = self.client.post('/api/v1/scholarships/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/scholarships/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarships/?search=Merit')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_provider(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarships/?search=College')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_type(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarships/?search=merit')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarships/?ordering=name')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_amount(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarships/?ordering=amount')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_scholarship_type(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarships/?scholarship_type=merit')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarships/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_scholarship_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'is_active': False}
        response = self.client.patch(f'/api/v1/scholarships/{self.scholarship.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.scholarship.refresh_from_db()
        self.assertEqual(self.scholarship.is_active, False)


class ScholarshipApplicationViewSetTestCase(TestCase):
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
        self.student = Student.objects.create(
            user=self.student_user,
            department=self.department,
            course=self.course,
            semester=self.semester,
            admission_number='ADM001',
            roll_number='R001',
            registration_number='REG001',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            phone='1234567890',
            email='student@test.com',
            guardian_name='Guardian',
            guardian_phone='0987654321',
            address='Test Address',
            admission_date=date(2025, 6, 1),
            current_semester=1,
            is_active=True
        )
        self.scholarship = Scholarship.objects.create(
            name='Merit Scholarship',
            scholarship_type=ScholarshipType.MERIT,
            provider='College',
            description='Scholarship for meritorious students',
            eligibility_criteria='CGPA above 8.5',
            amount=50000.00,
            application_deadline=date(2025, 12, 31),
            is_active=True
        )

    def test_list_applications(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarship-applications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_application(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/scholarship-applications/{application.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ApplicationStatus.APPLIED)

    def test_create_application_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'scholarship': str(self.scholarship.id),
            'student': str(self.student.id),
            'status': ApplicationStatus.APPLIED
        }
        response = self.client.post('/api/v1/scholarship-applications/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ScholarshipApplication.objects.count(), 1)

    def test_create_application_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'scholarship': str(self.scholarship.id),
            'student': str(self.student.id),
            'status': ApplicationStatus.APPLIED
        }
        response = self.client.post('/api/v1/scholarship-applications/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_application_as_admin(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'scholarship': str(self.scholarship.id),
            'student': str(self.student.id),
            'status': ApplicationStatus.APPROVED,
            'remarks': 'Approved based on merit'
        }
        response = self.client.put(f'/api/v1/scholarship-applications/{application.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.APPROVED)

    def test_update_application_as_student_forbidden(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.student_user)
        data = {
            'scholarship': str(self.scholarship.id),
            'student': str(self.student.id),
            'status': ApplicationStatus.APPROVED,
            'remarks': 'Approved based on merit'
        }
        response = self.client.put(f'/api/v1/scholarship-applications/{application.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_application_as_admin(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/scholarship-applications/{application.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ScholarshipApplication.objects.count(), 0)

    def test_delete_application_as_student_forbidden(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/scholarship-applications/{application.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_application_validation(self):
        ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'scholarship': str(self.scholarship.id),
            'student': str(self.student.id),
            'status': ApplicationStatus.APPLIED
        }
        response = self.client.post('/api/v1/scholarship-applications/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_scholarship_validation(self):
        self.scholarship.is_active = False
        self.scholarship.save()
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'scholarship': str(self.scholarship.id),
            'student': str(self.student.id),
            'status': ApplicationStatus.APPLIED
        }
        response = self.client.post('/api/v1/scholarship-applications/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/scholarship-applications/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_scholarship_name(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarship-applications/?search=Merit')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_student_name(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarship-applications/?search=student')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_status(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarship-applications/?search=applied')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_status(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarship-applications/?ordering=status')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ordering_by_applied_at(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarship-applications/?ordering=applied_at')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_by_scholarship(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/scholarship-applications/?scholarship={self.scholarship.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_student(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/scholarship-applications/?student={self.student.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_status(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/scholarship-applications/?status=applied')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_application_as_admin(self):
        application = ScholarshipApplication.objects.create(
            scholarship=self.scholarship,
            student=self.student,
            status=ApplicationStatus.APPLIED
        )
        self.client.force_authenticate(user=self.admin_user)
        data = {'status': ApplicationStatus.APPROVED}
        response = self.client.patch(f'/api/v1/scholarship-applications/{application.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.APPROVED)
