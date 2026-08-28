from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyMaterialViewSet

router = DefaultRouter()
router.register(r'study-materials', StudyMaterialViewSet, basename='study-material')

urlpatterns = [
    path('', include(router.urls)),
]