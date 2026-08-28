from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    """Read-only user profile serializer for auth responses."""

    role_display = serializers.CharField(source="get_role_display", read_only=True)
    display_id = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "display_id",
            "phone",
            "student_id",
            "employee_id",
            "department",
            "profile_picture",
            "is_verified",
            "date_joined",
        ]
        read_only_fields = fields


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    JWT token serializer that embeds role claims and returns user profile.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["role"] = user.role
        token["email"] = user.email or ""
        token["display_id"] = user.display_id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        data["success"] = True
        return data


class LogoutSerializer(serializers.Serializer):
    """Accept refresh token for blacklisting on logout."""

    refresh = serializers.CharField(required=True)
