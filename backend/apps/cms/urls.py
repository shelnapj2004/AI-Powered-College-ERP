from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.cms.views import ContentPageViewSet

router = DefaultRouter()
router.register(r"cms/pages", ContentPageViewSet, basename="cms-page")

urlpatterns = [
    path("", include(router.urls)),
]
