from django.utils import timezone

from rest_framework import viewsets

from apps.accounts.models import UserRole
from apps.core.permissions import IsAdmin, IsStaff, ReadOnly
from .models import Notification, TargetAudience
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """Admin/Staff create and send notifications; everyone else reads (feed).

    Teacher and Student reads are scoped server-side to notifications
    actually addressed to them (target_audience ALL or their own role) --
    the frontend must never be trusted to filter this on its own
    (Priority 4). Admin/Staff/HOD keep their existing unrestricted feed
    from Priority 3.
    """

    queryset = Notification.objects.select_related('created_by').all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAdmin | IsStaff | ReadOnly]
    search_fields = ['title', 'message', 'notification_type', 'target_audience']
    ordering_fields = ['published_at', 'notification_type', 'target_audience', 'created_at']
    filterset_fields = ['notification_type', 'target_audience', 'is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.STAFF, UserRole.HOD):
            return queryset
        if user.role == UserRole.TEACHER:
            return queryset.filter(
                target_audience__in=[TargetAudience.ALL, TargetAudience.TEACHERS],
                is_active=True,
            )
        if user.role == UserRole.STUDENT:
            return queryset.filter(
                target_audience__in=[TargetAudience.ALL, TargetAudience.STUDENTS],
                is_active=True,
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, published_at=timezone.now())
