from rest_framework import serializers
from .models import AcademicYear


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'start_date', 'end_date', 'is_current', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        if attrs.get('end_date') and attrs.get('start_date'):
            if attrs['end_date'] <= attrs['start_date']:
                raise serializers.ValidationError({'end_date': 'End date must be greater than start date.'})
        return attrs

    def validate_name(self, value):
        instance = self.instance
        if AcademicYear.objects.filter(name=value).exclude(id=instance.id if instance else None).exists():
            raise serializers.ValidationError('Academic year with this name already exists.')
        return value
