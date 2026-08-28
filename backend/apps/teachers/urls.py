from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeacherSubjectAssignmentViewSet, TeacherViewSet

router = DefaultRouter()
router.register(r'teachers', TeacherViewSet, basename='teacher')
router.register(r'teacher-subject-assignments', TeacherSubjectAssignmentViewSet, basename='teacher-subject-assignment')

urlpatterns = [
    path('', include(router.urls)),
]
