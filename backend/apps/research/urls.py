from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResearchProjectViewSet, ResearchMemberViewSet, PublicResearchProjectListView

router = DefaultRouter()
router.register(r'research-projects', ResearchProjectViewSet, basename='research-project')
router.register(r'research-members', ResearchMemberViewSet, basename='research-member')

urlpatterns = [
    path('public/research-projects/', PublicResearchProjectListView.as_view(), name='public-research-projects'),
    path('', include(router.urls)),
]