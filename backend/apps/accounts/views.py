from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.serializers import CustomTokenObtainPairSerializer, LogoutSerializer, UserSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login — obtain access and refresh JWT tokens."""

    serializer_class = CustomTokenObtainPairSerializer

    @extend_schema(tags=["auth"], summary="Obtain JWT token pair")
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class CustomTokenRefreshView(TokenRefreshView):
    """Refresh an expired access token."""

    @extend_schema(tags=["auth"], summary="Refresh JWT access token")
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            response.data["success"] = True
        return response


class LogoutView(APIView):
    """
    Logout — blacklist the refresh token.
    Requires a valid access token and refresh token in the body.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["auth"],
        summary="Logout (blacklist refresh token)",
        request=LogoutSerializer,
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except Exception:
            return Response(
                {"success": False, "error": {"message": "Invalid or expired refresh token"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"success": True, "message": "Logged out successfully"}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """Return the authenticated user's profile."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["users"], summary="Get current user profile")
    def get(self, request):
        return Response(
            {"success": True, "user": UserSerializer(request.user).data},
            status=status.HTTP_200_OK,
        )


class TokenVerifyPlaceholderView(APIView):
    """
    Placeholder for token verification documentation.
    Use rest_framework_simplejwt's TokenVerifyView via URL routing.
    """

    permission_classes = [AllowAny]
