from rest_framework import serializers
from .models import Subject


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'course', 'semester', 'code', 'name', 'credits', 'subject_type', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_credits(self, value):
        if value <= 0:
            raise serializers.ValidationError('Credits must be positive.')
        return value

    def validate(self, attrs):
        course = attrs.get('course', getattr(self.instance, 'course', None))
        semester = attrs.get('semester', getattr(self.instance, 'semester', None))
        if course and semester and semester.course_id != course.id:
            raise serializers.ValidationError({'semester': 'Semester does not belong to the selected course.'})
        return attrs
