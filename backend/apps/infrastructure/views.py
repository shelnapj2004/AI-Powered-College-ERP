from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.adminpanel.mixins import AuditLogMixin
from apps.core.permissions import IsAdmin, ReadOnly
from .models import Facility
from .serializers import FacilitySerializer


class FacilityViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """Facilities are Admin-managed; every other authenticated role reads."""

    audit_resource = 'Facility'
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer
    permission_classes = [IsAdmin | ReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'facility_type']
    ordering_fields = ['name', 'facility_type', 'status', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        facility_type = self.request.query_params.get('facility_type')
        if status_param:
            queryset = queryset.filter(status=status_param)
        if facility_type:
            queryset = queryset.filter(facility_type=facility_type)
        return queryset
