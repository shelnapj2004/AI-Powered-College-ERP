from rest_framework import viewsets
from apps.core.permissions import IsAdmin, IsStaff, ReadOnly
from .models import Event, EventRegistration
from .serializers import EventSerializer, EventRegistrationSerializer


class EventViewSet(viewsets.ModelViewSet):
    """Admin/Staff create, update, and delete events; everyone else reads."""

    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsAdmin | IsStaff | ReadOnly]
    search_fields = ['title', 'venue', 'organizer', 'event_type']
    ordering_fields = ['event_date', 'start_time', 'end_time', 'created_at', 'event_type']
    filterset_fields = ['event_type', 'is_active', 'registration_required']


class EventRegistrationViewSet(viewsets.ModelViewSet):
    queryset = EventRegistration.objects.all()
    serializer_class = EventRegistrationSerializer
    permission_classes = [IsAdmin | ReadOnly]
    search_fields = ['student__admission_number', 'student__roll_number', 'event__title']
    ordering_fields = ['registered_at', 'status', 'created_at']
    filterset_fields = ['event', 'student', 'status']

