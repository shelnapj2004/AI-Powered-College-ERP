from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlacementDriveViewSet, PlacementApplicationViewSet

router = DefaultRouter()
router.register(r'placement-drives', PlacementDriveViewSet, basename='placement-drive')
router.register(r'placement-applications', PlacementApplicationViewSet, basename='placement-application')

urlpatterns = [
    path('', include(router.urls)),
]