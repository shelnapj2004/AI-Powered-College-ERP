from rest_framework import serializers
from .models import Event, EventRegistration


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'event_type', 'venue', 'event_date', 'start_time', 'end_time', 'organizer', 'registration_required', 'registration_deadline', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        if attrs.get('end_time') and attrs.get('start_time'):
            if attrs['end_time'] <= attrs['start_time']:
                raise serializers.ValidationError({'end_time': 'End time must be greater than start time.'})
        if attrs.get('registration_required') and not attrs.get('registration_deadline'):
            raise serializers.ValidationError({'registration_deadline': 'Registration deadline is required when registration is required.'})
        return attrs


class EventRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventRegistration
        fields = ['id', 'event', 'student', 'status', 'registered_at', 'remarks', 'created_at', 'updated_at']
        read_only_fields = ['id', 'registered_at', 'created_at', 'updated_at']

    def validate(self, attrs):
        if attrs.get('event') and attrs.get('student'):
            event = attrs['event']
            if event.registration_required and event.registration_deadline:
                from django.utils import timezone
                if timezone.now().date() > event.registration_deadline:
                    raise serializers.ValidationError({'event': 'Registration deadline has passed.'})
        return attrs
