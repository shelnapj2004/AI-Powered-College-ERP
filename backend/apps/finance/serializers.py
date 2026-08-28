from rest_framework import serializers
from .models import FeeStructure, FeePayment


class FeeStructureSerializer(serializers.ModelSerializer):
    # Human-readable label for the three ERP fee types (Semester Tuition
    # Fee / Exam Registration Fee / Event Fee) -- the frontend Issue Fee
    # dropdown must never show a raw internal fee_type value or UUID.
    fee_type_display = serializers.CharField(source='get_fee_type_display', read_only=True)

    class Meta:
        model = FeeStructure
        fields = [
            'id', 'fee_type', 'fee_type_display', 'course', 'academic_year', 'semester_number',
            'tuition_fee', 'exam_fee', 'library_fee', 'other_fee', 'total_fee',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FeePaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    # Read-only pass-through of the fee type/label and the amount actually
    # due (the FeeStructure's total_fee) so the Student Fee Details page
    # can show what a fee is for and how much is due without a second
    # request -- amount_paid on this row is separately the amount paid.
    fee_type = serializers.CharField(source='fee_structure.fee_type', read_only=True)
    fee_type_display = serializers.CharField(source='fee_structure.get_fee_type_display', read_only=True)
    amount_due = serializers.DecimalField(source='fee_structure.total_fee', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = FeePayment
        fields = [
            'id', 'student', 'student_name', 'fee_structure', 'fee_type', 'fee_type_display',
            'amount_due', 'amount_paid', 'payment_method', 'payment_status', 'transaction_reference',
            'payment_date', 'remarks', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
