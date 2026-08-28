from rest_framework import serializers
from .models import Assignment, AssignmentSubmission


class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = ['id', 'subject', 'semester', 'teacher', 'title', 'description', 'assigned_date', 'due_date', 'maximum_marks', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'teacher', 'created_at', 'updated_at']

    def validate(self, attrs):
        if attrs.get('due_date') and attrs.get('assigned_date'):
            if attrs['due_date'] < attrs['assigned_date']:
                raise serializers.ValidationError({'due_date': 'Due date must be greater than or equal to assigned date.'})
        if attrs.get('maximum_marks') is not None and attrs['maximum_marks'] <= 0:
            raise serializers.ValidationError({'maximum_marks': 'Maximum marks must be positive.'})
        return attrs


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentSubmission
        fields = ['id', 'assignment', 'student', 'submission_file', 'submitted_at', 'obtained_marks', 'feedback', 'status', 'created_at', 'updated_at']
        # status/submitted_at/student are derived server-side (see
        # AssignmentSubmissionViewSet.perform_create/perform_update), never
        # trusted from the client -- a Student must not be able to claim
        # an on-time submission by POSTing status='submitted' directly, nor
        # submit on behalf of another student by POSTing a different
        # student id. Without 'student' being read-only here, DRF requires
        # it as an input field and rejects every Student submission with
        # HTTP 400 "student: This field is required." before perform_create
        # ever runs -- that was the root cause of the reported 400.
        read_only_fields = ['id', 'student', 'status', 'submitted_at', 'created_at', 'updated_at']

    def validate_obtained_marks(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('Obtained marks cannot be negative.')
        return value

    def validate(self, attrs):
        if attrs.get('obtained_marks') is not None and attrs.get('assignment'):
            if attrs['obtained_marks'] > attrs['assignment'].maximum_marks:
                raise serializers.ValidationError({'obtained_marks': 'Obtained marks cannot exceed maximum marks.'})
        return attrs
