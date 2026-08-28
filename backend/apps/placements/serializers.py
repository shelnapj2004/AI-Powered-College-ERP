from rest_framework import serializers
from .models import PlacementDrive, PlacementApplication, ApplicationStatus


class PlacementDriveSerializer(serializers.ModelSerializer):
    # Real count of PlacementApplication rows with status=selected for this
    # drive -- Admin Placement Management's "Students Placed" column comes
    # from this, never a hardcoded number.
    students_placed = serializers.SerializerMethodField()

    class Meta:
        model = PlacementDrive
        fields = ['id', 'company_name', 'job_title', 'employment_type', 'package_lpa', 'location', 'eligibility_criteria', 'application_deadline', 'drive_date', 'description', 'is_active', 'students_placed', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_students_placed(self, obj) -> int:
        return obj.applications.filter(status=ApplicationStatus.SELECTED).count()


class PlacementApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlacementApplication
        fields = ['id', 'placement_drive', 'student', 'status', 'remarks', 'applied_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'applied_at', 'created_at', 'updated_at']
