from rest_framework import serializers
from .models import TeacherFeedback


class TeacherFeedbackSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True, default=None)
    teacher_name = serializers.CharField(source='teacher.user.get_full_name', read_only=True, default=None)

    class Meta:
        model = TeacherFeedback
        fields = [
            'id', 'teacher', 'teacher_name', 'student', 'student_name',
            'rating', 'comment', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'student', 'created_at', 'updated_at']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value
