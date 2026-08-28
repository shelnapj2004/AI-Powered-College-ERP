from django.contrib import admin
from .models import ResearchProject, ResearchMember


@admin.register(ResearchProject)
class ResearchProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'principal_investigator', 'department', 'status', 'start_date', 'end_date', 'is_active', 'created_at']
    search_fields = ['title', 'description', 'funding_agency', 'principal_investigator__user__first_name', 'principal_investigator__user__last_name']
    list_filter = ['department', 'status', 'is_active']
    ordering = ['-start_date', 'title']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['principal_investigator', 'department']


@admin.register(ResearchMember)
class ResearchMemberAdmin(admin.ModelAdmin):
    list_display = ['research_project', 'teacher', 'role', 'joined_at', 'created_at']
    search_fields = ['teacher__user__first_name', 'teacher__user__last_name', 'research_project__title']
    list_filter = ['role', 'research_project']
    ordering = ['-joined_at']
    readonly_fields = ['joined_at', 'created_at', 'updated_at']
    autocomplete_fields = ['research_project', 'teacher']

