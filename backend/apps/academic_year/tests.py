from datetime import date, timedelta
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from .models import AcademicYear


class AcademicYearViewSetTestCase(TestCase):
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
        self.academic_year = AcademicYear.objects.create(
            name='2025-2026',
            start_date=date(2025, 6, 1),
            end_date=date(2026, 5, 31),
            is_current=True,
            is_active=True
        )

    def test_list_academic_years(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/academic-years/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_academic_year(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/v1/academic-years/{self.academic_year.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], '2025-2026')

    def test_create_academic_year_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'name': '2026-2027',
            'start_date': '2026-06-01',
            'end_date': '2027-05-31',
            'is_current': False,
            'is_active': True
        }
        response = self.client.post('/api/v1/academic-years/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AcademicYear.objects.count(), 2)

    def test_create_academic_year_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'name': '2026-2027',
            'start_date': '2026-06-01',
            'end_date': '2027-05-31',
            'is_current': False,
            'is_active': True
        }
        response = self.client.post('/api/v1/academic-years/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_academic_year_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'name': '2025-2026',
            'start_date': '2025-06-01',
            'end_date': '2026-05-31',
            'is_current': True,
            'is_active': False
        }
        response = self.client.put(f'/api/v1/academic-years/{self.academic_year.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.academic_year.refresh_from_db()
        self.assertEqual(self.academic_year.is_active, False)

    def test_update_academic_year_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        data = {
            'name': '2025-2026',
            'start_date': '2025-06-01',
            'end_date': '2026-05-31',
            'is_current': True,
            'is_active': False
        }
        response = self.client.put(f'/api/v1/academic-years/{self.academic_year.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_academic_year_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/academic-years/{self.academic_year.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(AcademicYear.objects.count(), 0)

    def test_delete_academic_year_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.delete(f'/api/v1/academic-years/{self.academic_year.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_name_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'name': '2025-2026',
            'start_date': '2026-06-01',
            'end_date': '2027-05-31',
            'is_current': False,
            'is_active': True
        }
        response = self.client.post('/api/v1/academic-years/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_end_date_after_start_date_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'name': '2026-2027',
            'start_date': '2027-05-31',
            'end_date': '2026-06-01',
            'is_current': False,
            'is_active': True
        }
        response = self.client.post('/api/v1/academic-years/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_one_current_academic_year(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'name': '2026-2027',
            'start_date': '2026-06-01',
            'end_date': '2027-05-31',
            'is_current': True,
            'is_active': True
        }
        response = self.client.post('/api/v1/academic-years/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.academic_year.refresh_from_db()
        self.assertEqual(self.academic_year.is_current, False)

    def test_authentication_required(self):
        response = self.client.get('/api/v1/academic-years/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_by_name(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/academic-years/?search=2025')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_name(self):
        AcademicYear.objects.create(
            name='2026-2027',
            start_date=date(2026, 6, 1),
            end_date=date(2027, 5, 31),
            is_current=False,
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/academic-years/?ordering=name')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_ordering_by_start_date(self):
        AcademicYear.objects.create(
            name='2026-2027',
            start_date=date(2026, 6, 1),
            end_date=date(2027, 5, 31),
            is_current=False,
            is_active=True
        )
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/academic-years/?ordering=start_date')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_by_is_current(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/academic-years/?is_current=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_is_active(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/academic-years/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_patch_update_academic_year_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'is_active': False}
        response = self.client.patch(f'/api/v1/academic-years/{self.academic_year.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.academic_year.refresh_from_db()
        self.assertEqual(self.academic_year.is_active, False)
