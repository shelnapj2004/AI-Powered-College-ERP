from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuestionViewSet

router = DefaultRouter()
router.register(r'question-bank', QuestionViewSet, basename='question-bank')

urlpatterns = [
    path('', include(router.urls)),
]
