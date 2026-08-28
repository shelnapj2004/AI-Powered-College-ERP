"""
Permissions for the Admissions (registration) API.

Business rule: Admin submits/creates registrations (the "Student Registration
Form" step). Staff reviews and processes them (approve/reject, and later
converts an approved registration into a login account via the Students API).
Staff must NOT be able to create or delete registrations directly -- that
would bypass the Admin-side registration step the business workflow requires.
"""
from apps.core.permissions import IsAdmin, IsStaff  # noqa: F401 (re-exported for views.py)
