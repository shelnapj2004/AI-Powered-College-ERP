from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

from apps.accounts.views import (
    CurrentUserView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    LogoutView,
)

app_name = "accounts"

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="token-refresh"),
    path("verify/", TokenVerifyView.as_view(), name="token-verify"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
]
