from rest_framework import serializers
from .models import ResearchProject, ResearchMember, ApprovalStatus


class ResearchProjectSerializer(serializers.ModelSerializer):
    # Read-only display helpers so the Admin Research UI can render names
    # instead of raw FK ids without a duplicate faculty-name string field.
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)
    principal_investigator_name = serializers.CharField(source='principal_investigator.user.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, default=None)

    class Meta:
        model = ResearchProject
        fields = [
            'id', 'title', 'description', 'principal_investigator', 'principal_investigator_name',
            'department', 'department_name', 'department_code', 'funding_agency', 'budget',
            'start_date', 'end_date', 'status', 'is_active',
            'approval_status', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'created_at', 'updated_at',
        ]
        # approval_status/reviewed_by/reviewed_at are only ever changed via
        # the dedicated approve/reject actions (ResearchProjectViewSet),
        # never accepted directly on create/update -- a HOD or Admin
        # sending approval_status='approved' in a plain POST/PATCH body
        # must not be able to self-approve a project.
        # principal_investigator/department are server-derived from the
        # authenticated HOD in ResearchProjectViewSet.perform_create -- if
        # they stay writable/required here, DRF rejects the HOD payload
        # (which correctly omits them) before perform_create ever runs.
        read_only_fields = [
            'id', 'principal_investigator', 'department',
            'approval_status', 'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        if attrs.get('end_date') and attrs.get('start_date'):
            if attrs['end_date'] < attrs['start_date']:
                raise serializers.ValidationError({'end_date': 'End date must be greater than or equal to start date.'})
        return attrs


class PublicResearchProjectSerializer(serializers.ModelSerializer):
    """Minimal, read-only shape for the public (unauthenticated) website."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    principal_investigator_name = serializers.CharField(source='principal_investigator.user.get_full_name', read_only=True)

    class Meta:
        model = ResearchProject
        fields = ['id', 'title', 'description', 'department_name', 'principal_investigator_name',
                  'funding_agency', 'budget', 'start_date', 'end_date', 'status']
        read_only_fields = fields


class ResearchMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchMember
        fields = ['id', 'research_project', 'teacher', 'role', 'joined_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'joined_at', 'created_at', 'updated_at']
