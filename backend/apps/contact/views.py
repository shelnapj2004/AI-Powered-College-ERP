from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.permissions import IsAdmin, IsStaff

from .models import ContactMessage
from .serializers import ContactMessageSerializer


class ContactMessageViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                             mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Public Contact form submissions.

    Permissions:
      - Anyone (including anonymous visitors): may submit (create) a
        message -- the public /contact page requires no login.
      - Staff/Admin only: may list/retrieve submitted messages. No other
        role, including Student/Teacher/HOD, can read them.

    No update/destroy -- the existing public workflow has no edit path,
    only submit-and-review.
    """

    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    search_fields = ['name', 'email', 'subject', 'message']
    ordering_fields = ['created_at']

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [(IsAdmin | IsStaff)()]

    def get_queryset(self):
        queryset = super().get_queryset()
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() in ('true', '1', 'yes'))
        return queryset

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Mark a message read. Staff/Admin only (enforced by permission_classes)."""
        message = self.get_object()
        message.is_read = True
        message.save(update_fields=['is_read'])
        return Response(self.get_serializer(message).data)
