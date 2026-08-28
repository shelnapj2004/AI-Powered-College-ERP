"""
Backend-controlled Student ID generation.

Format (fixed, per business requirement):

    EDU21MCA-I006

    EDU  = first 3 letters of settings.COLLEGE_NAME, uppercased
    21   = last 2 digits of the joining/admission year
    MCA  = department code, uppercased
    -I   = literal "Integrated" identifier prefix
    006  = roll number, zero-padded to 3 digits

The frontend NEVER generates this ID — it only displays whatever the
backend returns. Uniqueness is enforced against accounts.User.student_id
(the single source of truth for "is this Student ID already issued?").
"""
from django.conf import settings
from django.core.exceptions import ValidationError


def _college_code() -> str:
    name = (getattr(settings, "COLLEGE_NAME", "") or "EDU").strip()
    code = "".join(ch for ch in name if ch.isalpha())[:3].upper()
    return code or "EDU"


def build_student_id(department_code: str, joining_year: int, roll_number: str | int) -> str:
    """Pure formatting helper — does not touch the database."""
    if not department_code:
        raise ValidationError("Department code is required to generate a Student ID.")
    if not joining_year:
        raise ValidationError("Joining year is required to generate a Student ID.")

    try:
        roll_int = int(str(roll_number).strip())
    except (TypeError, ValueError):
        raise ValidationError("Roll number must be numeric to generate a Student ID.")
    if roll_int <= 0:
        raise ValidationError("Roll number must be a positive number.")

    year_suffix = str(int(joining_year))[-2:].zfill(2)
    dept_code = "".join(ch for ch in str(department_code) if ch.isalnum()).upper()
    roll_padded = str(roll_int).zfill(3)

    return f"{_college_code()}{year_suffix}{dept_code}-I{roll_padded}"


def generate_unique_student_id(department_code: str, joining_year: int, roll_number: str | int) -> str:
    """
    Generate the canonical Student ID and guarantee it is not already in use.

    Raises ValidationError (not a bare exception) on collision so callers
    (DRF serializers/views) can surface a clean 400 response instead of a 500.
    """
    from apps.accounts.models import User  # local import avoids app-loading order issues

    candidate = build_student_id(department_code, joining_year, roll_number)
    if User.objects.filter(student_id=candidate).exists():
        raise ValidationError(
            f"Student ID '{candidate}' already exists. Check the roll number/department/joining "
            f"year for duplicates before creating this account."
        )
    return candidate
