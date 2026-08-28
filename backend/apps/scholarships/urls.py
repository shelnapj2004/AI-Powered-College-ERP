from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScholarshipViewSet, ScholarshipApplicationViewSet

router = DefaultRouter()
router.register(r'scholarships', ScholarshipViewSet, basename='scholarship')
router.register(r'scholarship-applications', ScholarshipApplicationViewSet, basename='scholarship-application')

urlpatterns = [
    path('', include(router.urls)),
]