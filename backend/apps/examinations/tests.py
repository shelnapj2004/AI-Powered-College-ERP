from datetime import date
from decimal import Decimal
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
from .models import Examination, InternalMark, SemesterResult, SemesterResultSubject


class ExaminationViewSetTestCase(TestCase):
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
        self.subject = Subject.objects.create(
            course=self.course,
            semester=self.semester,
            code='CS101',
            name='Introduction to Computer Science',
            credits=4,
            subject_type='core',
            is_active=True
        )
        self.teacher_user = User.objects.create_user(
            username='teacher',
            email='teacher@test.com',
            password='testpass123',
            role=UserRole.TEACHER
        )
        self.teacher = Teacher.objects.create(
            user=self.teacher_user,
            department=self.department,
            employee_id='T001',
            designation='Professor',
            qualification='Ph.D.',
            specialization='Computer Science',
            experience_years=10,
            phone='1234567890',
            email='teacher@test.com',
            address='456 Oak Ave',
            joining_date=date(2020, 1, 1),
            is_active=True
        )
        self.examination = Examination.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            exam_type='internal_1',
            title='Internal Exam 1',
            exam_date=date(2025, 7, 15),
            maximum_marks=Decimal('50.00'),
            passing_marks=Decimal('20.00'),
            is_active=True
        )

    def test_list_examinations(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/examinations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_examination(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/examinations/{self.examination.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Internal Exam 1')

    def test_create_examination_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'exam_type': 'internal_2',
            'title': 'Internal Exam 2',
            'exam_date': '2025-08-15',
            'maximum_marks': '50.00',
            'passing_marks': '20.00',
            'is_active': True
        }
        response = self.client.post('/api/v1/examinations/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Examination.objects.count(), 2)

    def test_create_examination_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'exam_type': 'internal_2',
            'title': 'Internal Exam 2',
            'exam_date': '2025-08-15',
            'maximum_marks': '50.00',
            'passing_marks': '20.00',
            'is_active': True
        }
        response = self.client.post('/api/v1/examinations/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_examination_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'exam_type': 'internal_1',
            'title': 'Updated Exam',
            'exam_date': '2025-07-15',
            'maximum_marks': '50.00',
            'passing_marks': '25.00',
            'is_active': False
        }
        response = self.client.put(f'/api/v1/examinations/{self.examination.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.examination.refresh_from_db()
        self.assertEqual(self.examination.title, 'Updated Exam')

    def test_delete_examination_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/examinations/{self.examination.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Examination.objects.count(), 0)

    def test_passing_marks_greater_than_maximum_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'exam_type': 'internal_2',
            'title': 'Invalid Exam',
            'exam_date': '2025-08-15',
            'maximum_marks': '30.00',
            'passing_marks': '50.00',
            'is_active': True
        }
        response = self.client.post('/api/v1/examinations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_maximum_marks_positive_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'subject': str(self.subject.id),
            'semester': str(self.semester.id),
            'teacher': str(self.teacher.id),
            'exam_type': 'internal_2',
            'title': 'Invalid Exam',
            'exam_date': '2025-08-15',
            'maximum_marks': '-10.00',
            'passing_marks': '20.00',
            'is_active': True
        }
        response = self.client.post('/api/v1/examinations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/examinations/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class InternalMarkViewSetTestCase(TestCase):
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
        self.subject = Subject.objects.create(
            course=self.course,
            semester=self.semester,
            code='CS101',
            name='Introduction to Computer Science',
            credits=4,
            subject_type='core',
            is_active=True
        )
        self.teacher_user = User.objects.create_user(
            username='teacher',
            email='teacher@test.com',
            password='testpass123',
            role=UserRole.TEACHER
        )
        self.teacher = Teacher.objects.create(
            user=self.teacher_user,
            department=self.department,
            employee_id='T001',
            designation='Professor',
            qualification='Ph.D.',
            specialization='Computer Science',
            experience_years=10,
            phone='1234567890',
            email='teacher@test.com',
            address='456 Oak Ave',
            joining_date=date(2020, 1, 1),
            is_active=True
        )
        self.examination = Examination.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            exam_type='internal_1',
            title='Internal Exam 1',
            exam_date=date(2025, 7, 15),
            maximum_marks=Decimal('50.00'),
            passing_marks=Decimal('20.00'),
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
            gender='female',
            phone='1234567890',
            email='jane@test.com',
            guardian_name='John Smith',
            guardian_phone='0987654321',
            address='123 Main St',
            admission_date=date(2025, 6, 1),
            current_semester=1,
            is_active=True
        )
        self.internal_mark = InternalMark.objects.create(
            examination=self.examination,
            student=self.student,
            marks_obtained=Decimal('35.50'),
            remarks='Good performance'
        )

    def test_list_internal_marks(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/internal-marks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_internal_mark(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/internal-marks/{self.internal_mark.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['marks_obtained']), 35.50)

    def test_create_internal_mark_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        # Create a different examination to avoid unique constraint violation
        new_examination = Examination.objects.create(
            subject=self.subject,
            semester=self.semester,
            teacher=self.teacher,
            exam_type='internal_2',
            title='Internal Exam 2',
            exam_date=date(2025, 8, 15),
            maximum_marks=Decimal('50.00'),
            passing_marks=Decimal('20.00'),
            is_active=True
        )
        data = {
            'examination': str(new_examination.id),
            'student': str(self.student.id),
            'marks_obtained': '40.00',
            'remarks': 'Excellent'
        }
        response = self.client.post('/api/v1/internal-marks/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InternalMark.objects.count(), 2)

    def test_marks_obtained_greater_than_maximum_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'examination': str(self.examination.id),
            'student': str(self.student.id),
            'marks_obtained': '60.00',
            'remarks': 'Invalid'
        }
        response = self.client.post('/api/v1/internal-marks/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_marks_obtained_negative_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'examination': str(self.examination.id),
            'student': str(self.student.id),
            'marks_obtained': '-5.00',
            'remarks': 'Invalid'
        }
        response = self.client.post('/api/v1/internal-marks/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SemesterResultViewSetTestCase(TestCase):
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
            admission_number='S001',
            roll_number='R001',
            registration_number='REG001',
            date_of_birth=date(2000, 1, 1),
            gender='female',
            phone='1234567890',
            email='jane@test.com',
            guardian_name='John Smith',
            guardian_phone='0987654321',
            address='123 Main St',
            admission_date=date(2025, 6, 1),
            current_semester=1,
            is_active=True
        )
        self.semester_result = SemesterResult.objects.create(
            student=self.student,
            semester=self.semester,
            sgpa=Decimal('8.50'),
            cgpa=Decimal('8.50'),
            total_credits_earned=24,
            result_status='pass',
            published_date=date(2025, 11, 15)
        )

    def test_list_semester_results(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/semester-results/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_semester_result(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/semester-results/{self.semester_result.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['sgpa']), 8.50)

    def test_create_semester_result_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'student': str(self.student.id),
            'semester': str(self.semester.id),
            'sgpa': '9.00',
            'cgpa': '9.00',
            'total_credits_earned': 24,
            'result_status': 'pass',
            'published_date': '2025-11-20'
        }
        response = self.client.post('/api/v1/semester-results/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SemesterResult.objects.count(), 2)

    def test_sgpa_range_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'student': str(self.student.id),
            'semester': str(self.semester.id),
            'sgpa': '11.00',
            'cgpa': '9.00',
            'total_credits_earned': 24,
            'result_status': 'pass',
            'published_date': '2025-11-20'
        }
        response = self.client.post('/api/v1/semester-results/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SemesterResultSubjectViewSetTestCase(TestCase):
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
        self.subject = Subject.objects.create(
            course=self.course,
            semester=self.semester,
            code='CS101',
            name='Introduction to Computer Science',
            credits=4,
            subject_type='core',
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
            gender='female',
            phone='1234567890',
            email='jane@test.com',
            guardian_name='John Smith',
            guardian_phone='0987654321',
            address='123 Main St',
            admission_date=date(2025, 6, 1),
            current_semester=1,
            is_active=True
        )
        self.semester_result = SemesterResult.objects.create(
            student=self.student,
            semester=self.semester,
            sgpa=Decimal('8.50'),
            cgpa=Decimal('8.50'),
            total_credits_earned=24,
            result_status='pass',
            published_date=date(2025, 11, 15)
        )
        self.semester_result_subject = SemesterResultSubject.objects.create(
            semester_result=self.semester_result,
            subject=self.subject,
            internal_marks=Decimal('35.00'),
            external_marks=Decimal('45.00'),
            total_marks=Decimal('80.00'),
            grade='A',
            grade_point=Decimal('9.00'),
            credits_earned=4,
            result='pass'
        )

    def test_list_semester_result_subjects(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/semester-result-subjects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_semester_result_subject(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/semester-result-subjects/{self.semester_result_subject.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['grade'], 'A')

    def test_create_semester_result_subject_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        # Create a different subject to avoid unique constraint violation
        new_subject = Subject.objects.create(
            course=self.course,
            semester=self.semester,
            code='CS102',
            name='Data Structures',
            credits=4,
            subject_type='core',
            is_active=True
        )
        data = {
            'semester_result': str(self.semester_result.id),
            'subject': str(new_subject.id),
            'internal_marks': '30.00',
            'external_marks': '50.00',
            'total_marks': '80.00',
            'grade': 'B',
            'grade_point': '8.00',
            'credits_earned': 4,
            'result': 'pass'
        }
        response = self.client.post('/api/v1/semester-result-subjects/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SemesterResultSubject.objects.count(), 2)

    def test_internal_marks_negative_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'semester_result': str(self.semester_result.id),
            'subject': str(self.subject.id),
            'internal_marks': '-10.00',
            'external_marks': '50.00',
            'total_marks': '80.00',
            'grade': 'B',
            'grade_point': '8.00',
            'credits_earned': 4,
            'result': 'pass'
        }
        response = self.client.post('/api/v1/semester-result-subjects/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_grade_point_range_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'semester_result': str(self.semester_result.id),
            'subject': str(self.subject.id),
            'internal_marks': '30.00',
            'external_marks': '50.00',
            'total_marks': '80.00',
            'grade': 'B',
            'grade_point': '11.00',
            'credits_earned': 4,
            'result': 'pass'
        }
        response = self.client.post('/api/v1/semester-result-subjects/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

