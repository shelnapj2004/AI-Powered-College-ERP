from rest_framework import serializers
from apps.accounts.models import UserRole
from .models import Question


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'subject', 'teacher', 'topic', 'question_text', 'question_type', 'options', 'correct_answer', 'marks', 'created_at', 'updated_at']
        read_only_fields = ['id', 'teacher', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Assessment integrity: a Student browsing the read-only Question
        # Bank must never receive the answer key over the wire (Problem 2).
        # Teacher/Admin keep full visibility.
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if user is not None and getattr(user, 'is_authenticated', False) and not user.is_superuser and user.role == UserRole.STUDENT:
            data.pop('correct_answer', None)
        return data
