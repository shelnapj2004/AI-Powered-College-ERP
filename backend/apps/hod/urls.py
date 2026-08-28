from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HODViewSet

router = DefaultRouter()
router.register(r'hods', HODViewSet, basename='hod')

urlpatterns = [
    path('', include(router.urls)),
]
