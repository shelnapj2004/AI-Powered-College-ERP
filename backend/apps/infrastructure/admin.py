from django.contrib import admin
from .models import Facility


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ['name', 'facility_type', 'capacity', 'status', 'created_at']
    search_fields = ['name', 'facility_type']
    list_filter = ['status', 'facility_type']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']
