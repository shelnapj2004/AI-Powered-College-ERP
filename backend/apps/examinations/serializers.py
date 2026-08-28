from rest_framework import serializers
from .models import Examination, InternalMark, SemesterResult, SemesterResultSubject


class ExaminationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Examination
        fields = ['id', 'subject', 'semester', 'teacher', 'exam_type', 'title', 'exam_date', 
                  'maximum_marks', 'passing_marks', 'instructions', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'teacher', 'created_at', 'updated_at']

    def validate(self, attrs):
        if attrs.get('passing_marks') and attrs.get('maximum_marks'):
            if attrs['passing_marks'] > attrs['maximum_marks']:
                raise serializers.ValidationError({'passing_marks': 'Passing marks cannot be greater than maximum marks.'})
        if attrs.get('maximum_marks') and attrs['maximum_marks'] <= 0:
            raise serializers.ValidationError({'maximum_marks': 'Maximum marks must be positive.'})
        if attrs.get('passing_marks') and attrs['passing_marks'] < 0:
            raise serializers.ValidationError({'passing_marks': 'Passing marks cannot be negative.'})
        return attrs


class InternalMarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternalMark
        fields = ['id', 'examination', 'student', 'marks_obtained', 'remarks', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        examination = attrs.get('examination')
        marks_obtained = attrs.get('marks_obtained')
        if examination and marks_obtained is not None:
            if marks_obtained > examination.maximum_marks:
                raise serializers.ValidationError({'marks_obtained': 'Marks obtained cannot be greater than maximum marks.'})
            if marks_obtained < 0:
                raise serializers.ValidationError({'marks_obtained': 'Marks obtained cannot be negative.'})
        return attrs


class SemesterResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = SemesterResult
        fields = ['id', 'student', 'semester', 'sgpa', 'cgpa', 'total_credits_earned', 
                  'result_status', 'published_date', 'remarks', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        if attrs.get('sgpa') and (attrs['sgpa'] < 0 or attrs['sgpa'] > 10):
            raise serializers.ValidationError({'sgpa': 'SGPA must be between 0 and 10.'})
        if attrs.get('cgpa') and (attrs['cgpa'] < 0 or attrs['cgpa'] > 10):
            raise serializers.ValidationError({'cgpa': 'CGPA must be between 0 and 10.'})
        if attrs.get('total_credits_earned') and attrs['total_credits_earned'] < 0:
            raise serializers.ValidationError({'total_credits_earned': 'Total credits earned cannot be negative.'})
        return attrs


class SemesterResultSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = SemesterResultSubject
        fields = ['id', 'semester_result', 'subject', 'internal_marks', 'external_marks', 
                  'total_marks', 'grade', 'grade_point', 'credits_earned', 'result', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        internal_marks = attrs.get('internal_marks')
        external_marks = attrs.get('external_marks')
        total_marks = attrs.get('total_marks')
        
        if internal_marks is not None and internal_marks < 0:
            raise serializers.ValidationError({'internal_marks': 'Internal marks cannot be negative.'})
        if external_marks is not None and external_marks < 0:
            raise serializers.ValidationError({'external_marks': 'External marks cannot be negative.'})
        if total_marks is not None and total_marks < 0:
            raise serializers.ValidationError({'total_marks': 'Total marks cannot be negative.'})
        if attrs.get('grade_point') and (attrs['grade_point'] < 0 or attrs['grade_point'] > 10):
            raise serializers.ValidationError({'grade_point': 'Grade point must be between 0 and 10.'})
        if attrs.get('credits_earned') and attrs['credits_earned'] < 0:
            raise serializers.ValidationError({'credits_earned': 'Credits earned cannot be negative.'})
        return attrs
