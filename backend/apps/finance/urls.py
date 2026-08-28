from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeeStructureViewSet, FeePaymentViewSet, FeeSummaryView

router = DefaultRouter()
router.register(r'fee-structures', FeeStructureViewSet, basename='fee-structure')
router.register(r'fee-payments', FeePaymentViewSet, basename='fee-payment')

urlpatterns = [
    path('fee-summary/', FeeSummaryView.as_view(), name='fee-summary'),
    path('', include(router.urls)),
]
