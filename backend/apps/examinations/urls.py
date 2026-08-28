from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExaminationViewSet, InternalMarkViewSet, SemesterResultViewSet, SemesterResultSubjectViewSet

router = DefaultRouter()
router.register(r'examinations', ExaminationViewSet, basename='examination')
router.register(r'internal-marks', InternalMarkViewSet, basename='internal-mark')
router.register(r'semester-results', SemesterResultViewSet, basename='semester-result')
router.register(r'semester-result-subjects', SemesterResultSubjectViewSet, basename='semester-result-subject')

urlpatterns = [
    path('', include(router.urls)),
]