from datetime import date, timedelta, datetime
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
from apps.students.models import Student
from .models import Assignment, AssignmentSubmission, SubmissionStatus


class AssignmentViewSetTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            role=UserRole.ADMIN
        )
        self.teacher_user = User.objects.create_user(
            username='teacher',
            email='teacher@test.com',
            password='testpass123',
            role=UserRole.TEACHER
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
        self.subject = Subject.objects.create(
            course=self.course,
            semester=self.semester,
            code='CS101',
            name='Introduction to Computer Science',
            credits=4,
            subject_type='theory',
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
            address='123 Test Street',
            joining_date=date(2020, 1, 1),
            is_active=True
        )
        self.assignment = Assignment.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            title='First Assignment',
            description='Complete the exercises',
            assigned_date=date(2025, 7, 1),
            due_date=date(2025, 7, 15),
            maximum_marks=100.00,
            is_active=True
        )

    def test_list_assignments(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/assignments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_assignment(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/assignments/{self.assignment.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'First Assignment')

    def test_create_assignment_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Second Assignment',
            'description': 'Complete project',
            'assigned_date': '2025-07-16',
            'due_date': '2025-07-30',
            'maximum_marks': 50.00,
            'is_active': True
        }
        response = self.client.post('/api/v1/assignments/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Assignment.objects.count(), 2)

    def test_create_assignment_as_teacher(self):
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Second Assignment',
            'description': 'Complete project',
            'assigned_date': '2025-07-16',
            'due_date': '2025-07-30',
            'maximum_marks': 50.00,
            'is_active': True
        }
        response = self.client.post('/api/v1/assignments/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Assignment.objects.count(), 2)

    def test_create_assignment_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Second Assignment',
            'description': 'Complete project',
            'assigned_date': '2025-07-16',
            'due_date': '2025-07-30',
            'maximum_marks': 50.00,
            'is_active': True
        }
        response = self.client.post('/api/v1/assignments/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_assignment_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Updated Assignment',
            'description': 'Complete the exercises',
            'assigned_date': '2025-07-01',
            'due_date': '2025-07-15',
            'maximum_marks': 100.00,
            'is_active': False
        }
        response = self.client.put(f'/api/v1/assignments/{self.assignment.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.title, 'Updated Assignment')
        self.assertEqual(self.assignment.is_active, False)

    def test_update_assignment_as_teacher(self):
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Updated Assignment',
            'description': 'Complete the exercises',
            'assigned_date': '2025-07-01',
            'due_date': '2025-07-15',
            'maximum_marks': 100.00,
            'is_active': False
        }
        response = self.client.put(f'/api/v1/assignments/{self.assignment.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.title, 'Updated Assignment')

    def test_update_assignment_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Updated Assignment',
            'description': 'Complete the exercises',
            'assigned_date': '2025-07-01',
            'due_date': '2025-07-15',
            'maximum_marks': 100.00,
            'is_active': False
        }
        response = self.client.put(f'/api/v1/assignments/{self.assignment.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_assignment_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/assignments/{self.assignment.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Assignment.objects.count(), 0)

    def test_delete_assignment_as_teacher(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.delete(f'/api/v1/assignments/{self.assignment.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Assignment.objects.count(), 0)

    def test_delete_assignment_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/assignments/{self.assignment.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_due_date_before_assigned_date_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Invalid Assignment',
            'description': 'Complete project',
            'assigned_date': '2025-07-30',
            'due_date': '2025-07-16',
            'maximum_marks': 50.00,
            'is_active': True
        }
        response = self.client.post('/api/v1/assignments/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_maximum_marks_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'title': 'Invalid Assignment',
            'description': 'Complete project',
            'assigned_date': '2025-07-16',
            'due_date': '2025-07-30',
            'maximum_marks': -10.00,
            'is_active': True
        }
        response = self.client.post('/api/v1/assignments/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/assignments/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_title(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/assignments/?search=First')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_subject_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/assignments/?search=Computer')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_subject(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/assignments/?subject={self.subject.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_semester(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/assignments/?semester={self.semester.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_teacher(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/assignments/?teacher={self.teacher.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/assignments/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_due_date(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/assignments/?ordering=-due_date')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_assignment_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'is_active': False}
        response = self.client.patch(f'/api/v1/assignments/{self.assignment.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.is_active, False)


class AssignmentSubmissionViewSetTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            role=UserRole.ADMIN
        )
        self.teacher_user = User.objects.create_user(
            username='teacher',
            email='teacher@test.com',
            password='testpass123',
            role=UserRole.TEACHER
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
        self.subject = Subject.objects.create(
            course=self.course,
            semester=self.semester,
            code='CS101',
            name='Introduction to Computer Science',
            credits=4,
            subject_type='theory',
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
            address='123 Test Street',
            joining_date=date(2020, 1, 1),
            is_active=True
        )
        self.student = Student.objects.create(
            user=self.student_user,
            department=self.department,
            course=self.course,
            semester=self.semester,
            admission_number='S001',
            roll_number='R001',
            registration_number='REG001',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            phone='9876543210',
            email='student@test.com',
            guardian_name='Guardian Name',
            guardian_phone='9876543211',
            address='456 Student Street',
            admission_date=date(2025, 6, 1),
            current_semester=1,
            is_active=True
        )
        self.assignment = Assignment.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            title='First Assignment',
            description='Complete the exercises',
            assigned_date=date(2025, 7, 1),
            due_date=date(2025, 7, 15),
            maximum_marks=100.00,
            is_active=True
        )
        self.submission = AssignmentSubmission.objects.create(
            assignment=self.assignment,
            student=self.student,
            status=SubmissionStatus.SUBMITTED,
            submitted_at=datetime(2025, 7, 10, 12, 0, 0),
            obtained_marks=85.00,
            feedback='Good work'
        )

    def test_list_submissions(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/assignment-submissions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_submission(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/assignment-submissions/{self.submission.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], SubmissionStatus.SUBMITTED)

    def test_create_submission_as_student(self):
        self.client.force_authenticate(user=self.student_user)
        new_assignment = Assignment.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            title='Second Assignment',
            description='Complete project',
            assigned_date=date(2025, 7, 16),
            due_date=date(2025, 7, 30),
            maximum_marks=50.00,
            is_active=True
        )
        data = {
            'assignment': str(new_assignment.id),
            'student': str(self.student.id),
            'status': SubmissionStatus.SUBMITTED,
            'submitted_at': '2025-07-25T12:00:00Z'
        }
        response = self.client.post('/api/v1/assignment-submissions/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AssignmentSubmission.objects.count(), 2)

    def test_create_submission_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        new_assignment = Assignment.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            title='Second Assignment',
            description='Complete project',
            assigned_date=date(2025, 7, 16),
            due_date=date(2025, 7, 30),
            maximum_marks=50.00,
            is_active=True
        )
        data = {
            'assignment': str(new_assignment.id),
            'student': str(self.student.id),
            'status': SubmissionStatus.SUBMITTED,
            'submitted_at': '2025-07-25T12:00:00Z'
        }
        response = self.client.post('/api/v1/assignment-submissions/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AssignmentSubmission.objects.count(), 2)

    def test_create_submission_as_teacher(self):
        self.client.force_authenticate(user=self.teacher_user)
        new_assignment = Assignment.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            title='Second Assignment',
            description='Complete project',
            assigned_date=date(2025, 7, 16),
            due_date=date(2025, 7, 30),
            maximum_marks=50.00,
            is_active=True
        )
        data = {
            'assignment': str(new_assignment.id),
            'student': str(self.student.id),
            'status': SubmissionStatus.SUBMITTED,
            'submitted_at': '2025-07-25T12:00:00Z'
        }
        response = self.client.post('/api/v1/assignment-submissions/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AssignmentSubmission.objects.count(), 2)

    def test_update_submission_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'assignment': str(self.assignment.id),
            'student': str(self.student.id),
            'status': SubmissionStatus.SUBMITTED,
            'submitted_at': '2025-07-10T12:00:00Z',
            'obtained_marks': 90.00,
            'feedback': 'Excellent work'
        }
        response = self.client.put(f'/api/v1/assignment-submissions/{self.submission.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.submission.refresh_from_db()
        self.assertEqual(self.submission.obtained_marks, 90.00)
        self.assertEqual(self.submission.feedback, 'Excellent work')

    def test_update_submission_as_teacher(self):
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'assignment': str(self.assignment.id),
            'student': str(self.student.id),
            'status': SubmissionStatus.SUBMITTED,
            'submitted_at': '2025-07-10T12:00:00Z',
            'obtained_marks': 90.00,
            'feedback': 'Excellent work'
        }
        response = self.client.put(f'/api/v1/assignment-submissions/{self.submission.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.submission.refresh_from_db()
        self.assertEqual(self.submission.obtained_marks, 90.00)

    def test_update_submission_as_student(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'assignment': str(self.assignment.id),
            'student': str(self.student.id),
            'status': SubmissionStatus.SUBMITTED,
            'submitted_at': '2025-07-10T12:00:00Z',
            'obtained_marks': 90.00,
            'feedback': 'Excellent work'
        }
        response = self.client.put(f'/api/v1/assignment-submissions/{self.submission.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.submission.refresh_from_db()
        self.assertEqual(self.submission.obtained_marks, 90.00)

    def test_delete_submission_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/assignment-submissions/{self.submission.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(AssignmentSubmission.objects.count(), 0)

    def test_delete_submission_as_teacher(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.delete(f'/api/v1/assignment-submissions/{self.submission.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(AssignmentSubmission.objects.count(), 0)

    def test_delete_submission_as_student(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/assignment-submissions/{self.submission.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(AssignmentSubmission.objects.count(), 0)

    def test_obtained_marks_negative_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'assignment': str(self.assignment.id),
            'student': str(self.student.id),
            'status': SubmissionStatus.SUBMITTED,
            'submitted_at': '2025-07-10T12:00:00Z',
            'obtained_marks': -5.00,
            'feedback': 'Poor work'
        }
        response = self.client.post('/api/v1/assignment-submissions/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_obtained_marks_exceeds_maximum_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        new_assignment = Assignment.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            title='Second Assignment',
            description='Complete project',
            assigned_date=date(2025, 7, 16),
            due_date=date(2025, 7, 30),
            maximum_marks=50.00,
            is_active=True
        )
        data = {
            'assignment': str(new_assignment.id),
            'student': str(self.student.id),
            'status': SubmissionStatus.SUBMITTED,
            'submitted_at': '2025-07-25T12:00:00Z',
            'obtained_marks': 75.00,
            'feedback': ''
        }
        response = self.client.post('/api/v1/assignment-submissions/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/assignment-submissions/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_assignment_title(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/assignment-submissions/?search=First')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_by_status(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/assignment-submissions/?search=submitted')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_assignment(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/assignment-submissions/?assignment={self.assignment.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_student(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/assignment-submissions/?student={self.student.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_status(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/assignment-submissions/?status=submitted')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_submitted_at(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/assignment-submissions/?ordering=-submitted_at')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_submission_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'obtained_marks': 95.00}
        response = self.client.patch(f'/api/v1/assignment-submissions/{self.submission.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.submission.refresh_from_db()
        self.assertEqual(self.submission.obtained_marks, 95.00)
