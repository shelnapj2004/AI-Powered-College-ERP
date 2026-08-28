import { LayoutDashboard, GraduationCap, Users, UserPlus, UserCog, CreditCard, FileCheck, Award, FileText, Bell, Calendar, BarChart2, MessageSquare, Mail } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { StatCard, Card, Badge, Button, Table, PageHeader, SearchBar, Select, Modal, Input, Alert } from '../../components/ui'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  studentApi, teacherApi, hodApi, admissionApi, lookupApi, tokenStorage, ApiError,
  financeApi, scholarshipApi, eventApi, notificationApi, documentsApi, certificateApi, contactApi,
  REQUIRED_DOCUMENT_TYPES,
  type ApiStudent, type ApiDepartment, type ApiCourse, type ApiSemester,
  type ApiTeacher, type ApiHOD, type ApiAdmission,
  type AdminFeeSummaryRow, type ApiScholarshipApplication, type ApiScholarship,
  type ApiEvent, type ApiNotification, type ApiDocument, type ApiContactMessage,
  type ApiCertificate, type ApiCertificateType, type ApiFeeStructure,
  type ApiRequiredDocumentStatus,
} from '../../services/api'

const REQUIRED_DOCUMENT_TYPE_SET: ReadonlySet<string> = new Set(REQUIRED_DOCUMENT_TYPES)

function buildSidebarItems(pendingAdmissionCount: number | null) {
  return [
  { label: 'Dashboard', to: '/staff', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Student Management', to: '/staff/students', icon: <GraduationCap className="w-4 h-4" /> },
  { label: 'Teacher Management', to: '/staff/teachers', icon: <Users className="w-4 h-4" /> },
  { label: 'HOD Management', to: '/staff/hods', icon: <UserCog className="w-4 h-4" /> },
  { label: 'Admission Management', to: '/staff/admissions', icon: <UserPlus className="w-4 h-4" />, ...(pendingAdmissionCount ? { badge: pendingAdmissionCount } : {}) },
  { label: 'Fee Management', to: '/staff/fees', icon: <CreditCard className="w-4 h-4" /> },
  { label: 'Certificate Management', to: '/staff/certificates', icon: <FileCheck className="w-4 h-4" /> },
  { label: 'Scholarship Management', to: '/staff/scholarships', icon: <Award className="w-4 h-4" /> },
  { label: 'Documents', to: '/staff/documents', icon: <FileText className="w-4 h-4" /> },
  { label: 'Contact Messages', to: '/staff/contact', icon: <Mail className="w-4 h-4" /> },
  { label: 'Notifications', to: '/staff/notifications', icon: <Bell className="w-4 h-4" /> },
  { label: 'Events', to: '/staff/events', icon: <Calendar className="w-4 h-4" /> },
  { label: 'Reports', to: '/staff/reports', icon: <BarChart2 className="w-4 h-4" /> },
  { label: 'AI Administrative Assistant', to: '/staff/ai', icon: <MessageSquare className="w-4 h-4" /> },
  ]
}

// Dashboard "Recent Admissions" preview and the Reports tiles below now read
// straight off ApiTeacher / ApiAdmission (fetched once in StaffDashboard's
// root component via teacherApi/admissionApi and passed down) -- no local
// TeacherRow/AdmissionRow mock shape or initial* arrays here anymore. The
// actual Student, Teacher, HOD, and Admission MANAGEMENT pages (StudentMgmt,
// TeacherMgmt, HODMgmt, AdmissionMgmt below) fetch their own data and are
// untouched.
function teacherDisplayName(t: ApiTeacher) {
  const full = `${t.user.first_name} ${t.user.last_name}`.trim()
  return full || t.user.username
}

function admissionBadgeVariant(status: ApiAdmission['admission_status']) {
  return status === 'approved' ? 'green' : status === 'rejected' || status === 'cancelled' ? 'red' : 'yellow'
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function Dashboard({ admissions, admissionsLoading, admissionsError, studentCount, teacherCount, pendingAdmissionCount, feeDefaulterCount, notify }: {
  admissions: ApiAdmission[]; admissionsLoading: boolean; admissionsError: string | null
  studentCount: number | null; teacherCount: number | null; pendingAdmissionCount: number | null; feeDefaulterCount: number | null
  notify: (msg: string) => void
}) {
  const navigate = useNavigate()
  const quickActions: Record<string, () => void> = {
    'Issue Certificate': () => navigate('/staff/certificates'),
    'Process Fee': () => navigate('/staff/fees'),
    'Approve Admission': () => navigate('/staff/admissions'),
    'Generate Report': () => navigate('/staff/reports'),
    'Add Event': () => navigate('/staff/events'),
    'Send Notification': () => navigate('/staff/notifications'),
  }
  const fmt = (n: number | null) => n === null ? '—' : n.toLocaleString()
  return (
    <div>
      <PageHeader title="Staff Dashboard" subtitle="Administrative Office · EduVerse College" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={fmt(studentCount)} icon={<GraduationCap className="w-5 h-5" />} color="blue" />
        <StatCard label="Faculty Members" value={fmt(teacherCount)} icon={<Users className="w-5 h-5" />} color="purple" />
        <StatCard label="Pending Admissions" value={fmt(pendingAdmissionCount)} icon={<UserPlus className="w-5 h-5" />} color="yellow" />
        <StatCard label="Fee Defaulters" value={fmt(feeDefaulterCount)} icon={<CreditCard className="w-5 h-5" />} color="red" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Recent Admissions</h3>
          {admissionsLoading ? (
            <p className="text-sm text-slate-500 py-4">Loading admissions…</p>
          ) : admissionsError ? (
            <p className="text-sm text-red-600 py-4">{admissionsError}</p>
          ) : admissions.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No admissions yet.</p>
          ) : (
            <div className="space-y-3">
              {admissions.slice(0, 4).map(a => (
                <button
                  key={a.id}
                  onClick={() => navigate('/staff/admissions')}
                  className="w-full flex items-center justify-between py-2 border-b border-slate-50 last:border-0 text-left hover:bg-slate-50 rounded-lg px-1 -mx-1 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{a.full_name}</p>
                    <p className="text-xs text-slate-500">{a.department_detail?.name ?? ''} · {a.admission_date}</p>
                  </div>
                  <Badge variant={admissionBadgeVariant(a.admission_status)}>{a.admission_status}</Badge>
                </button>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(quickActions).map(action => (
              <Button key={action} variant="outline" size="sm" className="justify-start" onClick={quickActions[action]}>{action}</Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function StudentMgmt({ notify }: { notify: (msg: string) => void }) {
  const [students, setStudents] = useState<ApiStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const [pending, setPending] = useState<ApiAdmission[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)

  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [semesters, setSemesters] = useState<ApiSemester[]>([])

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [semFilter, setSemFilter] = useState('')

  const [editing, setEditing] = useState<ApiStudent | null>(null)
  const [editForm, setEditForm] = useState({
    department: '', course: '', semester: '', roll_number: '', registration_number: '',
    phone: '', guardian_name: '', guardian_phone: '', address: '', current_semester: '1',
    gender: 'male' as 'male' | 'female' | 'other', is_active: true,
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [viewing, setViewing] = useState<ApiStudent | null>(null)

  const [togglingId, setTogglingId] = useState<string | null>(null)

  // --- Create Account (Admission -> Student login) ---
  const [creatingFor, setCreatingFor] = useState<ApiAdmission | null>(null)
  const [accountForm, setAccountForm] = useState({
    semester: '', roll_number: '', registration_number: '', current_semester: '1', password: '',
    date_of_birth: '', guardian_name: '', guardian_phone: '', address: '', email: '', phone: '',
  })
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [justCreated, setJustCreated] = useState<{ student: ApiStudent; password: string } | null>(null)

  // --- Add Student directly (Priority 14 -- Staff-direct, no Admission
  // record required). Resulting Student is created `approval_status:
  // pending` and the account is inactive until Admin approves. ---
  const [addingStudent, setAddingStudent] = useState(false)
  const [newStudentForm, setNewStudentForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    date_of_birth: '', gender: 'male' as 'male' | 'female' | 'other',
    guardian_name: '', guardian_phone: '', address: '',
    department: '', course: '', semester: '',
    roll_number: '', registration_number: '', current_semester: '1',
    password: '',
  })
  const [creatingStudent, setCreatingStudent] = useState(false)
  const [newStudentError, setNewStudentError] = useState<string | null>(null)

  // --- Set / reset password for an existing account ---
  const [resettingFor, setResettingFor] = useState<ApiStudent | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resettingPw, setResettingPw] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  // Load department/course/semester lookups once for the dropdowns.
  useEffect(() => {
    lookupApi.getDepartments().then(setDepartments).catch(() => {})
    lookupApi.getCourses().then(setCourses).catch(() => {})
    lookupApi.getSemesters().then(setSemesters).catch(() => {})
  }, [])

  async function fetchStudents() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await studentApi.getStudents({
        search: search || undefined,
        department: deptFilter || undefined,
        current_semester: semFilter ? Number(semFilter) : undefined,
        page_size: 100,
        ordering: 'admission_number',
      })
      setStudents(res.results)
      setCount(res.count)
    } catch (err) {
      setStudents([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load students.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPending() {
    setPendingLoading(true)
    try {
      const res = await admissionApi.getAdmissions({ account_created: false, page_size: 100, ordering: 'application_number' })
      setPending(res.results)
    } catch {
      setPending([])
    } finally {
      setPendingLoading(false)
    }
  }

  // Debounced search + immediate filter refetch.
  useEffect(() => {
    const t = setTimeout(() => { fetchStudents() }, search ? 350 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, deptFilter, semFilter])

  useEffect(() => { fetchPending() }, [])

  const coursesForDept = (deptId: string) => courses.filter(c => c.department === deptId)
  const semestersForCourse = (courseId: string) => semesters.filter(s => s.course === courseId)

  function studentName(s: ApiStudent) {
    const full = `${s.user.first_name} ${s.user.last_name}`.trim()
    return full || s.user.username
  }

  function openEdit(s: ApiStudent) {
    setEditError(null)
    setEditing(s)
    setEditForm({
      department: s.department, course: s.course, semester: s.semester,
      roll_number: s.roll_number, registration_number: s.registration_number,
      phone: s.phone, guardian_name: s.guardian_name, guardian_phone: s.guardian_phone,
      address: s.address, current_semester: String(s.current_semester),
      gender: s.gender, is_active: s.is_active,
    })
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSavingEdit(true)
    setEditError(null)
    try {
      await studentApi.updateStudent(editing.id, {
        department: editForm.department, course: editForm.course, semester: editForm.semester,
        roll_number: editForm.roll_number, registration_number: editForm.registration_number,
        phone: editForm.phone, guardian_name: editForm.guardian_name, guardian_phone: editForm.guardian_phone,
        address: editForm.address, current_semester: Number(editForm.current_semester),
        gender: editForm.gender, is_active: editForm.is_active,
      })
      notify(`${studentName(editing)} updated successfully`)
      setEditing(null)
      await fetchStudents()
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Failed to update student.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleToggleActive(s: ApiStudent) {
    setTogglingId(s.id)
    try {
      await studentApi.updateStudent(s.id, { is_active: !s.is_active })
      notify(`${studentName(s)} ${s.is_active ? 'deactivated' : 'activated'} successfully`)
      await fetchStudents()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update student status.')
    } finally {
      setTogglingId(null)
    }
  }

  async function openView(s: ApiStudent) {
    setViewing(s)
    try {
      const fresh = await studentApi.getStudent(s.id)
      setViewing(fresh)
    } catch {
      // keep showing the row data we already have if the refetch fails
    }
  }

  function openCreateAccount(a: ApiAdmission) {
    setAccountError(null)
    setCreatingFor(a)
    setAccountForm({
      semester: '',
      roll_number: a.roll_number || '',
      registration_number: '',
      current_semester: '1',
      password: '',
      // Prefill from the Admission record where it already has a value --
      // Staff only needs to type into whichever of these the registration
      // is missing (surfaced as required below via missingAdmissionFields).
      date_of_birth: a.date_of_birth || '',
      guardian_name: a.guardian_name || '',
      guardian_phone: a.guardian_phone || '',
      address: a.address || '',
      email: a.email || '',
      phone: a.phone || '',
    })
  }

  /** Which Flow-A-required fields the Admission record is missing, so Staff must supply them here. */
  function missingAdmissionFields(a: ApiAdmission): string[] {
    const missing: string[] = []
    if (!a.date_of_birth) missing.push('date_of_birth')
    if (!a.guardian_name) missing.push('guardian_name')
    if (!a.guardian_phone) missing.push('guardian_phone')
    if (!a.address) missing.push('address')
    if (!a.email) missing.push('email')
    if (!a.phone) missing.push('phone')
    return missing
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    let out = ''
    for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
    setAccountForm(f => ({ ...f, password: out }))
  }

  async function handleCreateAccount() {
    if (!creatingFor) return
    if (!accountForm.semester) { setAccountError('Please select a semester.'); return }
    if (!accountForm.roll_number.trim()) { setAccountError('Roll number is required to generate the Student ID.'); return }
    if (accountForm.password.length < 6) { setAccountError('Password must be at least 6 characters.'); return }

    const missing = missingAdmissionFields(creatingFor)
    for (const field of missing) {
      const value = (accountForm as Record<string, string>)[field]
      if (!value || !value.trim()) {
        setAccountError(`Registration is missing "${field.replace(/_/g, ' ')}" — please enter it above.`)
        return
      }
    }

    setCreatingAccount(true)
    setAccountError(null)
    try {
      const student = await studentApi.createAccount({
        admission: creatingFor.id,
        semester: accountForm.semester,
        roll_number: accountForm.roll_number.trim(),
        registration_number: accountForm.registration_number.trim() || undefined,
        current_semester: Number(accountForm.current_semester) || 1,
        password: accountForm.password,
        // Overrides for whatever the Admission record is missing -- backend
        // only falls back to these when the Admission's own value is blank,
        // so it's safe to always send the (prefilled-or-edited) form values.
        date_of_birth: accountForm.date_of_birth.trim() || undefined,
        guardian_name: accountForm.guardian_name.trim() || undefined,
        guardian_phone: accountForm.guardian_phone.trim() || undefined,
        address: accountForm.address.trim() || undefined,
        email: accountForm.email.trim() || undefined,
        phone: accountForm.phone.trim() || undefined,
      })
      setJustCreated({ student, password: accountForm.password })
      setCreatingFor(null)
      await Promise.all([fetchStudents(), fetchPending()])
    } catch (err) {
      setAccountError(err instanceof ApiError ? err.message : 'Failed to create student account.')
    } finally {
      setCreatingAccount(false)
    }
  }

  function openAddStudent() {
    setNewStudentError(null)
    setNewStudentForm({
      first_name: '', last_name: '', email: '', phone: '',
      date_of_birth: '', gender: 'male', guardian_name: '', guardian_phone: '', address: '',
      department: '', course: '', semester: '',
      roll_number: '', registration_number: '', current_semester: '1', password: '',
    })
    setAddingStudent(true)
  }

  function generateNewStudentPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    let out = ''
    for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
    setNewStudentForm(f => ({ ...f, password: out }))
  }

  async function handleCreateStudentDirect() {
    const f = newStudentForm
    if (!f.first_name.trim()) { setNewStudentError('First name is required.'); return }
    if (!f.department) { setNewStudentError('Please select a department.'); return }
    if (!f.course) { setNewStudentError('Please select a course.'); return }
    if (!f.semester) { setNewStudentError('Please select a semester.'); return }
    if (!f.date_of_birth) { setNewStudentError('Date of birth is required.'); return }
    if (!f.phone.trim()) { setNewStudentError('Phone is required.'); return }
    if (!f.email.trim()) { setNewStudentError('Email is required.'); return }
    if (!f.guardian_name.trim()) { setNewStudentError('Guardian name is required.'); return }
    if (!f.guardian_phone.trim()) { setNewStudentError('Guardian phone is required.'); return }
    if (!f.address.trim()) { setNewStudentError('Address is required.'); return }
    if (!f.roll_number.trim()) { setNewStudentError('Roll number is required to generate the Student ID.'); return }
    if (f.password.length < 6) { setNewStudentError('Password must be at least 6 characters.'); return }

    setCreatingStudent(true)
    setNewStudentError(null)
    try {
      // No `admission` -- backend takes this as the Staff-direct flow:
      // creates Student with approval_status "pending" and an inactive
      // account, pending Admin approval.
      const student = await studentApi.createAccount({
        semester: f.semester,
        password: f.password,
        roll_number: f.roll_number.trim(),
        registration_number: f.registration_number.trim() || undefined,
        current_semester: Number(f.current_semester) || 1,
        first_name: f.first_name.trim(),
        last_name: f.last_name.trim() || undefined,
        email: f.email.trim(),
        phone: f.phone.trim(),
        date_of_birth: f.date_of_birth,
        gender: f.gender,
        guardian_name: f.guardian_name.trim(),
        guardian_phone: f.guardian_phone.trim(),
        address: f.address.trim(),
        department: f.department,
        course: f.course,
      })
      setJustCreated({ student, password: f.password })
      setAddingStudent(false)
      notify(`${student.user.first_name} ${student.user.last_name} created — pending Admin approval.`)
      await fetchStudents()
    } catch (err) {
      setNewStudentError(err instanceof ApiError ? err.message : 'Failed to create student.')
    } finally {
      setCreatingStudent(false)
    }
  }

  async function handleResetPassword() {
    if (!resettingFor) return
    if (resetPassword.length < 6) { setResetError('Password must be at least 6 characters.'); return }
    setResettingPw(true)
    setResetError(null)
    try {
      await studentApi.setPassword(resettingFor.id, resetPassword)
      notify(`Password updated for ${studentName(resettingFor)}`)
      setResettingFor(null)
      setResetPassword('')
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : 'Failed to reset password.')
    } finally {
      setResettingPw(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Student Management"
        subtitle={loading ? 'Loading students…' : `${count} account${count === 1 ? '' : 's'} · ${pending.length} registration${pending.length === 1 ? '' : 's'} awaiting account creation`}
        actions={<Button onClick={openAddStudent}>Add Student</Button>}
      />

      {/* Registrations awaiting a login account -- the "Not Created" state from Admin's registration form */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 font-display">Registered Students — Account Not Created</h3>
          <Badge variant="yellow">{pending.length}</Badge>
        </div>
        {pendingLoading ? (
          <p className="text-sm text-slate-500 py-4 text-center">Loading registrations…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No registrations are waiting on an account. New registrations appear here once Admin submits them.</p>
        ) : (
          <Table
            columns={[
              { key: 'application_number', header: 'App No.' },
              { key: 'full_name', header: 'Name' },
              { key: 'dept', header: 'Dept', render: r => (r as unknown as ApiAdmission).department_detail?.code ?? '—' },
              { key: 'admission_status', header: 'Status', render: r => {
                const st = (r as unknown as ApiAdmission).admission_status
                return <Badge variant={st === 'approved' ? 'green' : st === 'rejected' ? 'red' : 'yellow'}>{st}</Badge>
              } },
              { key: 'roll_number', header: 'Roll No.', render: r => (r as unknown as ApiAdmission).roll_number || '—' },
              { key: 'actions', header: 'Actions', render: r => {
                const a = r as unknown as ApiAdmission
                return <Button size="sm" disabled={a.admission_status !== 'approved'} onClick={() => openCreateAccount(a)}>
                  {a.admission_status === 'approved' ? 'Create Account' : 'Awaiting Approval'}
                </Button>
              } },
            ]}
            data={pending as unknown as Record<string, unknown>[]}
          />
        )}
      </Card>

      <Card className="mb-4">
        <div className="flex gap-3 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, roll no, admission no, or Student ID..." className="flex-1 min-w-48" />
          <Select className="w-48" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select className="w-32" value={semFilter} onChange={e => setSemFilter(e.target.value)}>
            <option value="">All Sem</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>Sem {n}</option>)}
          </Select>
        </div>
      </Card>

      {loadError && (
        <div className="mb-4">
          <Alert type="error">
            {loadError} <button className="underline font-semibold ml-1" onClick={() => fetchStudents()}>Retry</button>
          </Alert>
        </div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading students…</p></Card>
      ) : !loadError && students.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No student accounts found{search || deptFilter || semFilter ? ' for these filters' : ''}.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'student_id', header: 'Student ID', render: r => <span className="font-mono text-xs">{(r as unknown as ApiStudent).student_id ?? '—'}</span> },
              { key: 'name', header: 'Name', render: r => studentName(r as unknown as ApiStudent) },
              { key: 'dept', header: 'Dept', render: r => (r as unknown as ApiStudent).department_detail?.code ?? '—' },
              { key: 'sem', header: 'Semester', render: r => `Sem ${(r as unknown as ApiStudent).current_semester}` },
              { key: 'status', header: 'Account Status', render: r => <Badge variant={(r as unknown as ApiStudent).is_active ? 'green' : 'red'}>{(r as unknown as ApiStudent).is_active ? 'Active' : 'Inactive'}</Badge> },
              { key: 'approval_status', header: 'Approval', render: r => {
                const st = (r as unknown as ApiStudent).approval_status
                return <Badge variant={st === 'approved' ? 'green' : st === 'rejected' ? 'red' : 'yellow'}>{st}</Badge>
              } },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const s = r as unknown as ApiStudent
                  return (
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => openView(s)}>View</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setResetError(null); setResetPassword(''); setResettingFor(s) }}>Reset Password</Button>
                      <Button size="sm" variant="ghost" disabled={togglingId === s.id} onClick={() => handleToggleActive(s)} className={s.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}>
                        {togglingId === s.id ? '…' : s.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  )
                }
              },
            ]}
            data={students as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {/* View Student */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Student Details" size="lg">
        {viewing && (
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><p className="text-slate-500">Name</p><p className="font-medium text-slate-900">{studentName(viewing)}</p></div>
            <div><p className="text-slate-500">Student ID (login)</p><p className="font-medium text-slate-900 font-mono">{viewing.student_id ?? '—'}</p></div>
            <div><p className="text-slate-500">Admission No.</p><p className="font-medium text-slate-900">{viewing.admission_number}</p></div>
            <div><p className="text-slate-500">Roll No.</p><p className="font-medium text-slate-900">{viewing.roll_number}</p></div>
            <div><p className="text-slate-500">Registration No.</p><p className="font-medium text-slate-900">{viewing.registration_number}</p></div>
            <div><p className="text-slate-500">Department</p><p className="font-medium text-slate-900">{viewing.department_detail?.name ?? '—'}</p></div>
            <div><p className="text-slate-500">Course</p><p className="font-medium text-slate-900">{viewing.course_detail?.name ?? '—'}</p></div>
            <div><p className="text-slate-500">Semester</p><p className="font-medium text-slate-900">Sem {viewing.current_semester}</p></div>
            <div><p className="text-slate-500">Gender</p><p className="font-medium text-slate-900 capitalize">{viewing.gender}</p></div>
            <div><p className="text-slate-500">Date of Birth</p><p className="font-medium text-slate-900">{viewing.date_of_birth}</p></div>
            <div><p className="text-slate-500">Phone</p><p className="font-medium text-slate-900">{viewing.phone}</p></div>
            <div><p className="text-slate-500">Email</p><p className="font-medium text-slate-900">{viewing.email}</p></div>
            <div><p className="text-slate-500">Guardian Name</p><p className="font-medium text-slate-900">{viewing.guardian_name}</p></div>
            <div><p className="text-slate-500">Guardian Phone</p><p className="font-medium text-slate-900">{viewing.guardian_phone}</p></div>
            <div className="sm:col-span-2"><p className="text-slate-500">Address</p><p className="font-medium text-slate-900">{viewing.address}</p></div>
            <div><p className="text-slate-500">Admission Date</p><p className="font-medium text-slate-900">{viewing.admission_date}</p></div>
            <div><p className="text-slate-500">Account Status</p><Badge variant={viewing.is_active ? 'green' : 'red'}>{viewing.is_active ? 'Active' : 'Inactive'}</Badge></div>
            <div><p className="text-slate-500">Fee Status</p><Badge variant="slate" className="italic">Not available</Badge></div>
          </div>
        )}
      </Modal>

      {/* Edit Student */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Student" size="lg">
        {editing && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 -mt-2">{studentName(editing)} · {editing.student_id}</p>
            {editError && <Alert type="error">{editError}</Alert>}
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Department" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value, course: '', semester: '' })}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <Select label="Course" value={editForm.course} onChange={e => setEditForm({ ...editForm, course: e.target.value, semester: '' })}>
                <option value="">Select course</option>
                {coursesForDept(editForm.department).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select label="Semester" value={editForm.semester} onChange={e => setEditForm({ ...editForm, semester: e.target.value })}>
                <option value="">Select semester</option>
                {semestersForCourse(editForm.course).map(s => <option key={s.id} value={s.id}>{s.name || `Semester ${s.semester_number}`}</option>)}
              </Select>
              <Input label="Current Semester (#)" type="number" min={1} value={editForm.current_semester} onChange={e => setEditForm({ ...editForm, current_semester: e.target.value })} />
              <Input label="Roll Number" value={editForm.roll_number} onChange={e => setEditForm({ ...editForm, roll_number: e.target.value })} />
              <Input label="Registration Number" value={editForm.registration_number} onChange={e => setEditForm({ ...editForm, registration_number: e.target.value })} />
              <Input label="Phone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              <Select label="Gender" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value as 'male' | 'female' | 'other' })}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </Select>
              <Input label="Guardian Name" value={editForm.guardian_name} onChange={e => setEditForm({ ...editForm, guardian_name: e.target.value })} />
              <Input label="Guardian Phone" value={editForm.guardian_phone} onChange={e => setEditForm({ ...editForm, guardian_phone: e.target.value })} />
            </div>
            <Input label="Address" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
            <Select label="Account Status" value={editForm.is_active ? 'Active' : 'Inactive'} onChange={e => setEditForm({ ...editForm, is_active: e.target.value === 'Active' })}>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Account for a registered student */}
      <Modal open={!!creatingFor} onClose={() => setCreatingFor(null)} title="Create Student Login Account" size="lg">
        {creatingFor && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 -mt-2">{creatingFor.full_name} · {creatingFor.application_number} · {creatingFor.department_detail?.name}</p>
            {accountError && <Alert type="error">{accountError}</Alert>}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Course</label>
                <div className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-500 bg-slate-50">{creatingFor.course_detail?.name ?? '—'}</div>
              </div>
              <Select label="Semester" value={accountForm.semester} onChange={e => setAccountForm({ ...accountForm, semester: e.target.value })}>
                <option value="">Select semester</option>
                {semestersForCourse(creatingFor.course).map(s => <option key={s.id} value={s.id}>{s.name || `Semester ${s.semester_number}`}</option>)}
              </Select>
              <Input label="Current Semester (#)" type="number" min={1} value={accountForm.current_semester} onChange={e => setAccountForm({ ...accountForm, current_semester: e.target.value })} />
              <Input label="Roll Number" value={accountForm.roll_number} onChange={e => setAccountForm({ ...accountForm, roll_number: e.target.value })} placeholder="Used to generate the Student ID" />
              <Input label="Registration Number (optional)" value={accountForm.registration_number} onChange={e => setAccountForm({ ...accountForm, registration_number: e.target.value })} placeholder={`Defaults to ${creatingFor.application_number}`} />
            </div>
            {missingAdmissionFields(creatingFor).length > 0 && (
              <div className="flex flex-col gap-3 border border-amber-200 bg-amber-50 rounded-xl p-4">
                <p className="text-sm text-amber-800">This registration is missing some required details. Enter them below to create the account.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {missingAdmissionFields(creatingFor).includes('date_of_birth') && (
                    <Input label="Date of Birth" type="date" value={accountForm.date_of_birth} onChange={e => setAccountForm({ ...accountForm, date_of_birth: e.target.value })} />
                  )}
                  {missingAdmissionFields(creatingFor).includes('guardian_name') && (
                    <Input label="Guardian Name" value={accountForm.guardian_name} onChange={e => setAccountForm({ ...accountForm, guardian_name: e.target.value })} />
                  )}
                  {missingAdmissionFields(creatingFor).includes('guardian_phone') && (
                    <Input label="Guardian Phone" value={accountForm.guardian_phone} onChange={e => setAccountForm({ ...accountForm, guardian_phone: e.target.value })} />
                  )}
                  {missingAdmissionFields(creatingFor).includes('email') && (
                    <Input label="Email" type="email" value={accountForm.email} onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} />
                  )}
                  {missingAdmissionFields(creatingFor).includes('phone') && (
                    <Input label="Phone" value={accountForm.phone} onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} />
                  )}
                  {missingAdmissionFields(creatingFor).includes('address') && (
                    <Input label="Address" value={accountForm.address} onChange={e => setAccountForm({ ...accountForm, address: e.target.value })} />
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Input label="Password" type="text" value={accountForm.password} onChange={e => setAccountForm({ ...accountForm, password: e.target.value })} placeholder="Set the student's initial password" className="flex-1" />
              <Button variant="outline" onClick={generatePassword} type="button">Generate</Button>
            </div>
            <p className="text-xs text-slate-500 -mt-2">The Student ID (e.g. EDU21{creatingFor.department_detail?.code ?? 'CSE'}-I{(accountForm.roll_number || '0').padStart(3, '0')}) is generated by the backend on save — this preview may differ slightly from the final ID.</p>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleCreateAccount} disabled={creatingAccount}>{creatingAccount ? 'Creating…' : 'Create Account'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setCreatingFor(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Student directly -- Priority 14, Staff-direct flow (no Admission required). Result is pending Admin approval. */}
      <Modal open={addingStudent} onClose={() => setAddingStudent(false)} title="Add Student" size="lg">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 -mt-2">Creates the Student record and login account together. The account stays <strong>pending Admin approval</strong> and cannot log in until approved.</p>
          {newStudentError && <Alert type="error">{newStudentError}</Alert>}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="First Name" value={newStudentForm.first_name} onChange={e => setNewStudentForm({ ...newStudentForm, first_name: e.target.value })} />
            <Input label="Last Name" value={newStudentForm.last_name} onChange={e => setNewStudentForm({ ...newStudentForm, last_name: e.target.value })} />
            <Input label="Email" type="email" value={newStudentForm.email} onChange={e => setNewStudentForm({ ...newStudentForm, email: e.target.value })} />
            <Input label="Phone" value={newStudentForm.phone} onChange={e => setNewStudentForm({ ...newStudentForm, phone: e.target.value })} />
            <Input label="Date of Birth" type="date" value={newStudentForm.date_of_birth} onChange={e => setNewStudentForm({ ...newStudentForm, date_of_birth: e.target.value })} />
            <Select label="Gender" value={newStudentForm.gender} onChange={e => setNewStudentForm({ ...newStudentForm, gender: e.target.value as 'male' | 'female' | 'other' })}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
            <Input label="Guardian Name" value={newStudentForm.guardian_name} onChange={e => setNewStudentForm({ ...newStudentForm, guardian_name: e.target.value })} />
            <Input label="Guardian Phone" value={newStudentForm.guardian_phone} onChange={e => setNewStudentForm({ ...newStudentForm, guardian_phone: e.target.value })} />
          </div>
          <Input label="Address" value={newStudentForm.address} onChange={e => setNewStudentForm({ ...newStudentForm, address: e.target.value })} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Department" value={newStudentForm.department} onChange={e => setNewStudentForm({ ...newStudentForm, department: e.target.value, course: '', semester: '' })}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Select label="Course" value={newStudentForm.course} onChange={e => setNewStudentForm({ ...newStudentForm, course: e.target.value, semester: '' })} disabled={!newStudentForm.department}>
              <option value="">Select course</option>
              {coursesForDept(newStudentForm.department).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Semester" value={newStudentForm.semester} onChange={e => setNewStudentForm({ ...newStudentForm, semester: e.target.value })} disabled={!newStudentForm.course}>
              <option value="">Select semester</option>
              {semestersForCourse(newStudentForm.course).map(s => <option key={s.id} value={s.id}>{s.name || `Semester ${s.semester_number}`}</option>)}
            </Select>
            <Input label="Current Semester (#)" type="number" min={1} value={newStudentForm.current_semester} onChange={e => setNewStudentForm({ ...newStudentForm, current_semester: e.target.value })} />
            <Input label="Roll Number" value={newStudentForm.roll_number} onChange={e => setNewStudentForm({ ...newStudentForm, roll_number: e.target.value })} placeholder="Used to generate the Student ID" />
            <Input label="Registration Number (optional)" value={newStudentForm.registration_number} onChange={e => setNewStudentForm({ ...newStudentForm, registration_number: e.target.value })} />
          </div>
          <div className="flex gap-2 items-end">
            <Input label="Password" type="text" value={newStudentForm.password} onChange={e => setNewStudentForm({ ...newStudentForm, password: e.target.value })} placeholder="Set the student's initial password" className="flex-1" />
            <Button variant="outline" onClick={generateNewStudentPassword} type="button">Generate</Button>
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreateStudentDirect} disabled={creatingStudent}>{creatingStudent ? 'Creating…' : 'Create Student + Account'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setAddingStudent(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!justCreated} onClose={() => setJustCreated(null)} title="Account Created">
        {justCreated && (
          <div className="flex flex-col gap-4">
            <Alert type="success">Login account created for {justCreated.student.user.first_name} {justCreated.student.user.last_name}.</Alert>
            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Student ID</span><span className="font-mono font-semibold text-slate-900">{justCreated.student.student_id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Password</span><span className="font-mono font-semibold text-slate-900">{justCreated.password}</span></div>
            </div>
            <p className="text-xs text-slate-500">Share these credentials with the student now — the password is shown only this once and is not retrievable later.</p>
            <Button onClick={() => setJustCreated(null)}>Done</Button>
          </div>
        )}
      </Modal>

      {/* Reset Password */}
      <Modal open={!!resettingFor} onClose={() => setResettingFor(null)} title="Reset Student Password">
        {resettingFor && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 -mt-2">{studentName(resettingFor)} · {resettingFor.student_id}</p>
            {resetError && <Alert type="error">{resetError}</Alert>}
            <Input label="New Password" type="text" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Minimum 6 characters" />
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleResetPassword} disabled={resettingPw}>{resettingPw ? 'Saving…' : 'Update Password'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setResettingFor(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function TeacherMgmt({ notify }: { notify: (msg: string) => void }) {
  const [teachers, setTeachers] = useState<ApiTeacher[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const emptyForm = {
    first_name: '', last_name: '', password: '', department: '', employee_id: '',
    designation: '', qualification: '', specialization: '', experience_years: '0',
    phone: '', email: '', address: '', joining_date: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [viewing, setViewing] = useState<ApiTeacher | null>(null)
  const [editing, setEditing] = useState<ApiTeacher | null>(null)
  const [editForm, setEditForm] = useState({
    department: '', designation: '', qualification: '', specialization: '',
    experience_years: '0', phone: '', email: '', address: '', joining_date: '', is_active: true,
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [resettingFor, setResettingFor] = useState<ApiTeacher | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resettingPw, setResettingPw] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  useEffect(() => { lookupApi.getDepartments().then(setDepartments).catch(() => {}) }, [])

  async function fetchTeachers() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await teacherApi.getTeachers({
        search: search || undefined,
        department: deptFilter || undefined,
        page_size: 100,
        ordering: 'employee_id',
      })
      setTeachers(res.results)
      setCount(res.count)
    } catch (err) {
      setTeachers([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load teachers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { fetchTeachers() }, search ? 350 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, deptFilter])

  function teacherName(t: ApiTeacher) {
    const full = `${t.user.first_name} ${t.user.last_name}`.trim()
    return full || t.user.username
  }

  async function handleCreate() {
    if (!form.first_name.trim()) { setCreateError('First name is required.'); return }
    if (!form.employee_id.trim()) { setCreateError('Employee ID is required.'); return }
    if (!form.department) { setCreateError('Please select a department.'); return }
    if (form.password.length < 6) { setCreateError('Password must be at least 6 characters.'); return }

    setCreating(true)
    setCreateError(null)
    try {
      await teacherApi.createTeacher({
        user_details: { first_name: form.first_name.trim(), last_name: form.last_name.trim(), password: form.password },
        department: form.department,
        employee_id: form.employee_id.trim(),
        designation: form.designation,
        qualification: form.qualification,
        specialization: form.specialization,
        experience_years: Number(form.experience_years) || 0,
        phone: form.phone,
        email: form.email,
        address: form.address,
        joining_date: form.joining_date,
      })
      notify(`${form.first_name} ${form.last_name} added successfully. Login: ${form.employee_id}`)
      setForm(emptyForm)
      setShowAdd(false)
      await fetchTeachers()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create teacher.')
    } finally {
      setCreating(false)
    }
  }

  function openEdit(t: ApiTeacher) {
    setEditError(null)
    setEditing(t)
    setEditForm({
      department: t.department, designation: t.designation, qualification: t.qualification,
      specialization: t.specialization, experience_years: String(t.experience_years),
      phone: t.phone, email: t.email, address: t.address, joining_date: t.joining_date, is_active: t.is_active,
    })
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSavingEdit(true)
    setEditError(null)
    try {
      await teacherApi.updateTeacher(editing.id, {
        department: editForm.department, designation: editForm.designation, qualification: editForm.qualification,
        specialization: editForm.specialization, experience_years: Number(editForm.experience_years) || 0,
        phone: editForm.phone, email: editForm.email, address: editForm.address,
        joining_date: editForm.joining_date, is_active: editForm.is_active,
      })
      notify(`${teacherName(editing)} updated successfully`)
      setEditing(null)
      await fetchTeachers()
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Failed to update teacher.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleToggleActive(t: ApiTeacher) {
    setTogglingId(t.id)
    try {
      await teacherApi.updateTeacher(t.id, { is_active: !t.is_active })
      notify(`${teacherName(t)} ${t.is_active ? 'deactivated' : 'activated'} successfully`)
      await fetchTeachers()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update teacher status.')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleResetPassword() {
    if (!resettingFor) return
    if (resetPassword.length < 6) { setResetError('Password must be at least 6 characters.'); return }
    setResettingPw(true)
    setResetError(null)
    try {
      await teacherApi.setPassword(resettingFor.id, resetPassword)
      notify(`Password updated for ${teacherName(resettingFor)}`)
      setResettingFor(null)
      setResetPassword('')
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : 'Failed to reset password.')
    } finally {
      setResettingPw(false)
    }
  }

  return (
    <div>
      <PageHeader title="Teacher Management" subtitle={loading ? 'Loading teachers…' : `${count} teacher${count === 1 ? '' : 's'} total`}
        actions={<Button size="sm" onClick={() => { setCreateError(null); setForm(emptyForm); setShowAdd(true) }}>+ Add Teacher</Button>} />

      <Card className="mb-4">
        <div className="flex gap-3 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name or employee ID..." className="flex-1 min-w-48" />
          <Select className="w-48" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
      </Card>

      {loadError && (
        <div className="mb-4">
          <Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={() => fetchTeachers()}>Retry</button></Alert>
        </div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading teachers…</p></Card>
      ) : !loadError && teachers.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No teachers found{search || deptFilter ? ' for these filters' : ''}.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'employee_id', header: 'Employee ID', render: r => <span className="font-mono text-xs">{(r as unknown as ApiTeacher).employee_id}</span> },
              { key: 'name', header: 'Name', render: r => teacherName(r as unknown as ApiTeacher) },
              { key: 'dept', header: 'Dept', render: r => (r as unknown as ApiTeacher).department },
              { key: 'designation', header: 'Designation' },
              { key: 'experience_years', header: 'Experience', render: r => `${(r as unknown as ApiTeacher).experience_years} yrs` },
              { key: 'status', header: 'Status', render: r => <Badge variant={(r as unknown as ApiTeacher).is_active ? 'green' : 'red'}>{(r as unknown as ApiTeacher).is_active ? 'Active' : 'Inactive'}</Badge> },
              { key: 'actions', header: 'Actions', render: r => {
                const t = r as unknown as ApiTeacher
                return (
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(t)}>View</Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setResetError(null); setResetPassword(''); setResettingFor(t) }}>Reset Password</Button>
                    <Button size="sm" variant="ghost" disabled={togglingId === t.id} onClick={() => handleToggleActive(t)} className={t.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}>
                      {togglingId === t.id ? '…' : t.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                )
              } },
            ]}
            data={teachers as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Teacher" size="lg">
        <div className="flex flex-col gap-4">
          {createError && <Alert type="error">{createError}</Alert>}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="First Name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Last Name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            <Input label="Employee ID (login username)" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} placeholder="EMP-CSE-014" />
            <Select label="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Input label="Designation" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="Assistant Professor" />
            <Input label="Qualification" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="Ph.D." />
            <Input label="Specialization" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} />
            <Input label="Experience (years)" type="number" min={0} value={form.experience_years} onChange={e => setForm({ ...form, experience_years: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="Joining Date" type="date" value={form.joining_date} onChange={e => setForm({ ...form, joining_date: e.target.value })} />
          </div>
          <Input label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <Input label="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Minimum 6 characters" />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={creating}>{creating ? 'Creating…' : 'Create Teacher'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Teacher Details">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Employee ID</span><span className="font-medium text-slate-900 font-mono">{viewing.employee_id}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{teacherName(viewing)}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Department</span><span className="font-medium text-slate-900">{viewing.department}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Designation</span><span className="font-medium text-slate-900">{viewing.designation}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Qualification</span><span className="font-medium text-slate-900">{viewing.qualification}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Specialization</span><span className="font-medium text-slate-900">{viewing.specialization}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Experience</span><span className="font-medium text-slate-900">{viewing.experience_years} yrs</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Phone</span><span className="font-medium text-slate-900">{viewing.phone}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Email</span><span className="font-medium text-slate-900">{viewing.email}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Joining Date</span><span className="font-medium text-slate-900">{viewing.joining_date}</span></div>
            <div className="flex justify-between pb-2"><span className="text-slate-500">Status</span><Badge variant={viewing.is_active ? 'green' : 'red'}>{viewing.is_active ? 'Active' : 'Inactive'}</Badge></div>
            <Button variant="outline" className="mt-2" onClick={() => setViewing(null)}>Close</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Teacher" size="lg">
        {editing && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 -mt-2">{teacherName(editing)} · {editing.employee_id}</p>
            {editError && <Alert type="error">{editError}</Alert>}
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Department" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })}>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <Input label="Designation" value={editForm.designation} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} />
              <Input label="Qualification" value={editForm.qualification} onChange={e => setEditForm({ ...editForm, qualification: e.target.value })} />
              <Input label="Specialization" value={editForm.specialization} onChange={e => setEditForm({ ...editForm, specialization: e.target.value })} />
              <Input label="Experience (years)" type="number" min={0} value={editForm.experience_years} onChange={e => setEditForm({ ...editForm, experience_years: e.target.value })} />
              <Input label="Phone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              <Input label="Email" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
              <Input label="Joining Date" type="date" value={editForm.joining_date} onChange={e => setEditForm({ ...editForm, joining_date: e.target.value })} />
            </div>
            <Input label="Address" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
            <Select label="Status" value={editForm.is_active ? 'Active' : 'Inactive'} onChange={e => setEditForm({ ...editForm, is_active: e.target.value === 'Active' })}>
              <option>Active</option><option>Inactive</option>
            </Select>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!resettingFor} onClose={() => setResettingFor(null)} title="Reset Teacher Password">
        {resettingFor && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 -mt-2">{teacherName(resettingFor)} · {resettingFor.employee_id}</p>
            {resetError && <Alert type="error">{resetError}</Alert>}
            <Input label="New Password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Minimum 6 characters" />
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleResetPassword} disabled={resettingPw}>{resettingPw ? 'Saving…' : 'Update Password'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setResettingFor(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function AdmissionMgmt({ notify }: { notify: (msg: string) => void }) {
  const [admissions, setAdmissions] = useState<ApiAdmission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const navigate = useNavigate()

  async function fetchAdmissions() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await admissionApi.getAdmissions({
        search: search || undefined,
        admission_status: statusFilter || undefined,
        page_size: 100,
        ordering: 'application_number',
      })
      setAdmissions(res.results)
    } catch (err) {
      setAdmissions([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load registrations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { fetchAdmissions() }, search ? 350 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter])

  async function setStatus(a: ApiAdmission, admission_status: 'approved' | 'rejected') {
    if (admission_status === 'rejected' && !window.confirm(`Reject ${a.full_name}'s application?`)) return
    setUpdatingId(a.id)
    try {
      await admissionApi.updateAdmission(a.id, { admission_status })
      notify(`${a.full_name}'s application ${admission_status}`)
      await fetchAdmissions()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update application.')
    } finally {
      setUpdatingId(null)
    }
  }

  const pending = admissions.filter(a => a.admission_status === 'pending').length
  const approved = admissions.filter(a => a.admission_status === 'approved').length
  const rejected = admissions.filter(a => a.admission_status === 'rejected').length

  return (
    <div>
      <PageHeader title="Admission Management" subtitle="Registrations submitted by Admin, reviewed here by Staff"
        actions={<Button size="sm" variant="secondary" onClick={() => downloadCsv('admissions.csv', admissions as unknown as Record<string, unknown>[])}>Export</Button>} />
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[[String(admissions.length), 'Total Applications'], [String(pending), 'Pending Review'], [String(approved), 'Approved'], [String(rejected), 'Rejected']].map(([v, l]) => (
          <Card key={l} className="text-center p-4"><div className="text-2xl font-bold text-slate-900 font-display">{v}</div><div className="text-xs text-slate-500 mt-0.5">{l}</div></Card>
        ))}
      </div>
      <Card className="mb-4">
        <div className="flex gap-3 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by applicant name or app number..." className="flex-1 min-w-48" />
          <Select className="w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </Card>

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={() => fetchAdmissions()}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading registrations…</p></Card>
      ) : !loadError && admissions.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No registrations found. New applications appear here once Admin submits the registration form.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'application_number', header: 'App ID' },
              { key: 'full_name', header: 'Applicant' },
              { key: 'dept', header: 'Department', render: r => (r as unknown as ApiAdmission).department_detail?.name ?? '—' },
              { key: 'admission_date', header: 'Applied On' },
              { key: 'account', header: 'Account', render: r => {
                const a = r as unknown as ApiAdmission
                return a.account_created
                  ? <Badge variant="green">Created</Badge>
                  : <Badge variant="slate">Not Created</Badge>
              } },
              { key: 'status', header: 'Status', render: r => {
                const st = (r as unknown as ApiAdmission).admission_status
                return <Badge variant={st === 'approved' ? 'green' : st === 'rejected' ? 'red' : 'yellow'}>{st}</Badge>
              } },
              { key: 'actions', header: 'Action', render: r => {
                const a = r as unknown as ApiAdmission
                if (a.admission_status !== 'pending') {
                  return a.admission_status === 'approved' && !a.account_created
                    ? <Button size="sm" variant="ghost" onClick={() => navigate('/staff/students')}>Go to Student Mgmt</Button>
                    : null
                }
                return (
                  <div className="flex gap-1">
                    <Button size="sm" disabled={updatingId === a.id} onClick={() => setStatus(a, 'approved')}>Approve</Button>
                    <Button size="sm" variant="danger" disabled={updatingId === a.id} onClick={() => setStatus(a, 'rejected')}>Reject</Button>
                  </div>
                )
              } },
            ]}
            data={admissions as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}
    </div>
  )
}

function HODMgmt({ notify }: { notify: (msg: string) => void }) {
  const [hods, setHods] = useState<ApiHOD[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [teachers, setTeachers] = useState<ApiTeacher[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])

  const [showAdd, setShowAdd] = useState(false)
  const emptyForm = { teacher: '', office_phone: '', office_location: '', appointment_date: '' }
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editing, setEditing] = useState<ApiHOD | null>(null)
  const [editForm, setEditForm] = useState({ office_phone: '', office_location: '', appointment_date: '', is_active: true })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [resettingFor, setResettingFor] = useState<ApiHOD | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resettingPw, setResettingPw] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  useEffect(() => {
    lookupApi.getDepartments().then(setDepartments).catch(() => {})
    teacherApi.getTeachers({ page_size: 200, ordering: 'employee_id' }).then(res => setTeachers(res.results)).catch(() => {})
  }, [])

  async function fetchHods() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await hodApi.getHODs({ search: search || undefined, page_size: 100 })
      setHods(res.results)
    } catch (err) {
      setHods([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load HODs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { fetchHods() }, search ? 350 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function hodName(h: ApiHOD) {
    const u = h.teacher_detail?.user
    const full = u ? `${u.first_name} ${u.last_name}`.trim() : ''
    return full || u?.username || '—'
  }

  const availableTeachers = teachers.filter(t => !hods.some(h => h.teacher === t.id))
  const selectedTeacher = teachers.find(t => t.id === form.teacher)

  async function handleCreate() {
    if (!form.teacher) { setCreateError('Please select a teacher to promote to HOD.'); return }
    if (!selectedTeacher) { setCreateError('Selected teacher not found.'); return }
    setCreating(true)
    setCreateError(null)
    try {
      await hodApi.createHOD({
        teacher: form.teacher,
        department: selectedTeacher.department,
        office_phone: form.office_phone,
        office_location: form.office_location,
        appointment_date: form.appointment_date,
      })
      notify(`${selectedTeacher.user.first_name} ${selectedTeacher.user.last_name} assigned as HOD`)
      setForm(emptyForm)
      setShowAdd(false)
      await fetchHods()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to assign HOD.')
    } finally {
      setCreating(false)
    }
  }

  function openEdit(h: ApiHOD) {
    setEditError(null)
    setEditing(h)
    setEditForm({ office_phone: h.office_phone, office_location: h.office_location, appointment_date: h.appointment_date, is_active: h.is_active })
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSavingEdit(true)
    setEditError(null)
    try {
      await hodApi.updateHOD(editing.id, editForm)
      notify(`${hodName(editing)} updated successfully`)
      setEditing(null)
      await fetchHods()
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Failed to update HOD.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleToggleActive(h: ApiHOD) {
    setTogglingId(h.id)
    try {
      await hodApi.updateHOD(h.id, { is_active: !h.is_active })
      notify(`${hodName(h)} ${h.is_active ? 'deactivated' : 'activated'} successfully`)
      await fetchHods()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update HOD status.')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleResetPassword() {
    if (!resettingFor) return
    if (resetPassword.length < 6) { setResetError('Password must be at least 6 characters.'); return }
    setResettingPw(true)
    setResetError(null)
    try {
      await hodApi.setPassword(resettingFor.id, resetPassword)
      notify(`Password updated for ${hodName(resettingFor)}`)
      setResettingFor(null)
      setResetPassword('')
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : 'Failed to reset password.')
    } finally {
      setResettingPw(false)
    }
  }

  return (
    <div>
      <PageHeader title="HOD Management" subtitle={loading ? 'Loading HODs…' : `${hods.length} HOD${hods.length === 1 ? '' : 's'}`}
        actions={<Button size="sm" onClick={() => { setCreateError(null); setForm(emptyForm); setShowAdd(true) }}>+ Assign HOD</Button>} />

      <Card className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search HODs..." className="min-w-48" />
      </Card>

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={() => fetchHods()}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading HODs…</p></Card>
      ) : !loadError && hods.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No HODs assigned yet.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'name', header: 'Name', render: r => hodName(r as unknown as ApiHOD) },
              { key: 'employee_id', header: 'Employee ID', render: r => <span className="font-mono text-xs">{(r as unknown as ApiHOD).teacher_detail?.employee_id}</span> },
              { key: 'dept', header: 'Department', render: r => (r as unknown as ApiHOD).department_detail?.name ?? '—' },
              { key: 'office_location', header: 'Office' },
              { key: 'status', header: 'Status', render: r => <Badge variant={(r as unknown as ApiHOD).is_active ? 'green' : 'red'}>{(r as unknown as ApiHOD).is_active ? 'Active' : 'Inactive'}</Badge> },
              { key: 'actions', header: 'Actions', render: r => {
                const h = r as unknown as ApiHOD
                return (
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(h)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setResetError(null); setResetPassword(''); setResettingFor(h) }}>Reset Password</Button>
                    <Button size="sm" variant="ghost" disabled={togglingId === h.id} onClick={() => handleToggleActive(h)} className={h.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}>
                      {togglingId === h.id ? '…' : h.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                )
              } },
            ]}
            data={hods as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Assign HOD" size="lg">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-500">An HOD is promoted from an existing Teacher. Their existing login is reused (role changes to HOD) — a new account is not created.</p>
          {createError && <Alert type="error">{createError}</Alert>}
          <Select label="Teacher" value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })}>
            <option value="">Select teacher</option>
            {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.user.first_name} {t.user.last_name} — {t.employee_id} ({t.department})</option>)}
          </Select>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Office Phone" value={form.office_phone} onChange={e => setForm({ ...form, office_phone: e.target.value })} />
            <Input label="Office Location" value={form.office_location} onChange={e => setForm({ ...form, office_location: e.target.value })} />
            <Input label="Appointment Date" type="date" value={form.appointment_date} onChange={e => setForm({ ...form, appointment_date: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={creating}>{creating ? 'Assigning…' : 'Assign HOD'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit HOD" size="lg">
        {editing && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 -mt-2">{hodName(editing)} · {editing.teacher_detail?.employee_id}</p>
            {editError && <Alert type="error">{editError}</Alert>}
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Office Phone" value={editForm.office_phone} onChange={e => setEditForm({ ...editForm, office_phone: e.target.value })} />
              <Input label="Office Location" value={editForm.office_location} onChange={e => setEditForm({ ...editForm, office_location: e.target.value })} />
              <Input label="Appointment Date" type="date" value={editForm.appointment_date} onChange={e => setEditForm({ ...editForm, appointment_date: e.target.value })} />
            </div>
            <Select label="Status" value={editForm.is_active ? 'Active' : 'Inactive'} onChange={e => setEditForm({ ...editForm, is_active: e.target.value === 'Active' })}>
              <option>Active</option><option>Inactive</option>
            </Select>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!resettingFor} onClose={() => setResettingFor(null)} title="Reset HOD Password">
        {resettingFor && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 -mt-2">{hodName(resettingFor)}</p>
            {resetError && <Alert type="error">{resetError}</Alert>}
            <Input label="New Password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Minimum 6 characters" />
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleResetPassword} disabled={resettingPw}>{resettingPw ? 'Saving…' : 'Update Password'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setResettingFor(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}


function FeeMgmt({ notify }: { notify: (msg: string) => void }) {
  const [rows, setRows] = useState<AdminFeeSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [students, setStudents] = useState<ApiStudent[]>([])
  const [structures, setStructures] = useState<ApiFeeStructure[]>([])
  const [showIssue, setShowIssue] = useState(false)
  const [form, setForm] = useState({ student: '', fee_structure: '', payment_date: new Date().toISOString().slice(0, 10), remarks: '' })
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await financeApi.getAdminFeeSummary()
      setRows(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load fee records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function openIssue() {
    setIssueError(null)
    setShowIssue(true)
    try {
      // Reuses the same student-list query shape already proven to work
      // elsewhere in this dashboard (page_size 100 + ordering), rather than
      // the bare page_size=200 call that has been seen to 500.
      const [studentsRes, structuresRes] = await Promise.all([
        studentApi.getStudents({ page_size: 100, ordering: 'admission_number' }),
        financeApi.getFeeStructures({ is_active: true, page_size: 100 }),
      ])
      setStudents(studentsRes.results)
      setStructures(structuresRes.results)
    } catch (err) {
      setIssueError(err instanceof ApiError ? err.message : 'Failed to load students/fee structures.')
    }
  }

  async function handleIssue() {
    if (!form.student) { setIssueError('Please select a student.'); return }
    if (!form.fee_structure) { setIssueError('Please select a fee structure.'); return }
    setIssuing(true)
    setIssueError(null)
    try {
      await financeApi.issueFee({
        student: form.student,
        fee_structure: form.fee_structure,
        payment_date: form.payment_date,
        remarks: form.remarks || undefined,
      })
      notify('Fee issued to student')
      setShowIssue(false)
      setForm({ student: '', fee_structure: '', payment_date: new Date().toISOString().slice(0, 10), remarks: '' })
      load()
    } catch (err) {
      setIssueError(err instanceof ApiError ? err.message : 'Failed to issue fee.')
    } finally {
      setIssuing(false)
    }
  }

  const statusVariant: Record<string, 'green' | 'red' | 'yellow'> = { cleared: 'green', overdue: 'red', partial: 'yellow' }

  return (
    <div>
      <PageHeader title="Fee Management" subtitle="Real-time fee status from Finance records"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={openIssue}>+ Issue Fee</Button>
            <Button size="sm" variant="outline" disabled={loading || rows.length === 0} onClick={() => { downloadCsv('fee-report.csv', rows as unknown as Record<string, unknown>[]); notify('Fee report generated') }}>Generate Report</Button>
          </div>
        } />
      <Card padding={false}>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading fee records…</div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <Button size="sm" onClick={load}>Retry</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No fee records found.</div>
        ) : (
          <Table
            columns={[
              { key: 'admission_number', header: 'Student ID' },
              { key: 'name', header: 'Name' },
              { key: 'total', header: 'Total (₹)', render: r => `₹${Number(r.total).toLocaleString()}` },
              { key: 'paid', header: 'Paid (₹)', render: r => <span className="text-emerald-600 font-medium">₹{Number(r.paid).toLocaleString()}</span> },
              { key: 'pending', header: 'Pending (₹)', render: r => Number(r.pending) > 0 ? <span className="text-red-500 font-medium">₹{Number(r.pending).toLocaleString()}</span> : <span className="text-emerald-600">—</span> },
              { key: 'status', header: 'Status', render: r => <Badge variant={statusVariant[String(r.status)] ?? 'yellow'}>{String(r.status)}</Badge> },
            ]}
            data={rows as unknown as Record<string, unknown>[]}
          />
        )}
      </Card>

      <Modal open={showIssue} onClose={() => setShowIssue(false)} title="Issue Fee">
        <div className="flex flex-col gap-4">
          {issueError && <Alert type="error">{issueError}</Alert>}
          <Select label="Student" value={form.student} onChange={e => setForm({ ...form, student: e.target.value })}>
            <option value="">Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.user.first_name} {s.user.last_name} — {s.admission_number}</option>)}
          </Select>
          <Select label="Fee Structure" value={form.fee_structure} onChange={e => setForm({ ...form, fee_structure: e.target.value })}>
            <option value="">Select fee structure</option>
            {structures.map(f => <option key={f.id} value={f.id}>{f.fee_type_display} — Semester {f.semester_number} — ₹{Number(f.total_fee).toLocaleString()}</option>)}
          </Select>
          <Input label="Due Date" type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
          <Input label="Remarks (optional)" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="e.g. Semester 3 tuition" />
          <p className="text-xs text-slate-500">This assigns the fee as due (₹0 paid, pending) — it does not record a payment.</p>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleIssue} disabled={issuing}>{issuing ? 'Issuing…' : 'Issue Fee'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowIssue(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function CertificateMgmt({ notify }: { notify: (msg: string) => void }) {
  const [certs, setCerts] = useState<ApiCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const [students, setStudents] = useState<ApiStudent[]>([])
  const [showIssue, setShowIssue] = useState(false)
  const [form, setForm] = useState<{ student: string; certificate_type: ApiCertificateType }>({ student: '', certificate_type: 'bonafide' })
  const [creating, setCreating] = useState(false)
  const [issueError, setIssueError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<ApiCertificate | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await certificateApi.getCertificates({ page_size: 100, ordering: '-requested_at' })
      setCerts(res.results)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load certificates.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function openIssue() {
    setIssueError(null)
    setShowIssue(true)
    try {
      // Same proven-safe student-list query shape used elsewhere in this
      // dashboard (page_size 100 + ordering) rather than the bare
      // page_size=200 call.
      const res = await studentApi.getStudents({ page_size: 100, ordering: 'admission_number' })
      setStudents(res.results)
    } catch (err) {
      setIssueError(err instanceof ApiError ? err.message : 'Failed to load students.')
    }
  }

  async function handleIssue() {
    if (!form.student) { setIssueError('Please select a student.'); return }
    setCreating(true)
    setIssueError(null)
    try {
      const created = await certificateApi.createCertificate({ student: form.student, certificate_type: form.certificate_type })
      notify(`${created.student_name ?? 'Certificate'} — ${created.certificate_number} created`)
      setShowIssue(false)
      setForm({ student: '', certificate_type: 'bonafide' })
      load()
    } catch (err) {
      setIssueError(err instanceof ApiError ? err.message : 'Failed to create certificate.')
    } finally {
      setCreating(false)
    }
  }

  async function handlePrintIssue(cert: ApiCertificate) {
    setActingId(cert.id)
    try {
      const updated = await certificateApi.printIssue(cert.id)
      setCerts(prev => prev.map(c => (c.id === cert.id ? updated : c)))
      notify(`${cert.student_name ?? 'Certificate'}'s certificate printed & issued`)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to issue certificate.')
    } finally {
      setActingId(null)
    }
  }

  async function handleDownload(cert: ApiCertificate) {
    try {
      await certificateApi.download(cert.id, `${cert.certificate_number}.html`)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to download certificate.')
    }
  }

  return (
    <div>
      <PageHeader title="Certificate Management" actions={<Button size="sm" onClick={openIssue}>+ Issue Certificate</Button>} />
      <Card padding={false}>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading certificates…</div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <Button size="sm" onClick={load}>Retry</Button>
          </div>
        ) : certs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No certificates found.</div>
        ) : (
          <Table
            columns={[
              { key: 'certificate_number', header: 'Cert ID' },
              { key: 'student_name', header: 'Student', render: r => String(r.student_name ?? '—') },
              { key: 'certificate_type_display', header: 'Certificate Type', render: r => String(r.certificate_type_display ?? r.certificate_type) },
              { key: 'requested_at', header: 'Requested On', render: r => new Date(String(r.requested_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
              { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'issued' ? 'green' : 'blue'}>{String(r.status_display ?? r.status)}</Badge> },
              {
                key: 'action', header: 'Action', render: r => (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(r as unknown as ApiCertificate)}>View</Button>
                    {r.status === 'ready' ? (
                      <Button size="sm" disabled={actingId === r.id} onClick={() => handlePrintIssue(r as unknown as ApiCertificate)}>Print & Issue</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleDownload(r as unknown as ApiCertificate)}>Download</Button>
                    )}
                  </div>
                )
              },
            ]}
            data={certs as unknown as Record<string, unknown>[]}
          />
        )}
      </Card>

      <Modal open={showIssue} onClose={() => setShowIssue(false)} title="Issue Certificate">
        <div className="flex flex-col gap-4">
          {issueError && <Alert type="error">{issueError}</Alert>}
          <Select label="Student" value={form.student} onChange={e => setForm({ ...form, student: e.target.value })}>
            <option value="">Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.user.first_name} {s.user.last_name} — {s.admission_number}</option>)}
          </Select>
          <Select label="Certificate Type" value={form.certificate_type} onChange={e => setForm({ ...form, certificate_type: e.target.value as ApiCertificateType })}>
            <option value="bonafide">Bonafide</option>
            <option value="character">Character</option>
            <option value="transcript">Transcripts</option>
            <option value="migration">Migration</option>
          </Select>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleIssue} disabled={creating}>{creating ? 'Creating…' : 'Create Certificate'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowIssue(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Certificate Details">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Cert ID</span><span className="font-medium text-slate-900">{viewing.certificate_number}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Student</span><span className="font-medium text-slate-900">{viewing.student_name ?? '—'} ({viewing.admission_number ?? '—'})</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Type</span><span className="font-medium text-slate-900">{viewing.certificate_type_display ?? viewing.certificate_type}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Requested On</span><span className="font-medium text-slate-900">{new Date(viewing.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Issued Date</span><span className="font-medium text-slate-900">{viewing.issued_date ?? '—'}</span></div>
            <div className="flex justify-between pb-2"><span className="text-slate-500">Status</span><Badge variant={viewing.status === 'issued' ? 'green' : 'blue'}>{viewing.status_display ?? viewing.status}</Badge></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setViewing(null)}>Close</Button>
              <Button className="flex-1" onClick={() => handleDownload(viewing)}>Download</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function ScholarshipMgmt({ notify }: { notify: (msg: string) => void }) {
  const [rows, setRows] = useState<ApiScholarshipApplication[]>([])
  const [scholarships, setScholarships] = useState<ApiScholarship[]>([])
  const [scholarshipMap, setScholarshipMap] = useState<Record<string, ApiScholarship>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const [students, setStudents] = useState<ApiStudent[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', scholarship_type: 'merit', provider: '', description: '', eligibility_criteria: '', amount: '', application_deadline: '' })
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [showAssign, setShowAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({ scholarship: '', student: '', remarks: '' })
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [appsRes, schRes] = await Promise.all([
        scholarshipApi.getAllApplications({ page_size: 200, ordering: '-applied_at' }),
        scholarshipApi.getScholarships({ page_size: 200 }),
      ])
      setRows(appsRes.results)
      setScholarships(schRes.results)
      const map: Record<string, ApiScholarship> = {}
      for (const s of schRes.results) map[s.id] = s
      setScholarshipMap(map)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load scholarship applications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function setStatus(app: ApiScholarshipApplication, status: 'approved' | 'rejected') {
    setActingId(app.id)
    try {
      const updated = await scholarshipApi.updateApplicationStatus(app.id, { status })
      setRows(prev => prev.map(r => (r.id === app.id ? updated : r)))
      notify(`${app.student_name ?? 'Application'}'s scholarship ${status}`)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update application.')
    } finally {
      setActingId(null)
    }
  }

  async function handleAddScholarship() {
    if (!addForm.name.trim() || !addForm.amount || !addForm.application_deadline) {
      setAddError('Name, amount, and application deadline are required.')
      return
    }
    setAddSaving(true)
    setAddError(null)
    try {
      await scholarshipApi.createScholarship({ ...addForm, is_active: true })
      notify(`${addForm.name} scholarship added`)
      setShowAdd(false)
      setAddForm({ name: '', scholarship_type: 'merit', provider: '', description: '', eligibility_criteria: '', amount: '', application_deadline: '' })
      load()
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Failed to add scholarship.')
    } finally {
      setAddSaving(false)
    }
  }

  async function openAssign() {
    setAssignError(null)
    setShowAssign(true)
    if (students.length === 0) {
      try {
        // Same proven-safe student-list query shape used elsewhere in this
        // dashboard (page_size 100 + ordering) rather than the bare
        // page_size=200 call.
        const res = await studentApi.getStudents({ page_size: 100, ordering: 'admission_number' })
        setStudents(res.results)
      } catch (err) {
        setAssignError(err instanceof ApiError ? err.message : 'Failed to load students.')
      }
    }
  }

  async function handleAssign() {
    if (!assignForm.scholarship) { setAssignError('Please select a scholarship.'); return }
    if (!assignForm.student) { setAssignError('Please select a student.'); return }
    setAssignSaving(true)
    setAssignError(null)
    try {
      await scholarshipApi.issueScholarship({ scholarship: assignForm.scholarship, student: assignForm.student, remarks: assignForm.remarks || undefined })
      notify('Scholarship issued to student')
      setShowAssign(false)
      setAssignForm({ scholarship: '', student: '', remarks: '' })
      load()
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : 'Failed to issue scholarship.')
    } finally {
      setAssignSaving(false)
    }
  }

  const statusVariant: Record<string, 'green' | 'red' | 'yellow'> = { approved: 'green', rejected: 'red', applied: 'yellow', under_review: 'yellow' }

  return (
    <div>
      <PageHeader title="Scholarship Management" subtitle="Scholarship Applications"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>+ Add Scholarship</Button>
            <Button size="sm" onClick={openAssign}>Issue Scholarship</Button>
          </div>
        } />
      <Card padding={false}>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading applications…</div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <Button size="sm" onClick={load}>Retry</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No scholarship applications found.</div>
        ) : (
          <Table
            columns={[
              { key: 'student_name', header: 'Student', render: r => String(r.student_name ?? '—') },
              { key: 'scholarship_name', header: 'Scheme', render: r => String(r.scholarship_name ?? '—') },
              { key: 'amount', header: 'Amount', render: r => { const sch = scholarshipMap[String(r.scholarship)]; return sch ? `₹${Number(sch.amount).toLocaleString()}` : '—' } },
              { key: 'status', header: 'Status', render: r => <Badge variant={statusVariant[String(r.status)] ?? 'yellow'}>{String(r.status)}</Badge> },
              {
                key: 'action', header: 'Action', render: r => (r.status === 'applied' || r.status === 'under_review') ? (
                  <div className="flex gap-1">
                    <Button size="sm" disabled={actingId === r.id} onClick={() => setStatus(r as unknown as ApiScholarshipApplication, 'approved')}>Approve</Button>
                    <Button size="sm" variant="danger" disabled={actingId === r.id} onClick={() => setStatus(r as unknown as ApiScholarshipApplication, 'rejected')}>Reject</Button>
                  </div>
                ) : null,
              },
            ]}
            data={rows as unknown as Record<string, unknown>[]}
          />
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Scholarship">
        <div className="flex flex-col gap-4">
          {addError && <Alert type="error">{addError}</Alert>}
          <Input label="Name" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="e.g. Merit Scholarship 2026" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Type" value={addForm.scholarship_type} onChange={e => setAddForm({ ...addForm, scholarship_type: e.target.value })}>
              <option value="merit">Merit</option>
              <option value="need_based">Need Based</option>
              <option value="sports">Sports</option>
              <option value="government">Government</option>
              <option value="private">Private</option>
            </Select>
            <Input label="Provider" value={addForm.provider} onChange={e => setAddForm({ ...addForm, provider: e.target.value })} placeholder="e.g. State Government" />
          </div>
          <Input label="Description" value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} />
          <Input label="Eligibility Criteria" value={addForm.eligibility_criteria} onChange={e => setAddForm({ ...addForm, eligibility_criteria: e.target.value })} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Amount (₹)" type="number" value={addForm.amount} onChange={e => setAddForm({ ...addForm, amount: e.target.value })} />
            <Input label="Application Deadline" type="date" value={addForm.application_deadline} onChange={e => setAddForm({ ...addForm, application_deadline: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleAddScholarship} disabled={addSaving}>{addSaving ? 'Saving…' : 'Add Scholarship'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Issue Scholarship">
        <div className="flex flex-col gap-4">
          {assignError && <Alert type="error">{assignError}</Alert>}
          <Select label="Scholarship" value={assignForm.scholarship} onChange={e => setAssignForm({ ...assignForm, scholarship: e.target.value })}>
            <option value="">Select scholarship</option>
            {scholarships.map(s => <option key={s.id} value={s.id}>{s.name} — ₹{Number(s.amount).toLocaleString()}</option>)}
          </Select>
          <Select label="Student" value={assignForm.student} onChange={e => setAssignForm({ ...assignForm, student: e.target.value })}>
            <option value="">Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.user.first_name} {s.user.last_name} — {s.admission_number}</option>)}
          </Select>
          <Input label="Remarks (optional)" value={assignForm.remarks} onChange={e => setAssignForm({ ...assignForm, remarks: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleAssign} disabled={assignSaving}>{assignSaving ? 'Issuing…' : 'Issue Scholarship'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAssign(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DocumentsMgmt({ notify }: { notify: (msg: string) => void }) {
  const [rows, setRows] = useState<ApiDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  // Priority 14 — mandatory-document overview across all students, so Staff
  // can see students who are Missing a required document entirely (a state
  // the raw document list below can't show, since a missing document has no
  // row at all).
  const [requiredOverview, setRequiredOverview] = useState<ApiRequiredDocumentStatus[]>([])
  const [requiredOverviewLoading, setRequiredOverviewLoading] = useState(true)
  const [requiredOverviewError, setRequiredOverviewError] = useState<string | null>(null)
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(true)

  async function fetchDocuments() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await documentsApi.getDocuments({ page_size: 100, ordering: '-requested_at' })
      setRows(res.results)
    } catch (err) {
      setRows([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchRequiredOverview() {
    setRequiredOverviewLoading(true)
    setRequiredOverviewError(null)
    try {
      const res = await documentsApi.getRequiredStatusAll()
      setRequiredOverview(res)
    } catch (err) {
      setRequiredOverview([])
      setRequiredOverviewError(err instanceof ApiError ? err.message : 'Failed to load mandatory-document overview.')
    } finally {
      setRequiredOverviewLoading(false)
    }
  }

  useEffect(() => { fetchDocuments(); fetchRequiredOverview() }, [])

  async function handleVerify(d: ApiDocument) {
    setVerifyingId(d.id)
    try {
      await documentsApi.verify(d.id)
      notify(`${d.student_name ?? 'Document'}'s document verified`)
      await fetchDocuments()
      if (REQUIRED_DOCUMENT_TYPE_SET.has(d.document_type)) await fetchRequiredOverview()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to verify document.')
    } finally {
      setVerifyingId(null)
    }
  }

  async function handleReject(d: ApiDocument) {
    setRejectingId(d.id)
    try {
      await documentsApi.reject(d.id)
      notify(`${d.student_name ?? 'Document'}'s document rejected`)
      await fetchDocuments()
      if (REQUIRED_DOCUMENT_TYPE_SET.has(d.document_type)) await fetchRequiredOverview()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to reject document.')
    } finally {
      setRejectingId(null)
    }
  }

  const incompleteStudents = requiredOverview.filter(s => !s.is_complete)
  const overviewRows = showIncompleteOnly ? incompleteStudents : requiredOverview

  return (
    <div>
      <PageHeader title="Documents" subtitle="Student document requests" />

      <Card className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h3 className="font-semibold text-slate-900 font-display">Mandatory Documents Overview</h3>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={showIncompleteOnly} onChange={e => setShowIncompleteOnly(e.target.checked)} />
            Show incomplete only
          </label>
        </div>
        <p className="text-xs text-slate-500 mb-4">Birth Certificate, SSLC Result Card &amp; Plus Two Result Card — Missing / Pending / Rejected / Verified per student.</p>
        {requiredOverviewError && (
          <Alert type="error">{requiredOverviewError} <button className="underline font-semibold ml-1" onClick={() => fetchRequiredOverview()}>Retry</button></Alert>
        )}
        {requiredOverviewLoading ? (
          <p className="text-sm text-slate-500 py-4">Loading mandatory-document overview…</p>
        ) : !requiredOverviewError && overviewRows.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">{showIncompleteOnly ? 'Every student has completed mandatory documents.' : 'No students found.'}</p>
        ) : !requiredOverviewError && (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                  {REQUIRED_DOCUMENT_TYPES.map(t => (
                    <th key={t} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {overviewRows.map(s => (
                  <tr key={s.student_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-slate-800">{s.student_name ?? '—'}</div>
                      {s.admission_number && <div className="text-xs text-slate-400">{s.admission_number}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={s.is_complete ? 'green' : 'yellow'}>{s.completed_count} / {s.total_required}</Badge>
                    </td>
                    {REQUIRED_DOCUMENT_TYPES.map(t => {
                      const item = s.documents.find(d => d.document_type === t)
                      const st = item?.status ?? 'missing'
                      return (
                        <td key={t} className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={st === 'verified' ? 'green' : st === 'rejected' ? 'red' : st === 'pending' ? 'yellow' : 'slate'}>
                            {st === 'verified' ? 'Verified' : st === 'rejected' ? 'Rejected' : st === 'pending' ? 'Pending' : 'Missing'}
                          </Badge>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {loadError && (
        <div className="mb-4">
          <Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={() => fetchDocuments()}>Retry</button></Alert>
        </div>
      )}
      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading documents…</p></Card>
      ) : !loadError && rows.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No document requests found.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'id', header: 'Doc ID', render: r => <span className="font-mono text-xs">{String((r as unknown as ApiDocument).id).slice(0, 8)}</span> },
              { key: 'student', header: 'Student', render: r => {
                const d = r as unknown as ApiDocument
                return <div><div>{d.student_name ?? '—'}</div>{d.admission_number && <div className="text-xs text-slate-400">{d.admission_number}</div>}</div>
              } },
              { key: 'document', header: 'Document', render: r => {
                const d = r as unknown as ApiDocument
                return (
                  <div className="flex items-center gap-1.5">
                    <span>{d.document_type}</span>
                    {REQUIRED_DOCUMENT_TYPE_SET.has(d.document_type) && <Badge variant="purple">Required</Badge>}
                  </div>
                )
              } },
              { key: 'file', header: 'File', render: r => {
                const url = (r as unknown as ApiDocument).file
                return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">View</a> : <span className="text-slate-400 text-sm">—</span>
              } },
              { key: 'requested', header: 'Requested On', render: r => new Date((r as unknown as ApiDocument).requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
              { key: 'status', header: 'Status', render: r => {
                const s = (r as unknown as ApiDocument).status
                return <Badge variant={s === 'verified' ? 'green' : s === 'rejected' ? 'red' : 'yellow'}>{s === 'verified' ? 'Verified' : s === 'rejected' ? 'Rejected' : 'Pending'}</Badge>
              } },
              { key: 'action', header: 'Action', render: r => {
                const d = r as unknown as ApiDocument
                return d.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button size="sm" disabled={verifyingId === d.id || rejectingId === d.id} onClick={() => handleVerify(d)}>{verifyingId === d.id ? 'Verifying…' : 'Verify'}</Button>
                    <Button size="sm" variant="secondary" disabled={verifyingId === d.id || rejectingId === d.id} onClick={() => handleReject(d)}>{rejectingId === d.id ? 'Rejecting…' : 'Reject'}</Button>
                  </div>
                ) : null
              } },
            ]}
            data={rows as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}
    </div>
  )
}

function ContactMgmt({ notify }: { notify: (msg: string) => void }) {
  const [rows, setRows] = useState<ApiContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)

  async function fetchMessages() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await contactApi.getMessages({ page_size: 100, ordering: '-created_at' })
      setRows(res.results)
    } catch (err) {
      setRows([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load contact messages.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchMessages() }, [])

  async function handleMarkRead(m: ApiContactMessage) {
    setMarkingId(m.id)
    try {
      await contactApi.markRead(m.id)
      await fetchMessages()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to mark message read.')
    } finally {
      setMarkingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Contact Messages" subtitle="Messages submitted through the public Contact form" />
      {loadError && (
        <div className="mb-4">
          <Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={() => fetchMessages()}>Retry</button></Alert>
        </div>
      )}
      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading messages…</p></Card>
      ) : !loadError && rows.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No contact messages found.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'name', header: 'Name', render: r => (r as unknown as ApiContactMessage).name },
              { key: 'email', header: 'Email', render: r => (r as unknown as ApiContactMessage).email },
              { key: 'phone', header: 'Phone', render: r => (r as unknown as ApiContactMessage).phone || '—' },
              { key: 'subject', header: 'Subject', render: r => (r as unknown as ApiContactMessage).subject },
              { key: 'message', header: 'Message', render: r => <span className="truncate max-w-xs block" title={(r as unknown as ApiContactMessage).message}>{(r as unknown as ApiContactMessage).message}</span> },
              { key: 'created_at', header: 'Submitted', render: r => new Date((r as unknown as ApiContactMessage).created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) },
              { key: 'status', header: 'Status', render: r => {
                const m = r as unknown as ApiContactMessage
                return <Badge variant={m.is_read ? 'green' : 'yellow'}>{m.is_read ? 'Read' : 'Unread'}</Badge>
              } },
              { key: 'action', header: 'Action', render: r => {
                const m = r as unknown as ApiContactMessage
                return !m.is_read ? (
                  <Button size="sm" disabled={markingId === m.id} onClick={() => handleMarkRead(m)}>{markingId === m.id ? 'Marking…' : 'Mark Read'}</Button>
                ) : null
              } },
            ]}
            data={rows as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}
    </div>
  )
}

function NotificationsMgmt({ notify }: { notify: (msg: string) => void }) {
  const [rows, setRows] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ title: '', message: '' })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await notificationApi.getNotifications({ page_size: 100, ordering: '-published_at' })
      setRows(res.results)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSend() {
    if (!form.title.trim()) { notify('Please enter a title'); return }
    setSending(true)
    try {
      const created = await notificationApi.sendNotification({
        title: form.title, message: form.message, notification_type: 'general', target_audience: 'all',
      })
      setRows(prev => [created, ...prev])
      notify('Notification sent')
      setForm({ title: '', message: '' })
      setShowAdd(false)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to send notification.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Sent to students & faculty" actions={<Button size="sm" onClick={() => setShowAdd(true)}>+ Send Notification</Button>} />
      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading notifications…</div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <Button size="sm" onClick={load}>Retry</Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">No notifications sent yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(n => (
            <Card key={n.id}>
              <p className="font-medium text-slate-900">{n.title}</p>
              <p className="text-sm text-slate-500 mt-1">{n.message}</p>
              <p className="text-xs text-slate-400 mt-2">{new Date(n.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </Card>
          ))}
        </div>
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Send Notification">
        <div className="flex flex-col gap-4">
          <Input label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Notification title" />
          <Input label="Message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Message" />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" disabled={sending} onClick={handleSend}>{sending ? 'Sending…' : 'Send'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function EventsMgmt({ notify }: { notify: (msg: string) => void }) {
  const [rows, setRows] = useState<ApiEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', venue: '' })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await eventApi.getEvents({ page_size: 200, ordering: 'event_date' })
      setRows(res.results)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load events.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!form.name.trim()) { notify('Please enter an event name'); return }
    if (!form.date) { notify('Please choose a date'); return }
    setSaving(true)
    try {
      const created = await eventApi.createEvent({
        title: form.name,
        description: form.name,
        event_type: 'other',
        venue: form.venue || 'TBD',
        event_date: form.date,
        start_time: '09:00:00',
        end_time: '17:00:00',
        organizer: 'Staff',
        registration_required: false,
        is_active: true,
      })
      setRows(prev => [...prev, created])
      notify(`${created.title} added to calendar`)
      setForm({ name: '', date: '', venue: '' })
      setShowAdd(false)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to add event.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Events" subtitle="Upcoming campus events" actions={<Button size="sm" onClick={() => setShowAdd(true)}>+ Add Event</Button>} />
      <Card padding={false}>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading events…</div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <Button size="sm" onClick={load}>Retry</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No events found.</div>
        ) : (
          <Table
            columns={[
              { key: 'title', header: 'Event' },
              { key: 'event_date', header: 'Date' },
              { key: 'venue', header: 'Venue' },
            ]}
            data={rows as unknown as Record<string, unknown>[]}
          />
        )}
      </Card>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Event">
        <div className="flex flex-col gap-4">
          <Input label="Event Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Event name" />
          <Input label="Date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <Input label="Venue" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="Venue" />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" disabled={saving} onClick={handleAdd}>{saving ? 'Adding…' : 'Add Event'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ReportsMgmt({ teachers, admissions, notify }: {
  teachers: ApiTeacher[]; admissions: ApiAdmission[]; notify: (msg: string) => void
}) {
  const [generatingStudents, setGeneratingStudents] = useState(false)
  const [generatingFees, setGeneratingFees] = useState(false)

  async function generateStudentReport() {
    setGeneratingStudents(true)
    try {
      const res = await studentApi.getStudents({ page_size: 1000, ordering: 'admission_number' })
      const rows = res.results.map(s => ({
        admission_number: s.admission_number,
        roll_number: s.roll_number,
        name: `${s.user.first_name} ${s.user.last_name}`.trim() || s.user.username,
        department: s.department_detail?.name ?? '',
        course: s.course_detail?.name ?? '',
        current_semester: s.current_semester,
        status: s.is_active ? 'Active' : 'Inactive',
      }))
      downloadCsv('student-report.csv', rows)
      notify('Student Report generated')
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to generate Student Report.')
    } finally {
      setGeneratingStudents(false)
    }
  }

  async function generateFeeReport() {
    setGeneratingFees(true)
    try {
      const rows = await financeApi.getAdminFeeSummary()
      downloadCsv('fee-collection-report.csv', rows as unknown as Record<string, unknown>[])
      notify('Fee Collection Report generated')
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to generate Fee Collection Report.')
    } finally {
      setGeneratingFees(false)
    }
  }

  const staticReports: { name: string; desc: string; rows: Record<string, unknown>[]; file: string }[] = [
    {
      name: 'Faculty Report', desc: 'Faculty list with department and designation (from database)',
      rows: teachers.map(t => ({
        employee_id: t.employee_id, name: teacherDisplayName(t), department: t.department,
        designation: t.designation, experience_years: t.experience_years, status: t.is_active ? 'Active' : 'Inactive',
      })),
      file: 'faculty-report.csv',
    },
    {
      name: 'Admissions Report', desc: 'Applications received this cycle (from database)',
      rows: admissions.map(a => ({
        application_number: a.application_number, name: a.full_name,
        department: a.department_detail?.name ?? a.department, admission_status: a.admission_status,
        admission_date: a.admission_date, entrance_exam_score: a.entrance_exam_score ?? '',
      })),
      file: 'admissions-report.csv',
    },
  ]
  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate and download administrative reports" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-900">Student Report</p>
            <p className="text-sm text-slate-500 mt-1">Full student roster with department and status (from database)</p>
          </div>
          <Button size="sm" onClick={generateStudentReport} disabled={generatingStudents}>{generatingStudents ? 'Generating…' : 'Generate'}</Button>
        </Card>
        <Card className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-900">Fee Collection Report</p>
            <p className="text-sm text-slate-500 mt-1">Fee status across all students (from database)</p>
          </div>
          <Button size="sm" onClick={generateFeeReport} disabled={generatingFees}>{generatingFees ? 'Generating…' : 'Generate'}</Button>
        </Card>
        {staticReports.map(r => (
          <Card key={r.name} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900">{r.name}</p>
              <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
            </div>
            <Button size="sm" onClick={() => { downloadCsv(r.file, r.rows); notify(`${r.name} generated`) }}>Generate</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function StaffDashboard({ page = '' }: { page?: string }) {
  const [teachers, setTeachers] = useState<ApiTeacher[]>([])
  const [admissions, setAdmissions] = useState<ApiAdmission[]>([])
  const [admissionsLoading, setAdmissionsLoading] = useState(true)
  const [admissionsError, setAdmissionsError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Real dashboard stat-card counts (Total Students, Faculty Members,
  // Pending Admissions, Fee Defaulters) -- all sourced from existing
  // paginated/summary APIs, never hardcoded.
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [teacherCount, setTeacherCount] = useState<number | null>(null)
  const [pendingAdmissionCount, setPendingAdmissionCount] = useState<number | null>(null)
  const [feeDefaulterCount, setFeeDefaulterCount] = useState<number | null>(null)

  // Dashboard "Recent Admissions" widget + Reports tiles: real data from the
  // existing teacherApi/admissionApi (same APIs TeacherMgmt/AdmissionMgmt
  // use), fetched once here so both consumers below share it.
  useEffect(() => {
    teacherApi.getTeachers({ page_size: 100, ordering: 'employee_id' })
      .then(res => { setTeachers(res.results); setTeacherCount(res.count) })
      .catch(() => { setTeachers([]); setTeacherCount(null) })
  }, [])

  useEffect(() => {
    setAdmissionsLoading(true)
    setAdmissionsError(null)
    admissionApi.getAdmissions({ page_size: 100, ordering: '-admission_date' })
      .then(res => {
        setAdmissions(res.results)
        setPendingAdmissionCount(res.results.filter(a => a.admission_status === 'pending').length)
      })
      .catch(err => {
        setAdmissions([])
        setAdmissionsError(err instanceof ApiError ? err.message : 'Failed to load admissions.')
        setPendingAdmissionCount(null)
      })
      .finally(() => setAdmissionsLoading(false))
  }, [])

  // Total Students: use the paginated response's server-side `count` rather
  // than loading every row.
  useEffect(() => {
    studentApi.getStudents({ page_size: 1 })
      .then(res => setStudentCount(res.count))
      .catch(() => setStudentCount(null))
  }, [])

  // Fee Defaulters: reuses the existing /fee-summary/ endpoint (same one
  // FeeMgmt uses) -- a student is a defaulter when the backend's real
  // FeeStructure/FeePayment aggregation marks them 'overdue' (nothing paid).
  useEffect(() => {
    financeApi.getAdminFeeSummary()
      .then(rows => setFeeDefaulterCount(rows.filter(r => r.status === 'overdue').length))
      .catch(() => setFeeDefaulterCount(null))
  }, [])

  // Real logged-in staff user (falls back to a placeholder if not authenticated,
  // e.g. when this page is viewed outside the real login flow).
  const authedUser = tokenStorage.getUser()
  const userName = authedUser ? (`${authedUser.first_name} ${authedUser.last_name}`.trim() || authedUser.username) : 'Mrs. Shalini Rao'
  const userSub = authedUser ? (authedUser.employee_id ? `Admin Office · ${authedUser.employee_id}` : 'Admin Office') : 'Admin Office · Senior Clerk'

  function notify(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2500)
  }

  const pageMap: Record<string, { title: string; component: React.ReactNode }> = {
    '': { title: 'Dashboard', component: <Dashboard admissions={admissions} admissionsLoading={admissionsLoading} admissionsError={admissionsError} studentCount={studentCount} teacherCount={teacherCount} pendingAdmissionCount={pendingAdmissionCount} feeDefaulterCount={feeDefaulterCount} notify={notify} /> },
    'students': { title: 'Student Management', component: <StudentMgmt notify={notify} /> },
    'teachers': { title: 'Teacher Management', component: <TeacherMgmt notify={notify} /> },
    'hods': { title: 'HOD Management', component: <HODMgmt notify={notify} /> },
    'admissions': { title: 'Admission Management', component: <AdmissionMgmt notify={notify} /> },
    'fees': { title: 'Fee Management', component: <FeeMgmt notify={notify} /> },
    'certificates': { title: 'Certificate Management', component: <CertificateMgmt notify={notify} /> },
    'scholarships': { title: 'Scholarship Management', component: <ScholarshipMgmt notify={notify} /> },
    'documents': { title: 'Documents', component: <DocumentsMgmt notify={notify} /> },
    'contact': { title: 'Contact Messages', component: <ContactMgmt notify={notify} /> },
    'notifications': { title: 'Notifications', component: <NotificationsMgmt notify={notify} /> },
    'events': { title: 'Events', component: <EventsMgmt notify={notify} /> },
    'reports': { title: 'Reports', component: <ReportsMgmt teachers={teachers} admissions={admissions} notify={notify} /> },
  }

  const pageData = pageMap[page] ?? pageMap['']
  return (
    <DashboardLayout sidebarItems={buildSidebarItems(pendingAdmissionCount)} role="Staff" userName={userName} userSub={userSub} pageTitle={pageData.title}>
      {toast && (
        <div className="fixed top-4 right-4 z-[60] max-w-sm">
          <Alert type="success">{toast}</Alert>
        </div>
      )}
      {pageData.component}
    </DashboardLayout>
  )
}
