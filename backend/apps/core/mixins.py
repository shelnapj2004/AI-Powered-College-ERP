"""
Reusable ViewSet mixins for teacher-scoped and student-scoped access control.

Several apps (timetable, attendance, assignments, examinations,
study_materials, scholarships, finance, leave_management) expose academic/
personal data that a Teacher or Student must only see/manage for their OWN
academic assignments (Teacher Phase 4) or OWN records (Student Phase 1).
Admin keeps full access. Any other authenticated role is left untouched by
these mixins -- they only narrow behaviour for the matching role.
"""
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import UserRole


class TeacherScopedQuerysetMixin:
    """
    Restricts list/retrieve querysets to rows belonging to the logged-in
    Teacher. Admins/superusers are unrestricted. Non-teacher, non-admin
    roles fall through unchanged (existing permission_classes on the view
    still gate them, e.g. ReadOnly).

    `teacher_lookup` is the ORM filter path from this model to
    teachers.Teacher, e.g. 'teacher' or 'assignment__teacher'.
    """

    teacher_lookup: str = 'teacher'

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user or not user.is_authenticated:
            return queryset.none()

        if user.is_superuser or user.role == UserRole.ADMIN:
            return queryset

        if user.role == UserRole.TEACHER:
            teacher = getattr(user, 'teacher', None)
            if teacher is None:
                return queryset.none()
            return queryset.filter(**{self.teacher_lookup: teacher})

        return queryset


class StudentScopedQuerysetMixin:
    """
    Restricts list/retrieve querysets to rows belonging to the logged-in
    Student (Student Phase 1). Admins/superusers are unrestricted. Non-
    student, non-admin roles (teacher/staff/hod) fall through unchanged --
    existing permission_classes on the view still gate them.

    By default, `student_lookup` is the ORM filter path from this model to
    students.Student, e.g. 'student' or 'assignment__student' -- used for
    models with a direct/indirect FK to Student (AttendanceRecord,
    AssignmentSubmission, InternalMark, SemesterResult, FeePayment,
    ScholarshipApplication, LeaveRequest).

    For models with NO FK to Student at all (Timetable, Examination,
    AttendanceSession, Assignment, StudyMaterial), where a Student's access
    is instead defined by matching course + semester, override
    `get_student_filter_kwargs` to return the appropriate lookup.
    """

    student_lookup: str = 'student'

    def get_student_filter_kwargs(self, student):
        return {self.student_lookup: student}

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user or not user.is_authenticated:
            return queryset.none()

        if user.is_superuser or user.role == UserRole.ADMIN:
            return queryset

        if user.role == UserRole.STUDENT:
            student = getattr(user, 'student', None)
            if student is None:
                return queryset.none()
            return queryset.filter(**self.get_student_filter_kwargs(student)).distinct()

        return queryset


class HODScopedQuerysetMixin:
    """
    Restricts list/retrieve querysets to rows belonging to the logged-in
    HOD's OWN department (HOD Phase 2). Admins/superusers are unrestricted.
    Non-HOD roles fall through unchanged -- existing permission_classes /
    other scoped mixins on the view still gate them.

    An HOD with no linked HOD profile (or an inactive one) sees nothing --
    frontend hiding alone is never sufficient security.

    `hod_department_lookup` is the ORM filter path from this model to
    departments.Department, e.g. 'department' or 'course__department'.
    """

    hod_department_lookup: str = 'department'

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user or not user.is_authenticated:
            return queryset.none()

        if user.is_superuser or user.role == UserRole.ADMIN:
            return queryset

        if user.role == UserRole.HOD:
            hod = getattr(user, 'hod_profile', None)
            if hod is None or not hod.is_active:
                return queryset.none()
            return queryset.filter(**{self.hod_department_lookup: hod.department_id})

        return queryset


class HODDepartmentWriteMixin:
    """
    For endpoints where an HOD creates/updates academic rows (Course,
    Subject, TeacherSubjectAssignment, Timetable) that must stay within
    their OWN department (HOD Phase 8). Call `self.assert_department_allowed(x)`
    from perform_create/perform_update with the department id the
    write is targeting -- rejects it if it does not match the logged-in
    HOD's own department. Admins/superusers are exempt. Non-HOD roles are
    left untouched (existing permission_classes still gate them).

    Read-side isolation (list/retrieve/update/delete of objects belonging
    to another department) is already handled by HODScopedQuerysetMixin's
    queryset filtering -- an HOD simply gets a 404 for another
    department's row. This mixin only guards the WRITE payload (the
    department/course/teacher id a client can supply in a POST/PATCH body),
    which queryset filtering cannot catch.
    """

    def get_request_hod(self):
        user = self.request.user
        if user.is_superuser or user.role == UserRole.ADMIN:
            return None
        if user.role == UserRole.HOD:
            hod = getattr(user, 'hod_profile', None)
            if hod is None or not hod.is_active:
                raise PermissionDenied('No active HOD profile linked to this account.')
            return hod
        return None

    def assert_department_allowed(self, department_id, field_name='department'):
        hod = self.get_request_hod()
        if hod is not None and (department_id is None or str(department_id) != str(hod.department_id)):
            raise PermissionDenied(f'You may only manage {field_name} data for your own department.')


class TeacherOwnedWriteMixin:
    """
    For endpoints where a Teacher creates/updates rows that must stay
    within their own academic assignment. Call `self.get_request_teacher()`
    from perform_create/perform_update and use `self.assert_owns_teacher(x)`
    to guard against a Teacher spoofing another teacher's id in the payload.
    Admins are exempt from ownership checks.
    """

    def get_request_teacher(self):
        user = self.request.user
        if user.is_superuser or user.role == UserRole.ADMIN:
            return None
        teacher = getattr(user, 'teacher', None)
        if user.role == UserRole.TEACHER and teacher is None:
            raise PermissionDenied('No teacher profile linked to this account.')
        return teacher

    def assert_owns_teacher(self, teacher_on_object):
        request_teacher = self.get_request_teacher()
        if request_teacher is not None and teacher_on_object != request_teacher:
            raise PermissionDenied("You may only manage your own academic assignments.")


class StudentOwnedWriteMixin:
    """
    For endpoints where a Student creates/updates rows that must stay their
    own (ScholarshipApplication, LeaveRequest). Call
    `self.get_request_student()` from perform_create/perform_update and use
    `self.assert_owns_student(x)` to guard against a Student spoofing
    another student's id in the payload. Admins are exempt.
    """

    def get_request_student(self):
        user = self.request.user
        if user.is_superuser or user.role == UserRole.ADMIN:
            return None
        student = getattr(user, 'student', None)
        if user.role == UserRole.STUDENT and student is None:
            raise PermissionDenied('No student profile linked to this account.')
        return student

    def assert_owns_student(self, student_on_object):
        request_student = self.get_request_student()
        if request_student is not None and student_on_object != request_student:
            raise PermissionDenied("You may only manage your own records.")
