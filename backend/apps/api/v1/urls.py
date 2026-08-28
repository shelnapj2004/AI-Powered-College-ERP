"""
Version 1 API routes.

Business-domain apps will register their URL patterns here as they are built.
"""
from django.urls import include, path

app_name = "v1"

urlpatterns = [
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.core.urls")),
    # NOTE: was previously path("departments/", include(...)) while
    # apps.departments.urls ALSO registers a 'departments' router basename --
    # that double-nested the real endpoint at /api/v1/departments/departments/
    # and left /api/v1/departments/ resolving to the (paginationless) DRF
    # router root instead of the department list. lookupApi.getDepartments()
    # and departmentApi in the frontend have always called /departments/
    # directly, matching every sibling app below (courses, students, ...),
    # so this prefix is fixed to "" to match that existing contract.
    path("", include("apps.departments.urls")),
    path("", include("apps.courses.urls")),
    path("", include("apps.students.urls")),
    path("", include("apps.academic_year.urls")),
    path("", include("apps.semester.urls")),
    path("", include("apps.subjects.urls")),
    path("", include("apps.teachers.urls")),
    path("", include("apps.hod.urls")),
    path("", include("apps.staff.urls")),
    path("", include("apps.admissions.urls")),
    path("", include("apps.timetable.urls")),
    path("", include("apps.study_materials.urls")),
    path("", include("apps.question_bank.urls")),
    # apps.events was INSTALLED but never wired into the v1 router -- the
    # Event model/serializer/viewset already exist and are student-readable
    # (IsAdmin | ReadOnly), so Student Calendar can consume it directly.
    path("", include("apps.events.urls")),
    path("", include("apps.attendance.urls")),
    path("", include("apps.examinations.urls")),
    path("", include("apps.assignments.urls")),
    path("", include("apps.scholarships.urls")),
    path("", include("apps.finance.urls")),
    path("", include("apps.leave_management.urls")),
    path("", include("apps.placements.urls")),
    path("", include("apps.research.urls")),
    path("", include("apps.cms.urls")),
    path("", include("apps.adminpanel.urls")),
    path("", include("apps.infrastructure.urls")),
    # apps.notifications was INSTALLED with a model but no serializer/
    # views/urls wired -- added (Priority 3) so Staff Notifications can
    # send real, database-backed notifications instead of local state.
    path("", include("apps.notifications.urls")),
    # apps.feedback: new minimal app (Priority 4) -- no suitable existing
    # Teacher/Student feedback model was found in the codebase, so this
    # small dedicated app backs the previously-mock Teacher Feedback page.
    path("", include("apps.feedback.urls")),
    # apps.documents: new minimal app (Priority 5) -- no suitable existing
    # Document model was found in the codebase, so this small dedicated app
    # backs the previously-mock Staff Documents page.
    path("", include("apps.documents.urls")),
    # apps.certificates: new minimal app (Priority 11) -- no suitable
    # existing certificate-issuance model was found in the codebase
    # (apps.documents.StudentDocument is verification, not issuance), so
    # this small dedicated app backs the previously-mock Staff Certificate
    # Management page.
    path("", include("apps.certificates.urls")),
    # apps.contact: new minimal app (Priority 14) -- no suitable existing
    # Contact/Inquiry model was found in the codebase, so this small
    # dedicated app backs the public /contact form and the new Staff
    # Contact Messages page.
    path("", include("apps.contact.urls")),
]
