from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 'target_audience',
            'created_by', 'created_by_name', 'is_active', 'published_at',
            'expires_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'published_at', 'created_at', 'updated_at']
