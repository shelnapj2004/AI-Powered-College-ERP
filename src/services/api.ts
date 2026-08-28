/**
 * Thin API client for the Django REST backend.
 *
 * Handles JWT auth (login/refresh/logout via the existing
 * apps.accounts endpoints) and typed CRUD methods for Students,
 * plus read-only lookups for Departments/Courses/Semesters used
 * to populate dropdowns.
 *
 * All list endpoints are wrapped by StandardResultsPagination on the
 * backend and return { success, count, next, previous, results, ... }.
 * All errors are wrapped by apps.core.exceptions.custom_exception_handler
 * and return { success: false, error: { code, message, details } }.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/v1'

const ACCESS_TOKEN_KEY = 'erp_access_token'
const REFRESH_TOKEN_KEY = 'erp_refresh_token'
const USER_KEY = 'erp_user'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiUser {
  id: number
  username: string
  email: string | null
  first_name: string
  last_name: string
  role: 'student' | 'teacher' | 'staff' | 'hod' | 'admin'
  role_display: string
  display_id: string
  phone?: string
  student_id?: string | null
  employee_id?: string | null
  department?: string
  profile_picture?: string | null
  is_verified?: boolean
  date_joined?: string
}

export interface ApiDepartment {
  id: string
  name: string
  code: string
  description?: string | null
  is_active: boolean
  hod_name?: string | null
  faculty_count?: number
  student_count?: number
  created_at: string
  updated_at: string
}

export interface DepartmentCreatePayload {
  name: string
  code: string
  description?: string
  is_active?: boolean
}

export type DepartmentUpdatePayload = Partial<DepartmentCreatePayload>

export interface ApiCourse {
  id: string
  department: string
  department_detail?: ApiDepartment
  name: string
  code: string
  degree: string
  duration_years: number
  total_semesters: number
  semester_count?: number
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CourseCreatePayload {
  department: string
  name: string
  code: string
  degree: string
  duration_years: number
  total_semesters: number
  description?: string
  is_active?: boolean
}

export type CourseUpdatePayload = Partial<CourseCreatePayload>

export interface ApiSemester {
  id: string
  academic_year: string
  academic_year_detail?: ApiAcademicYear
  course: string
  course_detail?: ApiCourse
  semester_number: number
  name?: string | null
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SemesterCreatePayload {
  academic_year: string
  course: string
  semester_number: number
  name?: string
  start_date: string
  end_date: string
  is_active?: boolean
}

export type SemesterUpdatePayload = Partial<SemesterCreatePayload>

export interface ApiStudentUser {
  id: number
  username: string
  email: string | null
  first_name: string
  last_name: string
  role: string
}

export interface ApiStudent {
  id: string
  user: ApiStudentUser
  student_id: string | null
  department: string
  department_detail: ApiDepartment
  course: string
  course_detail: ApiCourse
  semester: string
  semester_detail: ApiSemester
  admission_number: string
  roll_number: string
  registration_number: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other'
  phone: string
  email: string
  guardian_name: string
  guardian_phone: string
  address: string
  admission_date: string
  current_semester: number
  profile_photo?: string | null
  is_active: boolean
  approval_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

// Direct Student creation is no longer supported by the backend -- accounts
// are created from a reviewed Admission via studentApi.createAccount(). This
// type is kept only for the (non-create) partial-update payload shape.
export type StudentUpdatePayload = Partial<{
  department: string
  course: string
  semester: string
  admission_number: string
  roll_number: string
  registration_number: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other'
  phone: string
  email: string
  guardian_name: string
  guardian_phone: string
  address: string
  admission_date: string
  current_semester: number
  is_active: boolean
}>

// Two supported flows (Priority 14):
//  - Flow A (admission-backed): supply `admission`; optionally override any
//    field the registration is missing (date_of_birth/guardian_name/etc.).
//  - Flow B (staff-direct, no admission): omit `admission`; supply the
//    direct fields instead. Resulting Student starts `approval_status:
//    'pending'` and cannot log in until Admin approves.
export interface StudentAccountCreatePayload {
  admission?: string
  semester: string
  password: string
  roll_number?: string
  registration_number?: string
  current_semester?: number
  // Flow B (and Flow A override) fields
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  date_of_birth?: string
  gender?: 'male' | 'female' | 'other'
  guardian_name?: string
  guardian_phone?: string
  address?: string
  department?: string
  course?: string
  admission_date?: string
}

// ---------------------------------------------------------------------------
// Admission (registration) types
// ---------------------------------------------------------------------------

export interface ApiAcademicYear {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface AcademicYearCreatePayload {
  name: string
  start_date: string
  end_date: string
  is_current?: boolean
  is_active?: boolean
}

export type AcademicYearUpdatePayload = Partial<AcademicYearCreatePayload>

export interface ApiAdmission {
  id: string
  application_number: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other'
  guardian_name: string
  guardian_phone: string
  address: string
  roll_number: string
  department: string
  department_detail: ApiDepartment
  course: string
  course_detail: ApiCourse
  academic_year: string
  academic_year_detail: ApiAcademicYear
  admission_date: string
  admission_type: 'regular' | 'lateral' | 'management'
  admission_status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  previous_school: string
  previous_percentage: number
  entrance_exam_score?: number | null
  remarks?: string | null
  student: string | null
  account_created: boolean
  created_at: string
  updated_at: string
}

export type AdmissionCreatePayload = Omit<
  ApiAdmission,
  'id' | 'full_name' | 'department_detail' | 'course_detail' | 'academic_year_detail' | 'student' | 'account_created' | 'created_at' | 'updated_at'
>
export type AdmissionUpdatePayload = Partial<AdmissionCreatePayload>

// ---------------------------------------------------------------------------
// Teacher types
// ---------------------------------------------------------------------------

export interface ApiTeacher {
  id: string
  user: ApiStudentUser & { is_active: boolean }
  department: string
  employee_id: string
  designation: string
  qualification: string
  specialization: string
  experience_years: number
  phone: string
  email: string
  address: string
  joining_date: string
  profile_photo?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeacherCreatePayload {
  user_details: { first_name: string; last_name: string; password: string }
  department: string
  employee_id: string
  designation: string
  qualification: string
  specialization: string
  experience_years: number
  phone: string
  email: string
  address: string
  joining_date: string
}

export type TeacherUpdatePayload = Partial<Omit<TeacherCreatePayload, 'user_details'>> & {
  user_details?: { first_name: string; last_name: string }
}

// ---------------------------------------------------------------------------
// HOD types
// ---------------------------------------------------------------------------

export interface ApiHOD {
  id: string
  user: number
  teacher: string
  teacher_detail: { id: string; user: ApiStudentUser; employee_id: string; designation: string; department: string }
  department: string
  department_detail: ApiDepartment
  office_phone: string
  office_location: string
  appointment_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HODCreatePayload {
  teacher: string
  department: string
  office_phone: string
  office_location: string
  appointment_date: string
}

export type HODUpdatePayload = Partial<Omit<HODCreatePayload, 'teacher'>>

export interface ApiHODAnalytics {
  department: string
  faculty_count: number
  student_count: number
  course_count: number
  subject_count: number
  attendance: { total_records: number; present_records: number; avg_attendance_pct: number | null }
  results: { result_count: number; avg_sgpa: number | null; avg_cgpa: number | null }
  research: { total_projects: number; ongoing_projects: number }
  placements: { total_applications: number; selected: number; placement_rate_pct: number | null }
}

export interface PaginatedResponse<T> {
  success: boolean
  count: number
  next: string | null
  previous: string | null
  page: number
  page_size: number
  total_pages: number
  results: T[]
}

export interface StudentQueryParams {
  search?: string
  department?: string
  course?: string
  semester?: string
  current_semester?: number
  is_active?: boolean
  approval_status?: 'pending' | 'approved' | 'rejected'
  page?: number
  page_size?: number
  ordering?: string
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },
  getUser(): ApiUser | null {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as ApiUser
    } catch {
      return null
    }
  },
  setSession(access: string, refresh: string, user: ApiUser) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  setAccessToken(access: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
  },
  setRefreshToken(refresh: string) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

// ---------------------------------------------------------------------------
// Core request wrapper (attaches auth header, retries once after refresh)
// ---------------------------------------------------------------------------

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefreshToken()
  if (!refresh) return null

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async res => {
        if (!res.ok) return null
        const data = await res.json()
        if (data.access) {
          tokenStorage.setAccessToken(data.access)
          // Backend has ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION enabled:
          // every refresh call blacklists the old refresh token and issues a new
          // one, which MUST be persisted or the next refresh attempt will fail.
          if (data.refresh) tokenStorage.setRefreshToken(data.refresh)
          return data.access as string
        }
        return null
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown | FormData
  params?: Record<string, string | number | boolean | undefined>
  skipAuth?: boolean
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, params, skipAuth = false } = options
  const url = buildUrl(path, params)

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' }
  if (!skipAuth) {
    const token = tokenStorage.getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      // FormData (file uploads) must be sent as-is so the browser sets the
      // multipart boundary itself; everything else stays JSON as before.
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Network error — could not reach the server. Check your connection or that the backend is running.')
  }

  // Access token expired — try a single refresh-and-retry.
  if (res.status === 401 && !skipAuth && !isRetry && tokenStorage.getRefreshToken()) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      return request<T>(path, options, true)
    }
    tokenStorage.clear()
    throw new ApiError(401, 'Your session has expired. Please log in again.', 'session_expired')
  }

  if (res.status === 204) {
    return undefined as T
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const errObj = (data as { error?: { message?: string; code?: string; details?: unknown } } | null)?.error
    const message = errObj?.message || (res.status === 403 ? 'You do not have permission to perform this action.' : `Request failed (${res.status})`)
    throw new ApiError(res.status, message, errObj?.code, errObj?.details)
  }

  return data as T
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authApi = {
  async login(username: string, password: string): Promise<ApiUser> {
    const data = await request<{ access: string; refresh: string; user: ApiUser; success: boolean }>(
      '/auth/login/',
      { method: 'POST', body: { username, password }, skipAuth: true }
    )
    tokenStorage.setSession(data.access, data.refresh, data.user)
    return data.user
  },

  async logout(): Promise<void> {
    const refresh = tokenStorage.getRefreshToken()
    if (refresh) {
      try {
        await request('/auth/logout/', { method: 'POST', body: { refresh } })
      } catch {
        // best-effort — clear local session regardless
      }
    }
    tokenStorage.clear()
  },

  async getCurrentUser(): Promise<ApiUser> {
    const data = await request<{ success: boolean; user: ApiUser }>('/auth/me/')
    return data.user
  },

  isAuthenticated(): boolean {
    return !!tokenStorage.getAccessToken()
  },
}

// ---------------------------------------------------------------------------
// Student API
// ---------------------------------------------------------------------------

export const studentApi = {
  async getStudents(params: StudentQueryParams = {}): Promise<PaginatedResponse<ApiStudent>> {
    return request<PaginatedResponse<ApiStudent>>('/students/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getStudent(id: string): Promise<ApiStudent> {
    return request<ApiStudent>(`/students/${id}/`)
  },

  /**
   * The real account-creation workflow: STAFF reviews a registered Admission
   * and creates the login account from it. The backend generates the
   * Student ID (EDU21MCA-I006 format) -- it is never sent from here.
   */
  async createAccount(payload: StudentAccountCreatePayload): Promise<ApiStudent> {
    return request<ApiStudent>('/students/create-account/', { method: 'POST', body: payload })
  },

  /** ADMIN only. Approves a pending Staff-direct-created Student: approval_status -> approved, account re-activated. */
  async approveStudent(id: string): Promise<ApiStudent> {
    return request<ApiStudent>(`/students/${id}/approve/`, { method: 'POST' })
  },

  /** ADMIN only. Rejects a pending Staff-direct-created Student: approval_status -> rejected, account stays inactive. */
  async rejectStudent(id: string): Promise<ApiStudent> {
    return request<ApiStudent>(`/students/${id}/reject/`, { method: 'POST' })
  },

  async updateStudent(id: string, payload: StudentUpdatePayload): Promise<ApiStudent> {
    return request<ApiStudent>(`/students/${id}/`, { method: 'PATCH', body: payload })
  },

  async setPassword(id: string, password: string): Promise<void> {
    return request<void>(`/students/${id}/set-password/`, { method: 'POST', body: { password } })
  },

  async deleteStudent(id: string): Promise<void> {
    return request<void>(`/students/${id}/`, { method: 'DELETE' })
  },

  /**
   * Students derived from the logged-in Teacher's OWN timetable
   * (Teacher -> Timetable -> Semester -> Students) — never the full
   * college roster. Backend-enforced; no client-side teacher filter exists.
   */
  async getMyStudents(params: StudentQueryParams = {}): Promise<PaginatedResponse<ApiStudent>> {
    return request<PaginatedResponse<ApiStudent>>('/students/my-students/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /** The logged-in Student's OWN profile, derived server-side from the auth token — never a client-supplied id. */
  async getMe(): Promise<ApiStudent> {
    return request<ApiStudent>('/students/me/')
  },
}

// ---------------------------------------------------------------------------
// Admission (registration) API
// ---------------------------------------------------------------------------

export const admissionApi = {
  async getAdmissions(params: {
    search?: string
    department?: string
    admission_status?: string
    account_created?: boolean
    page?: number
    page_size?: number
    ordering?: string
  } = {}): Promise<PaginatedResponse<ApiAdmission>> {
    return request<PaginatedResponse<ApiAdmission>>('/admissions/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getAdmission(id: string): Promise<ApiAdmission> {
    return request<ApiAdmission>(`/admissions/${id}/`)
  },

  /** Admin-only: the "Student Registration Form" step. */
  async createAdmission(payload: AdmissionCreatePayload): Promise<ApiAdmission> {
    return request<ApiAdmission>('/admissions/', { method: 'POST', body: payload })
  },

  /**
   * Public visitor submitting the /admissions registration form -- no
   * login required (backend permission: AllowAny on create). Only the
   * fields the public form actually collects are sent; the backend fills
   * in application_number, academic_year, admission_date, admission_type
   * and the other Admin-only fields with sensible defaults server-side.
   */
  async submitPublicApplication(payload: { first_name: string; last_name?: string; email: string; phone: string; address?: string; department: string; course: string }): Promise<ApiAdmission> {
    return request<ApiAdmission>('/admissions/', { method: 'POST', body: payload })
  },

  /** Staff or Admin: review/edit/approve/reject a registration. */
  async updateAdmission(id: string, payload: AdmissionUpdatePayload): Promise<ApiAdmission> {
    return request<ApiAdmission>(`/admissions/${id}/`, { method: 'PATCH', body: payload })
  },

  async deleteAdmission(id: string): Promise<void> {
    return request<void>(`/admissions/${id}/`, { method: 'DELETE' })
  },
}

// ---------------------------------------------------------------------------
// Teacher API
// ---------------------------------------------------------------------------

export const teacherApi = {
  async getTeachers(params: {
    search?: string
    department?: string
    designation?: string
    is_active?: boolean
    page?: number
    page_size?: number
    ordering?: string
  } = {}): Promise<PaginatedResponse<ApiTeacher>> {
    return request<PaginatedResponse<ApiTeacher>>('/teachers/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getTeacher(id: string): Promise<ApiTeacher> {
    return request<ApiTeacher>(`/teachers/${id}/`)
  },

  async createTeacher(payload: TeacherCreatePayload): Promise<ApiTeacher> {
    return request<ApiTeacher>('/teachers/', { method: 'POST', body: payload })
  },

  async updateTeacher(id: string, payload: TeacherUpdatePayload): Promise<ApiTeacher> {
    return request<ApiTeacher>(`/teachers/${id}/`, { method: 'PATCH', body: payload })
  },

  async setPassword(id: string, password: string): Promise<void> {
    return request<void>(`/teachers/${id}/set-password/`, { method: 'POST', body: { password } })
  },

  async deleteTeacher(id: string): Promise<void> {
    return request<void>(`/teachers/${id}/`, { method: 'DELETE' })
  },

  /** The logged-in Teacher's OWN profile, derived server-side from the auth token — never a client-supplied id. */
  async getMe(): Promise<ApiTeacher> {
    return request<ApiTeacher>('/teachers/me/')
  },
}

// ---------------------------------------------------------------------------
// Teacher academic data: Timetable / Attendance / Assignments / Examinations
//
// The backend scopes all of these to the logged-in Teacher automatically
// (see apps.core.mixins.TeacherScopedQuerysetMixin) — a teacher account
// only ever receives their OWN classes, sessions, assignments and marks,
// so no client-side "teacher=" filtering is required or trustworthy here.
// ---------------------------------------------------------------------------

export interface ApiTimetableSlot {
  id: string
  department: string
  course: string
  semester: string
  subject: string
  teacher: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  period_number: number
  room_number: string
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiAttendanceSession {
  id: string
  timetable: string
  attendance_date: string
  topic_covered?: string | null
  remarks?: string | null
  created_at: string
  updated_at: string
}

export interface ApiAttendanceRecord {
  id: string
  attendance_session: string
  student: string
  status: 'present' | 'absent' | 'late' | 'leave'
  remarks?: string | null
  created_at: string
  updated_at: string
}

export interface ApiAssignment {
  id: string
  subject: string
  semester: string
  teacher: string
  title: string
  description: string
  assigned_date: string
  due_date: string
  maximum_marks: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiAssignmentSubmission {
  id: string
  assignment: string
  student: string
  submission_file?: string | null
  submitted_at?: string | null
  obtained_marks?: string | null
  feedback?: string | null
  status: 'submitted' | 'late' | 'not_submitted'
  created_at: string
  updated_at: string
}

export interface ApiExamination {
  id: string
  subject: string
  semester: string
  teacher: string
  exam_type: 'internal_1' | 'internal_2' | 'model' | 'practical' | 'viva' | 'semester'
  title: string
  exam_date: string
  maximum_marks: string
  passing_marks: string
  instructions?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiInternalMark {
  id: string
  examination: string
  student: string
  marks_obtained: string
  remarks?: string | null
  created_at: string
  updated_at: string
}

export interface ApiSubject {
  id: string
  course: string
  semester: string
  code: string
  name: string
  credits: number
  subject_type: 'theory' | 'lab'
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SubjectCreatePayload {
  course: string
  semester: string
  code: string
  name: string
  credits: number
  subject_type: 'theory' | 'lab'
  description?: string
  is_active?: boolean
}

export type SubjectUpdatePayload = Partial<SubjectCreatePayload>

export interface ApiTeacherSubjectAssignment {
  id: string
  teacher: string
  teacher_detail?: ApiTeacher
  subject: string
  subject_detail?: ApiSubject
  is_active: boolean
  assigned_at: string
  updated_at: string
}

export interface ApiStudyMaterial {
  id: string
  subject: string
  semester: string
  teacher: string
  title: string
  description?: string | null
  material_type: 'notes' | 'pdf' | 'ppt' | 'video' | 'link' | 'other'
  file?: string | null
  external_url?: string | null
  uploaded_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiEvent {
  id: string
  title: string
  description: string
  event_type: 'seminar' | 'workshop' | 'conference' | 'cultural' | 'sports' | 'placement' | 'other'
  venue: string
  event_date: string
  start_time: string
  end_time: string
  organizer: string
  registration_required: boolean
  registration_deadline?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ApiQuestionType = 'MCQ' | 'Short Answer' | 'Descriptive'

export interface ApiQuestion {
  id: string
  subject: string
  teacher: string
  topic?: string | null
  question_text: string
  question_type: ApiQuestionType
  options: string[]
  // Omitted entirely by the backend for the Student role (never sent over
  // the wire for a read-only practice/assessment bank) -- optional here so
  // the Student Question Bank page doesn't need a fake placeholder value.
  correct_answer?: string
  marks: number
  created_at: string
  updated_at: string
}

export interface ApiSemesterResult {
  id: string
  student: string
  semester: string
  sgpa?: string | null
  cgpa?: string | null
  total_credits_earned?: number | null
  result_status: string
  published_date?: string | null
  remarks?: string | null
  created_at: string
  updated_at: string
}

export interface ApiSemesterResultSubject {
  id: string
  semester_result: string
  subject: string
  total_marks?: string | null
  grade?: string | null
  grade_point?: string | null
  credits_earned?: string | null
  created_at: string
}

export interface ApiFeeStructure {
  id: string
  fee_type: 'tuition' | 'exam' | 'event'
  fee_type_display: string
  course: string
  academic_year: string
  semester_number: number
  tuition_fee: string
  exam_fee: string
  library_fee: string
  other_fee: string
  total_fee: string
  is_active: boolean
}

export interface ApiFeePayment {
  id: string
  student: string
  student_name?: string
  fee_structure: string
  fee_type?: 'tuition' | 'exam' | 'event'
  fee_type_display?: string
  amount_due?: string
  amount_paid: string
  payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer'
  payment_status: 'pending' | 'partial' | 'paid'
  transaction_reference?: string | null
  payment_date: string
  remarks?: string | null
  created_at: string
  updated_at: string
}

export interface ApiScholarship {
  id: string
  name: string
  scholarship_type: string
  provider: string
  description?: string | null
  eligibility_criteria?: string | null
  amount: string
  application_deadline?: string | null
  is_active: boolean
}

export interface ApiScholarshipApplication {
  id: string
  scholarship: string
  scholarship_name?: string
  student: string
  student_name?: string
  status: 'pending' | 'approved' | 'rejected' | string
  applied_at: string
  remarks?: string | null
}

export type ApiNotificationType = 'general' | 'academic' | 'exam' | 'event' | 'placement' | 'scholarship' | 'finance'
export type ApiTargetAudience = 'all' | 'students' | 'teachers' | 'staff' | 'hods'

export interface ApiNotification {
  id: string
  title: string
  message: string
  notification_type: ApiNotificationType
  target_audience: ApiTargetAudience
  created_by?: number | null
  created_by_name?: string
  is_active: boolean
  published_at: string
  expires_at?: string | null
  created_at: string
  updated_at: string
}

export interface ApiLeaveRequest {
  id: string
  applicant_type: 'student' | 'teacher' | 'staff'
  student?: string | null
  student_name?: string | null
  student_admission_number?: string | null
  teacher?: string | null
  teacher_name?: string | null
  staff?: string | null
  staff_name?: string | null
  start_date: string
  end_date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_by?: number | null
  approved_by_name?: string | null
  approved_at?: string | null
  remarks?: string | null
  created_at: string
  updated_at: string
}

export interface ApiTeacherFeedback {
  id: string
  teacher: string
  teacher_name?: string | null
  student: string
  student_name?: string | null
  rating: number
  comment: string
  created_at: string
  updated_at: string
}

export interface TimetableCreatePayload {
  department: string
  course: string
  semester: string
  subject: string
  teacher: string
  day_of_week: ApiTimetableSlot['day_of_week']
  period_number: number
  room_number: string
  start_time: string
  end_time: string
  is_active?: boolean
}

export type TimetableUpdatePayload = Partial<TimetableCreatePayload>

export const timetableApi = {
  /** For a Teacher, this is already scoped server-side to their own slots. */
  async getTimetables(params: {
    department?: string
    course?: string
    semester?: string
    subject?: string
    teacher?: string
    day_of_week?: string
    is_active?: boolean
    page?: number
    page_size?: number
    ordering?: string
  } = {}): Promise<PaginatedResponse<ApiTimetableSlot>> {
    return request<PaginatedResponse<ApiTimetableSlot>>('/timetables/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /** Admin/HOD only (enforced server-side: IsAdmin | IsHOD | ReadOnly, department-scoped for HOD; teacher-subject-assignment validated server-side too). */
  async createTimetable(payload: TimetableCreatePayload): Promise<ApiTimetableSlot> {
    return request<ApiTimetableSlot>('/timetables/', { method: 'POST', body: payload })
  },

  async updateTimetable(id: string, payload: TimetableUpdatePayload): Promise<ApiTimetableSlot> {
    return request<ApiTimetableSlot>(`/timetables/${id}/`, { method: 'PATCH', body: payload })
  },

  /** Timetable FK from AttendanceSession uses on_delete=PROTECT; backend returns 400 if referenced. */
  async deleteTimetable(id: string): Promise<void> {
    return request<void>(`/timetables/${id}/`, { method: 'DELETE' })
  },
}

export const attendanceApi = {
  async getSessions(params: { timetable?: string; attendance_date?: string; page_size?: number } = {}): Promise<PaginatedResponse<ApiAttendanceSession>> {
    return request<PaginatedResponse<ApiAttendanceSession>>('/attendance-sessions/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async createSession(payload: { timetable: string; attendance_date: string; topic_covered?: string; remarks?: string }): Promise<ApiAttendanceSession> {
    return request<ApiAttendanceSession>('/attendance-sessions/', { method: 'POST', body: payload })
  },

  async getRecords(params: { attendance_session?: string; student?: string; status?: string; page_size?: number } = {}): Promise<PaginatedResponse<ApiAttendanceRecord>> {
    return request<PaginatedResponse<ApiAttendanceRecord>>('/attendance-records/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async createRecord(payload: { attendance_session: string; student: string; status: ApiAttendanceRecord['status']; remarks?: string }): Promise<ApiAttendanceRecord> {
    return request<ApiAttendanceRecord>('/attendance-records/', { method: 'POST', body: payload })
  },

  async updateRecord(id: string, payload: Partial<{ status: ApiAttendanceRecord['status']; remarks: string }>): Promise<ApiAttendanceRecord> {
    return request<ApiAttendanceRecord>(`/attendance-records/${id}/`, { method: 'PATCH', body: payload })
  },
}

export const assignmentApi = {
  /** For a Teacher, already scoped server-side to assignments they own. */
  async getAssignments(params: { subject?: string; semester?: string; is_active?: boolean; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiAssignment>> {
    return request<PaginatedResponse<ApiAssignment>>('/assignments/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /** `teacher` is deliberately NOT accepted here — the backend forces it to the logged-in Teacher. */
  async createAssignment(payload: { subject: string; semester: string; title: string; description: string; assigned_date: string; due_date: string; maximum_marks: number }): Promise<ApiAssignment> {
    return request<ApiAssignment>('/assignments/', { method: 'POST', body: payload })
  },

  async updateAssignment(id: string, payload: Partial<{ title: string; description: string; due_date: string; maximum_marks: number; is_active: boolean }>): Promise<ApiAssignment> {
    return request<ApiAssignment>(`/assignments/${id}/`, { method: 'PATCH', body: payload })
  },

  async deleteAssignment(id: string): Promise<void> {
    return request<void>(`/assignments/${id}/`, { method: 'DELETE' })
  },

  async getSubmissions(params: { assignment?: string; student?: string; status?: string; page_size?: number } = {}): Promise<PaginatedResponse<ApiAssignmentSubmission>> {
    return request<PaginatedResponse<ApiAssignmentSubmission>>('/assignment-submissions/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /**
   * Student submitting an assignment — actually creates the
   * AssignmentSubmission row (POST), it does not merely read existing
   * submissions. `student`/`status`/`submitted_at` are never sent -- the
   * backend derives them from the authenticated Student and the current
   * time vs the assignment's due date. `file` is optional (the model
   * allows a submission with no file), but when the student picked one it
   * is uploaded as real multipart form data.
   */
  async createSubmission(assignmentId: string, file?: File | null): Promise<ApiAssignmentSubmission> {
    const form = new FormData()
    form.append('assignment', assignmentId)
    if (file) form.append('submission_file', file)
    return request<ApiAssignmentSubmission>('/assignment-submissions/', { method: 'POST', body: form })
  },

  /** Student resubmitting — replaces the file on their own existing submission row. */
  async resubmit(id: string, file: File): Promise<ApiAssignmentSubmission> {
    const form = new FormData()
    form.append('submission_file', file)
    return request<ApiAssignmentSubmission>(`/assignment-submissions/${id}/`, { method: 'PATCH', body: form })
  },

  /** Teacher grading a submission — only obtained_marks/feedback should be sent. */
  async gradeSubmission(id: string, payload: { obtained_marks: number; feedback?: string }): Promise<ApiAssignmentSubmission> {
    return request<ApiAssignmentSubmission>(`/assignment-submissions/${id}/`, { method: 'PATCH', body: payload })
  },
}

export const examinationApi = {
  async getExaminations(params: { subject?: string; semester?: string; exam_type?: string; is_active?: boolean; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiExamination>> {
    return request<PaginatedResponse<ApiExamination>>('/examinations/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async createExamination(payload: { subject: string; semester: string; exam_type: ApiExamination['exam_type']; title: string; exam_date: string; maximum_marks: number; passing_marks: number; instructions?: string }): Promise<ApiExamination> {
    return request<ApiExamination>('/examinations/', { method: 'POST', body: payload })
  },

  async getInternalMarks(params: { examination?: string; student?: string; page_size?: number } = {}): Promise<PaginatedResponse<ApiInternalMark>> {
    return request<PaginatedResponse<ApiInternalMark>>('/internal-marks/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async upsertInternalMark(payload: { examination: string; student: string; marks_obtained: number; remarks?: string }): Promise<ApiInternalMark> {
    return request<ApiInternalMark>('/internal-marks/', { method: 'POST', body: payload })
  },

  async updateInternalMark(id: string, payload: Partial<{ marks_obtained: number; remarks: string }>): Promise<ApiInternalMark> {
    return request<ApiInternalMark>(`/internal-marks/${id}/`, { method: 'PATCH', body: payload })
  },
}

export const studyMaterialApi = {
  /** For a Teacher, already scoped server-side to materials they own. */
  async getMaterials(params: { subject?: string; semester?: string; is_active?: boolean; page_size?: number } = {}): Promise<PaginatedResponse<ApiStudyMaterial>> {
    return request<PaginatedResponse<ApiStudyMaterial>>('/study-materials/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /**
   * `teacher` is deliberately NOT accepted here — the backend forces it to
   * the logged-in Teacher. Pass `file` to actually upload the attachment
   * (multipart/form-data); the model's `file` FileField stores it on disk
   * and returns a real URL, never a fake fileName/size pair.
   */
  async createMaterial(payload: { subject: string; semester: string; title: string; description?: string; material_type: ApiStudyMaterial['material_type']; external_url?: string; uploaded_at: string }, file?: File | null): Promise<ApiStudyMaterial> {
    const form = new FormData()
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null) form.append(key, String(value))
    }
    if (file) form.append('file', file)
    return request<ApiStudyMaterial>('/study-materials/', { method: 'POST', body: form })
  },

  async updateMaterial(id: string, payload: Partial<{ title: string; description: string; material_type: ApiStudyMaterial['material_type']; external_url: string; is_active: boolean }>, file?: File | null): Promise<ApiStudyMaterial> {
    if (!file) {
      return request<ApiStudyMaterial>(`/study-materials/${id}/`, { method: 'PATCH', body: payload })
    }
    const form = new FormData()
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null) form.append(key, String(value))
    }
    form.append('file', file)
    return request<ApiStudyMaterial>(`/study-materials/${id}/`, { method: 'PATCH', body: form })
  },

  async deleteMaterial(id: string): Promise<void> {
    return request<void>(`/study-materials/${id}/`, { method: 'DELETE' })
  },
}

export const eventApi = {
  /** Any authenticated user (incl. Student) can read; write is Admin/Staff-only. */
  async getEvents(params: { event_type?: string; is_active?: boolean; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiEvent>> {
    return request<PaginatedResponse<ApiEvent>>('/events/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  async createEvent(payload: {
    title: string; description: string; event_type: ApiEvent['event_type']; venue: string
    event_date: string; start_time: string; end_time: string; organizer: string
    registration_required?: boolean; registration_deadline?: string | null; is_active?: boolean
  }): Promise<ApiEvent> {
    return request<ApiEvent>('/events/', { method: 'POST', body: payload })
  },
  async updateEvent(id: string, payload: Partial<{
    title: string; description: string; event_type: ApiEvent['event_type']; venue: string
    event_date: string; start_time: string; end_time: string; organizer: string
    registration_required: boolean; registration_deadline: string | null; is_active: boolean
  }>): Promise<ApiEvent> {
    return request<ApiEvent>(`/events/${id}/`, { method: 'PATCH', body: payload })
  },
  async deleteEvent(id: string): Promise<void> {
    return request<void>(`/events/${id}/`, { method: 'DELETE' })
  },
}

export const questionBankApi = {
  /** Server-side scoped to questions the logged-in Teacher created. */
  async getQuestions(params: { subject?: string; question_type?: string; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiQuestion>> {
    return request<PaginatedResponse<ApiQuestion>>('/question-bank/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /** `teacher` is deliberately NOT accepted here — the backend forces it to the logged-in Teacher. */
  async createQuestion(payload: { subject: string; topic?: string; question_text: string; question_type: ApiQuestionType; options: string[]; correct_answer: string; marks: number }): Promise<ApiQuestion> {
    return request<ApiQuestion>('/question-bank/', { method: 'POST', body: payload })
  },

  async updateQuestion(id: string, payload: Partial<{ subject: string; topic: string; question_text: string; question_type: ApiQuestionType; options: string[]; correct_answer: string; marks: number }>): Promise<ApiQuestion> {
    return request<ApiQuestion>(`/question-bank/${id}/`, { method: 'PATCH', body: payload })
  },

  async deleteQuestion(id: string): Promise<void> {
    return request<void>(`/question-bank/${id}/`, { method: 'DELETE' })
  },
}

// ---------------------------------------------------------------------------
// Student "my ..." convenience wrappers (Student Phase 2)
//
// Every one of these hits the SAME shared endpoint teachers/admins use --
// the backend scopes the response to the logged-in Student automatically
// (see apps.core.mixins.StudentScopedQuerysetMixin), so no client-side
// student= filtering is required or trustworthy here.
// ---------------------------------------------------------------------------

export const examResultApi = {
  async getResults(params: { student?: string; semester?: string; page_size?: number } = {}): Promise<PaginatedResponse<ApiSemesterResult>> {
    return request<PaginatedResponse<ApiSemesterResult>>('/semester-results/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  async getResultSubjects(params: { semester_result?: string; page_size?: number } = {}): Promise<PaginatedResponse<ApiSemesterResultSubject>> {
    return request<PaginatedResponse<ApiSemesterResultSubject>>('/semester-result-subjects/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /**
   * Admin-only (backend permission: IsAdmin | ReadOnly). Publishes a
   * SemesterResult -- the model has no separate draft/published flag,
   * so creating the row (with a required published_date) IS the publish
   * step. This is the minimal missing workflow behind Problems 6/7: HOD
   * and Student result pages were already correctly wired to real data,
   * but no rows existed to display because nothing could create them.
   */
  async createResult(payload: { student: string; semester: string; sgpa: string; cgpa: string; total_credits_earned: number; result_status: string; published_date: string; remarks?: string }): Promise<ApiSemesterResult> {
    return request<ApiSemesterResult>('/semester-results/', { method: 'POST', body: payload })
  },
}

export interface AdminFeeSummaryRow {
  student_id: string
  admission_number: string
  name: string
  department: string
  total: string
  paid: string
  pending: string
  status: 'cleared' | 'partial' | 'overdue'
}

export const financeApi = {
  async getMyPayments(params: { page_size?: number } = {}): Promise<PaginatedResponse<ApiFeePayment>> {
    return request<PaginatedResponse<ApiFeePayment>>('/fee-payments/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /** Admin/Staff. Server-aggregated per-student total/paid/pending/status from real FeeStructure + FeePayment rows -- see backend FeeSummaryView. */
  async getAdminFeeSummary(params: { search?: string } = {}): Promise<AdminFeeSummaryRow[]> {
    return request<AdminFeeSummaryRow[]>('/fee-summary/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /** Admin/Staff. Real FeeStructure options for the Issue Fee form. */
  async getFeeStructures(params: { is_active?: boolean; page_size?: number } = {}): Promise<PaginatedResponse<ApiFeeStructure>> {
    return request<PaginatedResponse<ApiFeeStructure>>('/fee-structures/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /**
   * Admin/Staff. Issues/assigns a real due fee to a Student -- creates a
   * FeePayment representing an outstanding amount (amount_paid: 0,
   * payment_status: 'pending'), never a fake completed payment.
   */
  async issueFee(payload: { student: string; fee_structure: string; payment_date: string; payment_method?: ApiFeePayment['payment_method']; remarks?: string }): Promise<ApiFeePayment> {
    // amount_paid/payment_status are fixed here (not taken from the caller):
    // issuing a fee assigns a DUE amount, never a completed payment.
    // payment_method has no nullable/default column on the backend model,
    // so a neutral placeholder is used until an actual payment is recorded.
    return request<ApiFeePayment>('/fee-payments/', {
      method: 'POST',
      body: { payment_method: 'cash', ...payload, amount_paid: '0', payment_status: 'pending' },
    })
  },
}

export const scholarshipApi = {
  async getScholarships(params: { is_active?: boolean; page_size?: number } = {}): Promise<PaginatedResponse<ApiScholarship>> {
    return request<PaginatedResponse<ApiScholarship>>('/scholarships/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /** Already scoped server-side to the logged-in Student's own applications. */
  async getMyApplications(params: { page_size?: number } = {}): Promise<PaginatedResponse<ApiScholarshipApplication>> {
    return request<PaginatedResponse<ApiScholarshipApplication>>('/scholarship-applications/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /** `student` is deliberately NOT accepted here — the backend forces it to the logged-in Student. */
  async apply(payload: { scholarship: string; remarks?: string }): Promise<ApiScholarshipApplication> {
    return request<ApiScholarshipApplication>('/scholarship-applications/', { method: 'POST', body: payload })
  },
  /** Admin/Staff. Unscoped list of all applications (backend returns every row for these roles). */
  async getAllApplications(params: { status?: string; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiScholarshipApplication>> {
    return request<PaginatedResponse<ApiScholarshipApplication>>('/scholarship-applications/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /** Admin/Staff. Approve/reject a submitted application. */
  async updateApplicationStatus(id: string, payload: { status: 'approved' | 'rejected' | 'under_review'; remarks?: string }): Promise<ApiScholarshipApplication> {
    return request<ApiScholarshipApplication>(`/scholarship-applications/${id}/`, { method: 'PATCH', body: payload })
  },
  /** Admin/Staff. Adds a new Scholarship to the real catalog. */
  async createScholarship(payload: {
    name: string; scholarship_type: string; provider: string; description: string
    eligibility_criteria: string; amount: string; application_deadline: string; is_active?: boolean
  }): Promise<ApiScholarship> {
    return request<ApiScholarship>('/scholarships/', { method: 'POST', body: payload })
  },
  /**
   * Admin/Staff. Issues an existing Scholarship directly to a real Student
   * by creating the ScholarshipApplication already 'approved' -- the
   * project's existing semantic for an awarded/issued scholarship.
   */
  async issueScholarship(payload: { scholarship: string; student: string; remarks?: string }): Promise<ApiScholarshipApplication> {
    return request<ApiScholarshipApplication>('/scholarship-applications/', {
      method: 'POST',
      body: { ...payload, status: 'approved' },
    })
  },
}

export const notificationApi = {
  /** Any authenticated user can read; write is Admin/Staff-only. */
  async getNotifications(params: { notification_type?: string; target_audience?: string; is_active?: boolean; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiNotification>> {
    return request<PaginatedResponse<ApiNotification>>('/notifications/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /** `created_by`/`published_at` are deliberately NOT accepted here — the backend sets them from the logged-in user and current time. */
  async sendNotification(payload: { title: string; message: string; notification_type: ApiNotificationType; target_audience: ApiTargetAudience; expires_at?: string | null }): Promise<ApiNotification> {
    return request<ApiNotification>('/notifications/', { method: 'POST', body: payload })
  },
}

export const leaveApi = {
  /** Already scoped server-side to the logged-in Student's own leave requests. */
  async getMyLeaveRequests(params: { status?: string; page_size?: number } = {}): Promise<PaginatedResponse<ApiLeaveRequest>> {
    return request<PaginatedResponse<ApiLeaveRequest>>('/leave-requests/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /** `student`/`applicant_type` are deliberately NOT accepted here — the backend forces them from the logged-in Student. */
  async apply(payload: { start_date: string; end_date: string; reason: string }): Promise<ApiLeaveRequest> {
    return request<ApiLeaveRequest>('/leave-requests/', { method: 'POST', body: payload })
  },
  /** Teacher: own leave history + student leave requests from their own department (backend-scoped, see LeaveRequestViewSet.get_queryset). */
  async getForReview(params: { status?: string; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiLeaveRequest>> {
    return request<PaginatedResponse<ApiLeaveRequest>>('/leave-requests/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /** Approve/reject a leave request. Authorization (own department, etc.) is enforced server-side. */
  async decide(id: string, payload: { status: 'approved' | 'rejected'; remarks?: string }): Promise<ApiLeaveRequest> {
    return request<ApiLeaveRequest>(`/leave-requests/${id}/decision/`, { method: 'POST', body: payload })
  },
}

export const feedbackApi = {
  /** Teacher: feedback about themselves (backend-scoped). Admin/HOD: broader per role. */
  async getTeacherFeedback(params: { teacher?: string; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiTeacherFeedback>> {
    return request<PaginatedResponse<ApiTeacherFeedback>>('/teacher-feedback/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /** Student: submit/update feedback for a teacher. `student` is forced server-side from the logged-in Student. */
  async submit(payload: { teacher: string; rating: number; comment: string }): Promise<ApiTeacherFeedback> {
    return request<ApiTeacherFeedback>('/teacher-feedback/', { method: 'POST', body: payload })
  },
}

// ---------------------------------------------------------------------------
// Contact API (public /contact form -> Staff Contact Messages)
// ---------------------------------------------------------------------------

export interface ApiContactMessage {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  is_read: boolean
  created_at: string
}

export const contactApi = {
  /**
   * Public visitor submitting the /contact form -- no login required
   * (backend permission: AllowAny on create). Persists a real
   * ContactMessage row.
   */
  async submit(payload: { name: string; email: string; phone?: string; subject: string; message: string }): Promise<ApiContactMessage> {
    return request<ApiContactMessage>('/contact-messages/', { method: 'POST', body: payload })
  },
  /** Staff/Admin only (backend-enforced) -- real submitted messages, never a local array. */
  async getMessages(params: { is_read?: boolean; search?: string; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiContactMessage>> {
    return request<PaginatedResponse<ApiContactMessage>>('/contact-messages/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  async markRead(id: string): Promise<ApiContactMessage> {
    return request<ApiContactMessage>(`/contact-messages/${id}/mark-read/`, { method: 'POST' })
  },
}

// ---------------------------------------------------------------------------
// HOD API
// ---------------------------------------------------------------------------

export interface ApiDocument {
  id: string
  student: string
  student_name?: string | null
  admission_number?: string | null
  document_type: string
  file?: string | null
  status: 'pending' | 'verified' | 'rejected'
  verified_by?: number | null
  verified_by_name?: string | null
  requested_at: string
  updated_at: string
}

export type ApiCertificateType = 'bonafide' | 'character' | 'transcript' | 'migration'

export interface ApiCertificate {
  id: string
  certificate_number: string
  student: string
  student_name?: string | null
  admission_number?: string | null
  certificate_type: ApiCertificateType
  certificate_type_display?: string
  status: 'ready' | 'issued'
  status_display?: string
  issued_by?: string | null
  issued_by_name?: string | null
  issued_date?: string | null
  requested_at: string
  updated_at: string
}

/** Priority 14: the three documents every Student must upload AND get Staff-verified. Must match backend `REQUIRED_DOCUMENT_TYPES` exactly. */
export const REQUIRED_DOCUMENT_TYPES = [
  'Birth Certificate',
  'SSLC Result Card',
  'Plus Two Result Card',
] as const

export type RequiredDocumentStatusValue = 'missing' | 'pending' | 'verified' | 'rejected'

export interface ApiRequiredDocumentItem {
  document_type: string
  status: RequiredDocumentStatusValue
  document_id: string | null
  file?: string | null
  updated_at?: string | null
}

export interface ApiRequiredDocumentStatus {
  documents: ApiRequiredDocumentItem[]
  completed_count: number
  total_required: number
  is_complete: boolean
  student_id?: string
  student_name?: string
  admission_number?: string
}

export const documentsApi = {
  /** Staff/Admin: full list. Student: backend-scoped to only their own uploads. */
  async getDocuments(params: { status?: string; student?: string; search?: string; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiDocument>> {
    return request<PaginatedResponse<ApiDocument>>('/documents/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /** Student. Same endpoint as getDocuments -- the backend scopes list results to the logged-in Student's own documents automatically. */
  async getMyDocuments(params: { status?: string; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiDocument>> {
    return request<PaginatedResponse<ApiDocument>>('/documents/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /**
   * Student uploading a document -- actually creates the StudentDocument
   * row (POST) with a real multipart file upload. `student` is deliberately
   * NOT accepted here -- the backend forces it to the logged-in Student and
   * ignores/overrides any status sent from the client.
   */
  async uploadDocument(documentType: string, file: File): Promise<ApiDocument> {
    const form = new FormData()
    form.append('document_type', documentType)
    form.append('file', file)
    return request<ApiDocument>('/documents/', { method: 'POST', body: form })
  },
  /** `verified_by` is deliberately NOT accepted here — the backend sets it from the logged-in user. */
  async verify(id: string): Promise<ApiDocument> {
    return request<ApiDocument>(`/documents/${id}/verify/`, { method: 'POST' })
  },
  async reject(id: string): Promise<ApiDocument> {
    return request<ApiDocument>(`/documents/${id}/reject/`, { method: 'POST' })
  },
  /**
   * Priority 14 mandatory-document status. Student: always their own.
   * Staff/Admin: pass `student` for one student's status.
   */
  async getRequiredStatus(params: { student?: string } = {}): Promise<ApiRequiredDocumentStatus> {
    return request<ApiRequiredDocumentStatus>('/documents/required-status/', { params })
  },
  /** Staff/Admin only: mandatory-document status for every student (no `student` param). */
  async getRequiredStatusAll(): Promise<ApiRequiredDocumentStatus[]> {
    return request<ApiRequiredDocumentStatus[]>('/documents/required-status/')
  },
}

export const certificateApi = {
  /** Staff/Admin: full list. Student: only their own certificates (backend-scoped). */
  async getCertificates(params: { status?: string; student?: string; search?: string; page_size?: number; ordering?: string } = {}): Promise<PaginatedResponse<ApiCertificate>> {
    return request<PaginatedResponse<ApiCertificate>>('/certificates/', { params: params as Record<string, string | number | boolean | undefined> })
  },
  /** `certificate_number`/`status`/`issued_by` are deliberately NOT accepted here -- the backend generates/derives them. */
  async createCertificate(payload: { student: string; certificate_type: ApiCertificateType }): Promise<ApiCertificate> {
    return request<ApiCertificate>('/certificates/', { method: 'POST', body: payload })
  },
  /** Transitions ready -> issued server-side; issued_by is re-derived from the logged-in Staff user, never client-supplied. */
  async printIssue(id: string): Promise<ApiCertificate> {
    return request<ApiCertificate>(`/certificates/${id}/print-issue/`, { method: 'POST' })
  },
  /**
   * Downloads the real backend-generated certificate document. Bypasses
   * the JSON-only `request()` helper (this endpoint returns a file, not
   * JSON) but reuses the same auth/base-URL conventions, then triggers a
   * real browser download of the returned blob.
   */
  async download(id: string, filename: string): Promise<void> {
    const token = tokenStorage.getAccessToken()
    const res = await fetch(`${API_BASE_URL}/certificates/${id}/download/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      throw new ApiError(res.status, `Failed to download certificate (${res.status})`)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

export const hodApi = {
  async getHODs(params: {
    search?: string
    department?: string
    is_active?: boolean
    page?: number
    page_size?: number
    ordering?: string
  } = {}): Promise<PaginatedResponse<ApiHOD>> {
    return request<PaginatedResponse<ApiHOD>>('/hods/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getHOD(id: string): Promise<ApiHOD> {
    return request<ApiHOD>(`/hods/${id}/`)
  },

  /** Promotes an existing Teacher to HOD (reuses that Teacher's login, role -> hod). */
  async createHOD(payload: HODCreatePayload): Promise<ApiHOD> {
    return request<ApiHOD>('/hods/', { method: 'POST', body: payload })
  },

  async updateHOD(id: string, payload: HODUpdatePayload): Promise<ApiHOD> {
    return request<ApiHOD>(`/hods/${id}/`, { method: 'PATCH', body: payload })
  },

  async setPassword(id: string, password: string): Promise<void> {
    return request<void>(`/hods/${id}/set-password/`, { method: 'POST', body: { password } })
  },

  async deleteHOD(id: string): Promise<void> {
    return request<void>(`/hods/${id}/`, { method: 'DELETE' })
  },

  /** The logged-in HOD's OWN profile, derived server-side from the auth token — never a client-supplied id. */
  async getMe(): Promise<ApiHOD> {
    return request<ApiHOD>('/hods/me/')
  },

  /** Real-time ORM-aggregated stats for the logged-in HOD's OWN department (HOD Phase 4). */
  async getAnalytics(): Promise<ApiHODAnalytics> {
    return request<ApiHODAnalytics>('/hods/analytics/')
  },
}

// ---------------------------------------------------------------------------
// Department API (Admin → Department Management)
// ---------------------------------------------------------------------------

export const departmentApi = {
  async getDepartments(params: {
    search?: string
    is_active?: boolean
    page?: number
    page_size?: number
    ordering?: string
  } = {}): Promise<PaginatedResponse<ApiDepartment>> {
    return request<PaginatedResponse<ApiDepartment>>('/departments/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getDepartment(id: string): Promise<ApiDepartment> {
    return request<ApiDepartment>(`/departments/${id}/`)
  },

  /** Admin-only (enforced server-side: IsAdmin | ReadOnly). */
  async createDepartment(payload: DepartmentCreatePayload): Promise<ApiDepartment> {
    return request<ApiDepartment>('/departments/', { method: 'POST', body: payload })
  },

  async updateDepartment(id: string, payload: DepartmentUpdatePayload): Promise<ApiDepartment> {
    return request<ApiDepartment>(`/departments/${id}/`, { method: 'PATCH', body: payload })
  },

  /**
   * Department FKs (Course/Teacher/Student/Staff/Admission/HOD) all use
   * on_delete=PROTECT. If the department is still referenced, the backend
   * returns a 400/409 which `request()` turns into an ApiError — surface
   * err.message to the user rather than assuming delete always succeeds.
   */
  async deleteDepartment(id: string): Promise<void> {
    return request<void>(`/departments/${id}/`, { method: 'DELETE' })
  },
}

// ---------------------------------------------------------------------------
// Course API (Admin → Course Management)
// ---------------------------------------------------------------------------

export const courseApi = {
  async getCourses(params: {
    search?: string
    department?: string
    degree?: string
    is_active?: boolean
    page?: number
    page_size?: number
    ordering?: string
  } = {}): Promise<PaginatedResponse<ApiCourse>> {
    return request<PaginatedResponse<ApiCourse>>('/courses/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getCourse(id: string): Promise<ApiCourse> {
    return request<ApiCourse>(`/courses/${id}/`)
  },

  /** Admin-only (enforced server-side: IsAdmin | ReadOnly). */
  async createCourse(payload: CourseCreatePayload): Promise<ApiCourse> {
    return request<ApiCourse>('/courses/', { method: 'POST', body: payload })
  },

  async updateCourse(id: string, payload: CourseUpdatePayload): Promise<ApiCourse> {
    return request<ApiCourse>(`/courses/${id}/`, { method: 'PATCH', body: payload })
  },

  /**
   * Course FKs (Semester/Student/Subject/Timetable/FeeStructure/Admission)
   * all use on_delete=PROTECT. If the course is still referenced, the
   * backend returns a 400 which `request()` turns into an ApiError.
   */
  async deleteCourse(id: string): Promise<void> {
    return request<void>(`/courses/${id}/`, { method: 'DELETE' })
  },
}

// ---------------------------------------------------------------------------
// Subject API (Admin/HOD → Subject Management)
// ---------------------------------------------------------------------------

export const subjectApi = {
  async getSubjects(params: {
    search?: string
    course?: string
    semester?: string
    subject_type?: string
    is_active?: boolean
    page?: number
    page_size?: number
    ordering?: string
  } = {}): Promise<PaginatedResponse<ApiSubject>> {
    return request<PaginatedResponse<ApiSubject>>('/subjects/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getSubject(id: string): Promise<ApiSubject> {
    return request<ApiSubject>(`/subjects/${id}/`)
  },

  /** Admin/HOD only (enforced server-side: IsAdmin | IsHOD | ReadOnly, department-scoped for HOD). */
  async createSubject(payload: SubjectCreatePayload): Promise<ApiSubject> {
    return request<ApiSubject>('/subjects/', { method: 'POST', body: payload })
  },

  async updateSubject(id: string, payload: SubjectUpdatePayload): Promise<ApiSubject> {
    return request<ApiSubject>(`/subjects/${id}/`, { method: 'PATCH', body: payload })
  },

  /**
   * Subject FKs (Timetable/StudyMaterial/Assignment/Examination) all use
   * on_delete=PROTECT. If still referenced, backend returns a 400 which
   * `request()` turns into an ApiError.
   */
  async deleteSubject(id: string): Promise<void> {
    return request<void>(`/subjects/${id}/`, { method: 'DELETE' })
  },
}

// ---------------------------------------------------------------------------
// Teacher–Subject Assignment API (HOD → Faculty subject assignment)
// ---------------------------------------------------------------------------

export const teacherSubjectAssignmentApi = {
  async getAssignments(params: {
    teacher?: string
    subject?: string
    is_active?: boolean
    page?: number
    page_size?: number
    ordering?: string
  } = {}): Promise<PaginatedResponse<ApiTeacherSubjectAssignment>> {
    return request<PaginatedResponse<ApiTeacherSubjectAssignment>>('/teacher-subject-assignments/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /** Admin/HOD only (enforced server-side: IsAdmin | IsHOD | ReadOnly, department-scoped for HOD). */
  async assign(payload: { teacher: string; subject: string; is_active?: boolean }): Promise<ApiTeacherSubjectAssignment> {
    return request<ApiTeacherSubjectAssignment>('/teacher-subject-assignments/', { method: 'POST', body: payload })
  },

  async updateAssignment(id: string, payload: Partial<{ is_active: boolean }>): Promise<ApiTeacherSubjectAssignment> {
    return request<ApiTeacherSubjectAssignment>(`/teacher-subject-assignments/${id}/`, { method: 'PATCH', body: payload })
  },

  /** Unassign — the backend's unique(teacher, subject) constraint stays authoritative; re-assigning after this creates a fresh row. */
  async unassign(id: string): Promise<void> {
    return request<void>(`/teacher-subject-assignments/${id}/`, { method: 'DELETE' })
  },
}

// ---------------------------------------------------------------------------
// Academic Year API (Admin → Academic Year Management)
// ---------------------------------------------------------------------------

export const academicYearApi = {
  async getAcademicYears(params: {
    search?: string
    is_current?: boolean
    is_active?: boolean
    page?: number
    page_size?: number
    ordering?: string
  } = {}): Promise<PaginatedResponse<ApiAcademicYear>> {
    return request<PaginatedResponse<ApiAcademicYear>>('/academic-years/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getAcademicYear(id: string): Promise<ApiAcademicYear> {
    return request<ApiAcademicYear>(`/academic-years/${id}/`)
  },

  /** Admin-only (enforced server-side: IsAdmin | ReadOnly). */
  async createAcademicYear(payload: AcademicYearCreatePayload): Promise<ApiAcademicYear> {
    return request<ApiAcademicYear>('/academic-years/', { method: 'POST', body: payload })
  },

  async updateAcademicYear(id: string, payload: AcademicYearUpdatePayload): Promise<ApiAcademicYear> {
    return request<ApiAcademicYear>(`/academic-years/${id}/`, { method: 'PATCH', body: payload })
  },

  /**
   * AcademicYear FKs (Semester/FeeStructure/Admission) all use
   * on_delete=PROTECT. If still referenced, backend returns a 400 which
   * `request()` turns into an ApiError.
   */
  async deleteAcademicYear(id: string): Promise<void> {
    return request<void>(`/academic-years/${id}/`, { method: 'DELETE' })
  },
}

// ---------------------------------------------------------------------------
// Semester API (Admin → Semester Management)
// ---------------------------------------------------------------------------

export const semesterApi = {
  async getSemesters(params: {
    search?: string
    academic_year?: string
    course?: string
    semester_number?: number
    is_active?: boolean
    page?: number
    page_size?: number
    ordering?: string
  } = {}): Promise<PaginatedResponse<ApiSemester>> {
    return request<PaginatedResponse<ApiSemester>>('/semesters/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getSemester(id: string): Promise<ApiSemester> {
    return request<ApiSemester>(`/semesters/${id}/`)
  },

  /** Admin-only (enforced server-side: IsAdmin | ReadOnly). */
  async createSemester(payload: SemesterCreatePayload): Promise<ApiSemester> {
    return request<ApiSemester>('/semesters/', { method: 'POST', body: payload })
  },

  async updateSemester(id: string, payload: SemesterUpdatePayload): Promise<ApiSemester> {
    return request<ApiSemester>(`/semesters/${id}/`, { method: 'PATCH', body: payload })
  },

  /**
   * Semester FKs (Timetable/Student/Examination/Subject/Assignment/
   * StudyMaterial) all use on_delete=PROTECT. If still referenced, backend
   * returns a 400 which `request()` turns into an ApiError.
   */
  async deleteSemester(id: string): Promise<void> {
    return request<void>(`/semesters/${id}/`, { method: 'DELETE' })
  },
}

// ---------------------------------------------------------------------------
// Lookup APIs (for dropdowns) — reused, not duplicated
// ---------------------------------------------------------------------------

// NOTE: CourseViewSet/SemesterViewSet declare `filterset_fields` too, but like the
// old StudentViewSet, django-filter isn't installed in this project so server-side
// `?department=`/`?course=` filtering has no effect there. Rather than touch those
// (unrelated) apps in this phase, we fetch the full lists once and filter
// department -> course -> semester client-side (page_size covers realistic ERP scale).
export const lookupApi = {
  async getDepartments(): Promise<ApiDepartment[]> {
    const data = await request<PaginatedResponse<ApiDepartment>>('/departments/', { params: { page_size: 200 } })
    return data.results
  },

  async getCourses(): Promise<ApiCourse[]> {
    const data = await request<PaginatedResponse<ApiCourse>>('/courses/', { params: { page_size: 200 } })
    return data.results
  },

  async getSemesters(): Promise<ApiSemester[]> {
    const data = await request<PaginatedResponse<ApiSemester>>('/semesters/', { params: { page_size: 200 } })
    return data.results
  },

  async getAcademicYears(): Promise<ApiAcademicYear[]> {
    const data = await request<PaginatedResponse<ApiAcademicYear>>('/academic-years/', { params: { page_size: 200 } })
    return data.results
  },

  async getSubjects(): Promise<ApiSubject[]> {
    const data = await request<PaginatedResponse<ApiSubject>>('/subjects/', { params: { page_size: 200 } })
    return data.results
  },
}

// ---------------------------------------------------------------------------
// Staff API (Admin → Staff Management) — mirrors teacherApi. Staff accounts
// are User(role=staff, username=employee_id) + Staff, provisioned by Admin.
// ---------------------------------------------------------------------------

export interface ApiStaff {
  id: string
  user: ApiStudentUser & { is_active: boolean }
  department: string
  department_detail?: ApiDepartment
  employee_id: string
  designation: string
  phone: string
  email: string
  address: string
  joining_date: string
  profile_photo?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffCreatePayload {
  user_details: { first_name: string; last_name: string; password: string }
  department: string
  employee_id: string
  designation: string
  phone: string
  email: string
  address: string
  joining_date: string
}

export type StaffUpdatePayload = Partial<Omit<StaffCreatePayload, 'user_details'>>

export const staffApi = {
  async getStaff(params: {
    search?: string
    department?: string
    is_active?: boolean
    page?: number
    page_size?: number
    ordering?: string
  } = {}): Promise<PaginatedResponse<ApiStaff>> {
    return request<PaginatedResponse<ApiStaff>>('/staff/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getStaffMember(id: string): Promise<ApiStaff> {
    return request<ApiStaff>(`/staff/${id}/`)
  },

  async createStaff(payload: StaffCreatePayload): Promise<ApiStaff> {
    return request<ApiStaff>('/staff/', { method: 'POST', body: payload })
  },

  async updateStaff(id: string, payload: StaffUpdatePayload): Promise<ApiStaff> {
    return request<ApiStaff>(`/staff/${id}/`, { method: 'PATCH', body: payload })
  },

  async setPassword(id: string, password: string): Promise<void> {
    return request<void>(`/staff/${id}/set-password/`, { method: 'POST', body: { password } })
  },

  async deleteStaff(id: string): Promise<void> {
    return request<void>(`/staff/${id}/`, { method: 'DELETE' })
  },
}

// ---------------------------------------------------------------------------
// Admin panel API (Phase 6 backend): analytics, user management, roles,
// audit logs. All endpoints are IsAdmin-only on the backend.
// ---------------------------------------------------------------------------

export interface AdminAnalytics {
  totals: {
    students: number
    active_students: number
    teachers: number
    active_teachers: number
    staff: number
    active_staff: number
    hods: number
    departments: number
    courses: number
  }
  department_wise_students: { department__name: string | null; count: number }[]
  course_wise_students: { course__name: string | null; count: number }[]
  enrollment_trend: { year: number; students: number }[]
  admissions?: { total: number; by_status: { admission_status: string; count: number }[] }
  placements?: {
    total_drives: number
    active_drives: number
    total_applications: number
    by_status: { status: string; count: number }[]
  }
  fees?: {
    total_payments: number
    total_collected: number
    by_status: { payment_status: string; count: number }[]
    monthly_collection?: { month: string; collected: number; pending: number }[]
  }
  research?: { total_projects: number }
  generated_at?: string
}

export interface AdminUserRow {
  id: number
  username: string
  email: string | null
  first_name: string
  last_name: string
  role: 'student' | 'teacher' | 'staff' | 'hod' | 'admin'
  role_display: string
  display_id: string
  is_active: boolean
  is_verified?: boolean
  date_joined?: string
}

export interface AdminRoleRow {
  value: string
  label: string
  user_count: number
}

export interface AuditLogRow {
  id: string
  user: number | null
  user_display: string
  action: string
  resource: string
  resource_id: string
  description: string
  ip_address: string | null
  created_at: string
}

export const adminApi = {
  async getAnalytics(): Promise<AdminAnalytics> {
    const res = await request<{ success: boolean } & AdminAnalytics>('/admin/analytics/')
    return res
  },

  async getUsers(params: {
    search?: string
    role?: string
    is_active?: boolean
    page?: number
    page_size?: number
  } = {}): Promise<PaginatedResponse<AdminUserRow>> {
    return request<PaginatedResponse<AdminUserRow>>('/admin/users/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async updateUser(id: number, payload: Partial<Pick<AdminUserRow, 'first_name' | 'last_name' | 'email'>>): Promise<AdminUserRow> {
    return request<AdminUserRow>(`/admin/users/${id}/`, { method: 'PATCH', body: payload })
  },

  async activateUser(id: number): Promise<AdminUserRow> {
    return request<AdminUserRow>(`/admin/users/${id}/activate/`, { method: 'POST' })
  },

  async deactivateUser(id: number): Promise<AdminUserRow> {
    return request<AdminUserRow>(`/admin/users/${id}/deactivate/`, { method: 'POST' })
  },

  async setUserPassword(id: number, password: string): Promise<void> {
    return request<void>(`/admin/users/${id}/set-password/`, { method: 'POST', body: { password } })
  },

  async changeUserRole(id: number, role: string): Promise<AdminUserRow> {
    return request<AdminUserRow>(`/admin/users/${id}/change-role/`, { method: 'POST', body: { role } })
  },

  async getRoles(): Promise<AdminRoleRow[]> {
    const res = await request<{ success: boolean; results: AdminRoleRow[] }>('/admin/roles/')
    return res.results
  },

  async getAuditLogs(params: {
    action?: string
    resource?: string
    user?: number
    date_from?: string
    date_to?: string
    page?: number
    page_size?: number
  } = {}): Promise<PaginatedResponse<AuditLogRow>> {
    return request<PaginatedResponse<AuditLogRow>>('/admin/audit-logs/', { params: params as Record<string, string | number | boolean | undefined> })
  },
}

// ---------------------------------------------------------------------------
// CMS API (Admin → Website CMS) — ContentPage model, admin-write / auth-read.
// ---------------------------------------------------------------------------

export type ContentPageType = 'about' | 'vision' | 'mission' | 'principal_message' | 'privacy_policy' | 'terms' | 'other'

export interface ApiContentPage {
  id: string
  title: string
  slug: string
  page_type: ContentPageType
  page_type_display: string
  content: string
  meta_title: string | null
  meta_description: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface ContentPageCreatePayload {
  title: string
  slug: string
  page_type: ContentPageType
  content: string
  meta_title?: string
  meta_description?: string
  is_published?: boolean
}

export type ContentPageUpdatePayload = Partial<ContentPageCreatePayload>

// ---------------------------------------------------------------------------
// Research API (HOD → Research / Projects)
// ---------------------------------------------------------------------------

export interface ApiResearchProject {
  id: string
  title: string
  description: string
  principal_investigator: string
  principal_investigator_name?: string
  department: string
  department_name?: string
  department_code?: string
  funding_agency: string
  budget: string
  start_date: string
  end_date: string | null
  status: 'planning' | 'ongoing' | 'completed' | 'cancelled'
  is_active: boolean
  approval_status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string | null
  reviewed_by_name?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
}

/**
 * principal_investigator/department are deliberately NOT accepted here for
 * a HOD submission — the backend always derives both from the
 * authenticated HOD's own profile (Problem 1) and forces approval_status
 * to pending regardless of what is sent.
 */
export interface ResearchProjectCreatePayload {
  title: string
  description: string
  funding_agency?: string
  budget?: string
  start_date: string
  end_date?: string | null
  status?: 'planning' | 'ongoing' | 'completed' | 'cancelled'
}

export interface ApiPublicResearchProject {
  id: string
  title: string
  description: string
  department_name?: string
  principal_investigator_name?: string
  funding_agency: string
  budget: string
  start_date: string
  end_date: string | null
  status: 'planning' | 'ongoing' | 'completed' | 'cancelled'
}

export interface ApiResearchMember {
  id: string
  research_project: string
  teacher: string
  role: string
  joined_at: string
}

export const researchApi = {
  /** Backend scopes this to the logged-in HOD's own department automatically (HODScopedQuerysetMixin); Admin sees everything. */
  async getProjects(params: { department?: string; status?: string; is_active?: boolean; approval_status?: string; search?: string; page?: number; page_size?: number } = {}): Promise<PaginatedResponse<ApiResearchProject>> {
    return request<PaginatedResponse<ApiResearchProject>>('/research-projects/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getMembers(params: { research_project?: string; teacher?: string; page_size?: number } = {}): Promise<PaginatedResponse<ApiResearchMember>> {
    return request<PaginatedResponse<ApiResearchMember>>('/research-members/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /** HOD or Admin — backend derives department/principal_investigator for a HOD and always starts the project pending. */
  async createProject(payload: ResearchProjectCreatePayload): Promise<ApiResearchProject> {
    return request<ApiResearchProject>('/research-projects/', { method: 'POST', body: payload })
  },

  /** Admin-only (backend enforces this in the approve/reject actions). */
  async approveProject(id: string): Promise<ApiResearchProject> {
    return request<ApiResearchProject>(`/research-projects/${id}/approve/`, { method: 'POST' })
  },

  async rejectProject(id: string): Promise<ApiResearchProject> {
    return request<ApiResearchProject>(`/research-projects/${id}/reject/`, { method: 'POST' })
  },

  /** Public website — unauthenticated, approved projects only. */
  async getPublicProjects(): Promise<ApiPublicResearchProject[]> {
    return request<ApiPublicResearchProject[]>('/public/research-projects/', { skipAuth: true })
  },
}

// ---------------------------------------------------------------------------
// Placements API (HOD → Placements)
// ---------------------------------------------------------------------------

export interface ApiPlacementDrive {
  id: string
  company_name: string
  job_title: string
  employment_type: 'full_time' | 'internship' | 'contract'
  package_lpa: string
  location: string
  eligibility_criteria: string
  application_deadline: string
  drive_date: string
  description?: string | null
  is_active: boolean
  /** Real count of PlacementApplication rows with status='selected' for this drive (server-computed). */
  students_placed: number
  created_at: string
  updated_at: string
}

export interface PlacementDriveCreatePayload {
  company_name: string
  job_title: string
  employment_type: 'full_time' | 'internship' | 'contract'
  package_lpa: string
  location: string
  eligibility_criteria: string
  application_deadline: string
  drive_date: string
  description?: string
  is_active?: boolean
}

export interface ApiPlacementApplication {
  id: string
  placement_drive: string
  student: string
  status: 'applied' | 'shortlisted' | 'interview' | 'selected' | 'rejected' | string
  remarks: string
  applied_at: string
}

export const placementApi = {
  async getDrives(params: { is_active?: boolean; employment_type?: string; search?: string; page_size?: number } = {}): Promise<PaginatedResponse<ApiPlacementDrive>> {
    return request<PaginatedResponse<ApiPlacementDrive>>('/placement-drives/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /** Admin-only (backend permission: IsAdmin | ReadOnly). */
  async createDrive(payload: PlacementDriveCreatePayload): Promise<ApiPlacementDrive> {
    return request<ApiPlacementDrive>('/placement-drives/', { method: 'POST', body: payload })
  },

  /** Backend scopes this to the logged-in HOD's own department automatically (via student__department, HODScopedQuerysetMixin). */
  async getApplications(params: { placement_drive?: string; student?: string; status?: string; page_size?: number } = {}): Promise<PaginatedResponse<ApiPlacementApplication>> {
    return request<PaginatedResponse<ApiPlacementApplication>>('/placement-applications/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /** Student. Backend scopes this to the logged-in Student's own applications (StudentScopedQuerysetMixin). */
  async getMyApplications(params: { page_size?: number } = {}): Promise<PaginatedResponse<ApiPlacementApplication>> {
    return request<PaginatedResponse<ApiPlacementApplication>>('/placement-applications/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /** Student. `student` is deliberately NOT accepted here — the backend forces it to the logged-in Student and ignores/overrides status on create. */
  async apply(payload: { placement_drive: string }): Promise<ApiPlacementApplication> {
    return request<ApiPlacementApplication>('/placement-applications/', { method: 'POST', body: payload })
  },
}

// ---------------------------------------------------------------------------
// Infrastructure API (Admin → Campus Facilities)
// ---------------------------------------------------------------------------

export interface ApiFacility {
  id: string
  name: string
  facility_type: string
  capacity: string
  status: 'operational' | 'under_maintenance'
  created_at: string
  updated_at: string
}

export interface FacilityCreatePayload {
  name: string
  facility_type: string
  capacity?: string
  status?: 'operational' | 'under_maintenance'
}

export type FacilityUpdatePayload = Partial<FacilityCreatePayload>

export const infrastructureApi = {
  async getFacilities(params: { status?: string; facility_type?: string; search?: string; page_size?: number } = {}): Promise<PaginatedResponse<ApiFacility>> {
    return request<PaginatedResponse<ApiFacility>>('/facilities/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  /** Admin-only (backend permission: IsAdmin | ReadOnly). */
  async createFacility(payload: FacilityCreatePayload): Promise<ApiFacility> {
    return request<ApiFacility>('/facilities/', { method: 'POST', body: payload })
  },

  async updateFacility(id: string, payload: FacilityUpdatePayload): Promise<ApiFacility> {
    return request<ApiFacility>(`/facilities/${id}/`, { method: 'PATCH', body: payload })
  },

  async deleteFacility(id: string): Promise<void> {
    return request<void>(`/facilities/${id}/`, { method: 'DELETE' })
  },
}

export const cmsApi = {
  async getPages(params: {
    page_type?: string
    is_published?: boolean
    page?: number
    page_size?: number
  } = {}): Promise<PaginatedResponse<ApiContentPage>> {
    return request<PaginatedResponse<ApiContentPage>>('/cms/pages/', { params: params as Record<string, string | number | boolean | undefined> })
  },

  async getPage(id: string): Promise<ApiContentPage> {
    return request<ApiContentPage>(`/cms/pages/${id}/`)
  },

  async createPage(payload: ContentPageCreatePayload): Promise<ApiContentPage> {
    return request<ApiContentPage>('/cms/pages/', { method: 'POST', body: payload })
  },

  async updatePage(id: string, payload: ContentPageUpdatePayload): Promise<ApiContentPage> {
    return request<ApiContentPage>(`/cms/pages/${id}/`, { method: 'PATCH', body: payload })
  },

  async deletePage(id: string): Promise<void> {
    return request<void>(`/cms/pages/${id}/`, { method: 'DELETE' })
  },
}
