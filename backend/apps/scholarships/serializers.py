from rest_framework import serializers
from .models import Scholarship, ScholarshipApplication


class ScholarshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scholarship
        fields = ['id', 'name', 'scholarship_type', 'provider', 'description', 'eligibility_criteria', 'amount', 'application_deadline', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        if attrs.get('amount') is not None and attrs['amount'] <= 0:
            raise serializers.ValidationError({'amount': 'Amount must be positive.'})
        return attrs


class ScholarshipApplicationSerializer(serializers.ModelSerializer):
    scholarship_name = serializers.CharField(source='scholarship.name', read_only=True)
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)

    class Meta:
        model = ScholarshipApplication
        fields = ['id', 'scholarship', 'scholarship_name', 'student', 'student_name', 'status', 'applied_at', 'remarks', 'created_at', 'updated_at']
        read_only_fields = ['id', 'applied_at', 'created_at', 'updated_at']

    def validate(self, attrs):
        scholarship = attrs.get('scholarship')
        student = attrs.get('student')
        
        if scholarship and student:
            if not scholarship.is_active:
                raise serializers.ValidationError({'scholarship': 'This scholarship is not currently accepting applications.'})
            
            instance = self.instance
            queryset = ScholarshipApplication.objects.filter(
                scholarship=scholarship,
                student=student
            )
            if instance:
                queryset = queryset.exclude(id=instance.id)
            if queryset.exists():
                raise serializers.ValidationError({'scholarship': 'You have already applied for this scholarship.'})
        
        return attrs
