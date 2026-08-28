from datetime import date

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.academic_year.models import AcademicYear
from apps.courses.models import Course
from apps.departments.models import Department
from apps.semester.models import Semester
from apps.students.models import Student

from .models import REQUIRED_DOCUMENT_TYPES, StudentDocument


class RequiredDocumentStatusTestCase(TestCase):
    """
    Priority 14 -- mandatory Student documents (Birth Certificate, SSLC
    Result Card, Plus Two Result Card) must be uploaded AND Staff-verified.
    Covers TEST A-H from the task spec.
    """

    def setUp(self):
        self.client = APIClient()

        self.staff_user = User.objects.create_user(
            username='staff1', email='staff1@test.com', password='testpass123',
            role=UserRole.STAFF, first_name='Staff', last_name='One',
        )
        self.student_user = User.objects.create_user(
            username='student1', email='student1@test.com', password='testpass123',
            role=UserRole.STUDENT, first_name='John', last_name='Doe',
        )
        self.other_student_user = User.objects.create_user(
            username='student2', email='student2@test.com', password='testpass123',
            role=UserRole.STUDENT, first_name='Jane', last_name='Roe',
        )

        department = Department.objects.create(name='Computer Science', code='CS', is_active=True)
        course = Course.objects.create(
            department=department, name='B.Tech CS', code='BTCS', degree='bachelor',
            duration_years=4, total_semesters=8, is_active=True,
        )
        academic_year = AcademicYear.objects.create(
            name='2025-2026', start_date=date(2025, 6, 1), end_date=date(2026, 5, 31),
            is_current=True, is_active=True,
        )
        semester = Semester.objects.create(
            academic_year=academic_year, course=course, semester_number=1, name='Semester 1',
            start_date=date(2025, 6, 1), end_date=date(2025, 10, 31), is_active=True,
        )

        def make_student(user, admission_number, roll_number):
            return Student.objects.create(
                user=user, department=department, course=course, semester=semester,
                admission_number=admission_number, roll_number=roll_number,
                registration_number=f'REG-{roll_number}', date_of_birth=date(2000, 1, 1),
                gender='male', phone='1234567890', email=user.email,
                guardian_name='Guardian', guardian_phone='0987654321', address='Addr',
                admission_date=date(2025, 6, 1), current_semester=1, is_active=True,
            )

        self.student = make_student(self.student_user, 'ADM2025001', 'CS001')
        self.other_student = make_student(self.other_student_user, 'ADM2025002', 'CS002')

    # -- TEST A: no documents -----------------------------------------
    def test_a_no_documents_shows_all_missing(self):
        self.client.force_authenticate(user=self.student_user)
        res = self.client.get('/api/v1/documents/required-status/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['completed_count'], 0)
        self.assertEqual(res.data['total_required'], 3)
        self.assertFalse(res.data['is_complete'])
        self.assertEqual({d['document_type'] for d in res.data['documents']}, set(REQUIRED_DOCUMENT_TYPES))
        self.assertTrue(all(d['status'] == 'missing' for d in res.data['documents']))

    # -- TEST B: upload Birth Certificate -> pending, not counted -----
    def test_b_upload_is_pending_not_complete(self):
        self.client.force_authenticate(user=self.student_user)
        res = self.client.post('/api/v1/documents/', {'document_type': 'Birth Certificate'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        status_res = self.client.get('/api/v1/documents/required-status/')
        bc = next(d for d in status_res.data['documents'] if d['document_type'] == 'Birth Certificate')
        self.assertEqual(bc['status'], 'pending')
        self.assertEqual(status_res.data['completed_count'], 0)

    # -- TEST C: staff verifies Birth Certificate -> 1/3, still incomplete
    def test_c_staff_verify_counts_one_of_three(self):
        self.client.force_authenticate(user=self.student_user)
        self.client.post('/api/v1/documents/', {'document_type': 'Birth Certificate'})
        doc = StudentDocument.objects.get(student=self.student, document_type='Birth Certificate')

        self.client.force_authenticate(user=self.staff_user)
        verify_res = self.client.post(f'/api/v1/documents/{doc.id}/verify/')
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)

        status_res = self.client.get(f'/api/v1/documents/required-status/?student={self.student.id}')
        self.assertEqual(status_res.data['completed_count'], 1)
        self.assertFalse(status_res.data['is_complete'])
        bc = next(d for d in status_res.data['documents'] if d['document_type'] == 'Birth Certificate')
        self.assertEqual(bc['status'], 'verified')

    # -- TEST D: staff rejects SSLC -> re-upload required --------------
    def test_d_staff_reject_marks_reupload_required(self):
        self.client.force_authenticate(user=self.student_user)
        self.client.post('/api/v1/documents/', {'document_type': 'SSLC Result Card'})
        doc = StudentDocument.objects.get(student=self.student, document_type='SSLC Result Card')

        self.client.force_authenticate(user=self.staff_user)
        reject_res = self.client.post(f'/api/v1/documents/{doc.id}/reject/')
        self.assertEqual(reject_res.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.student_user)
        status_res = self.client.get('/api/v1/documents/required-status/')
        sslc = next(d for d in status_res.data['documents'] if d['document_type'] == 'SSLC Result Card')
        self.assertEqual(sslc['status'], 'rejected')
        self.assertEqual(status_res.data['completed_count'], 0)

    # -- TEST E: student re-uploads rejected SSLC -> pending again -----
    def test_e_reupload_after_rejection_is_pending(self):
        self.client.force_authenticate(user=self.student_user)
        self.client.post('/api/v1/documents/', {'document_type': 'SSLC Result Card'})
        first = StudentDocument.objects.get(student=self.student, document_type='SSLC Result Card')

        self.client.force_authenticate(user=self.staff_user)
        self.client.post(f'/api/v1/documents/{first.id}/reject/')

        self.client.force_authenticate(user=self.student_user)
        self.client.post('/api/v1/documents/', {'document_type': 'SSLC Result Card'})

        status_res = self.client.get('/api/v1/documents/required-status/')
        sslc = next(d for d in status_res.data['documents'] if d['document_type'] == 'SSLC Result Card')
        self.assertEqual(sslc['status'], 'pending')

    # -- TEST F: all three verified -> complete -------------------------
    def test_f_all_three_verified_is_complete(self):
        self.client.force_authenticate(user=self.student_user)
        doc_ids = []
        for doc_type in REQUIRED_DOCUMENT_TYPES:
            res = self.client.post('/api/v1/documents/', {'document_type': doc_type})
            doc_ids.append(res.data['id'])

        self.client.force_authenticate(user=self.staff_user)
        for doc_id in doc_ids:
            self.client.post(f'/api/v1/documents/{doc_id}/verify/')

        self.client.force_authenticate(user=self.student_user)
        status_res = self.client.get('/api/v1/documents/required-status/')
        self.assertEqual(status_res.data['completed_count'], 3)
        self.assertTrue(status_res.data['is_complete'])

    # -- TEST G: student cannot verify their own document ---------------
    def test_g_student_cannot_verify_own_document(self):
        self.client.force_authenticate(user=self.student_user)
        res = self.client.post('/api/v1/documents/', {'document_type': 'Birth Certificate'})
        doc_id = res.data['id']

        verify_res = self.client.post(f'/api/v1/documents/{doc_id}/verify/')
        self.assertIn(verify_res.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    # -- TEST H: student cannot access another student's documents ------
    def test_h_student_cannot_access_other_students_documents(self):
        self.client.force_authenticate(user=self.other_student_user)
        self.client.post('/api/v1/documents/', {'document_type': 'Birth Certificate'})
        other_doc = StudentDocument.objects.get(student=self.other_student)

        self.client.force_authenticate(user=self.student_user)
        list_res = self.client.get('/api/v1/documents/')
        self.assertEqual(list_res.data['count'], 0)

        retrieve_res = self.client.get(f'/api/v1/documents/{other_doc.id}/')
        self.assertIn(retrieve_res.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

        # A Student passing another student's id in `?student=` must NOT
        # leak that student's data -- the backend ignores the param for a
        # Student caller and returns only their own (empty) status instead.
        required_status_res = self.client.get(f'/api/v1/documents/required-status/?student={self.other_student.id}')
        self.assertEqual(required_status_res.status_code, status.HTTP_200_OK)
        self.assertNotIn('student_id', required_status_res.data)
        self.assertEqual(required_status_res.data['completed_count'], 0)

    # -- Staff-wide overview used by the Staff Documents page -----------
    def test_staff_overview_lists_every_student(self):
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get('/api/v1/documents/required-status/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = {row['student_id'] for row in res.data}
        self.assertIn(str(self.student.id), ids)
        self.assertIn(str(self.other_student.id), ids)
