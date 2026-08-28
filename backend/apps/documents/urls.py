from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentDocumentViewSet

router = DefaultRouter()
router.register(r'documents', StudentDocumentViewSet, basename='student-document')

urlpatterns = [
    path('', include(router.urls)),
]
