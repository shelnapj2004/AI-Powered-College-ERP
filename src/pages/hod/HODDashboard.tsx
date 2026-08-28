import { useEffect, useState, useCallback, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList, BarChart2, Globe, Briefcase, TrendingUp, FileText, MessageSquare, Layers } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { StatCard, Card, Badge, Table, PageHeader, Button, Alert, Modal, Input, Select } from '../../components/ui'
import {
  hodApi, teacherApi, studentApi, lookupApi, courseApi, subjectApi, teacherSubjectAssignmentApi, timetableApi, attendanceApi, examResultApi,
  researchApi, placementApi,
  ApiError,
  type ApiHOD, type ApiHODAnalytics, type ApiTeacher, type ApiStudent,
  type ApiCourse, type ApiSemester, type ApiSubject, type ApiTimetableSlot, type ApiTeacherSubjectAssignment,
  type ApiAttendanceRecord, type ApiSemesterResult, type ApiResearchProject, type ApiPlacementApplication, type ApiPlacementDrive,
} from '../../services/api'

/* Client-side CSV export for the Reports page. Mirrors the same
   pattern already used locally in the Admin and Staff dashboards. */
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

const sidebarItems = [
  { label: 'Dashboard', to: '/hod', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Faculty', to: '/hod/faculty', icon: <Users className="w-4 h-4" /> },
  { label: 'Students', to: '/hod/students', icon: <GraduationCap className="w-4 h-4" /> },
  { label: 'Courses', to: '/hod/courses', icon: <Layers className="w-4 h-4" /> },
  { label: 'Subjects', to: '/hod/subjects', icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Timetable', to: '/hod/timetable', icon: <ClipboardList className="w-4 h-4" /> },
  { label: 'Attendance', to: '/hod/attendance', icon: <ClipboardList className="w-4 h-4" /> },
  { label: 'Results', to: '/hod/results', icon: <BarChart2 className="w-4 h-4" /> },
  { label: 'Research', to: '/hod/research', icon: <Globe className="w-4 h-4" /> },
  { label: 'Placements', to: '/hod/placements', icon: <Briefcase className="w-4 h-4" /> },
  { label: 'Analytics', to: '/hod/analytics', icon: <TrendingUp className="w-4 h-4" /> },
  { label: 'Reports', to: '/hod/reports', icon: <FileText className="w-4 h-4" /> },
  { label: 'AI Department Assistant', to: '/hod/ai', icon: <MessageSquare className="w-4 h-4" /> },
]

function errMsg(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

const DEGREE_CHOICES = [
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'master', label: 'Master' },
  { value: 'phd', label: 'PhD' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'certificate', label: 'Certificate' },
]

function degreeLabel(value: string) {
  return DEGREE_CHOICES.find(d => d.value === value)?.label ?? value
}

const SUBJECT_TYPE_CHOICES = [
  { value: 'theory', label: 'Theory' },
  { value: 'lab', label: 'Lab' },
]

const DAY_CHOICES = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

// ---------------------------------------------------------------------------
// HOD profile — every page below reads the department name/id from here
// instead of a hardcoded string (HOD Phase 1). Derived from the logged-in
// user via /hods/me/ — never a client-supplied id.
// ---------------------------------------------------------------------------

function useHodProfile() {
  const [hod, setHod] = useState<ApiHOD | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    hodApi.getMe()
      .then(res => { if (!cancelled) { setHod(res); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(errMsg(err, 'Failed to load your HOD profile.')); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  return { hod, loading, error }
}

// Generic list-fetch hook shared by every API-backed section below.
function useListFetch<T>(fetcher: () => Promise<T[]>, deps: unknown[]): {
  data: T[]; loading: boolean; error: string; refresh: () => void
} {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetcher()
      .then(res => { if (!cancelled) { setData(res); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(errMsg(err, 'Failed to load data.')); setLoading(false) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, loading, error, refresh: () => setTick(t => t + 1) }
}

function StateBlock({ loading, error, empty, loadingLabel, errorLabel, emptyLabel, onRetry }: {
  loading: boolean; error: string; empty: boolean
  loadingLabel: string; errorLabel: string; emptyLabel: string; onRetry?: () => void
}) {
  if (loading) return <Card><p className="text-sm text-slate-400 py-8 text-center">{loadingLabel}</p></Card>
  if (error) return (
    <Alert type="error">
      {errorLabel || error} {onRetry && <button className="underline font-semibold ml-1" onClick={onRetry}>Retry</button>}
    </Alert>
  )
  if (empty) return <Card><p className="text-sm text-slate-400 py-8 text-center">{emptyLabel}</p></Card>
  return null
}

// ---------------------------------------------------------------------------
// Dashboard overview — real ORM-aggregated stats from /hods/analytics/
// ---------------------------------------------------------------------------

function Dashboard({ hod }: { hod: ApiHOD | null }) {
  const [stats, setStats] = useState<ApiHODAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    hodApi.getAnalytics()
      .then(res => { if (!cancelled) { setStats(res); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(errMsg(err, 'Failed to load department analytics.')); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  const deptName = hod?.department_detail?.name ?? 'Your Department'
  const hodName = hod ? `${hod.teacher_detail.user.first_name} ${hod.teacher_detail.user.last_name}` : ''

  return (
    <div>
      <PageHeader title="HOD Dashboard" subtitle={hod ? `${hodName} · Department of ${deptName}` : 'Loading your profile…'} />
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Faculty Members" value={loading ? '…' : String(stats?.faculty_count ?? 'N/A')} icon={<Users className="w-5 h-5" />} color="blue" />
        <StatCard label="Students (All Sems)" value={loading ? '…' : String(stats?.student_count ?? 'N/A')} icon={<GraduationCap className="w-5 h-5" />} color="green" />
        <StatCard label="Avg Attendance" value={loading ? '…' : stats?.attendance.avg_attendance_pct != null ? `${stats.attendance.avg_attendance_pct}%` : 'N/A'} icon={<ClipboardList className="w-5 h-5" />} color="purple" />
        <StatCard label="Avg CGPA" value={loading ? '…' : stats?.results.avg_cgpa != null ? String(stats.results.avg_cgpa) : 'N/A'} icon={<BarChart2 className="w-5 h-5" />} color="yellow" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card>
          <h3 className="font-semibold text-slate-900 mb-3 font-display">Courses & Subjects</h3>
          <p className="text-sm text-slate-500">Courses: <span className="font-semibold text-slate-900">{loading ? '…' : stats?.course_count ?? 'N/A'}</span></p>
          <p className="text-sm text-slate-500 mt-1">Subjects: <span className="font-semibold text-slate-900">{loading ? '…' : stats?.subject_count ?? 'N/A'}</span></p>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 mb-3 font-display">Research Output</h3>
          <p className="text-sm text-slate-500">Total Projects: <span className="font-semibold text-slate-900">{loading ? '…' : stats?.research.total_projects ?? 'N/A'}</span></p>
          <p className="text-sm text-slate-500 mt-1">Ongoing: <span className="font-semibold text-slate-900">{loading ? '…' : stats?.research.ongoing_projects ?? 'N/A'}</span></p>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 mb-3 font-display">Placements</h3>
          <p className="text-sm text-slate-500">Applications: <span className="font-semibold text-slate-900">{loading ? '…' : stats?.placements.total_applications ?? 'N/A'}</span></p>
          <p className="text-sm text-slate-500 mt-1">Placement Rate: <span className="font-semibold text-slate-900">{loading ? '…' : stats?.placements.placement_rate_pct != null ? `${stats.placements.placement_rate_pct}%` : 'N/A'}</span></p>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Faculty — real Teacher API, backend-scoped to HOD.department (HODScopedQuerysetMixin)
// ---------------------------------------------------------------------------

function FacultyPage({ deptName }: { deptName: string }) {
  const { data: teachers, loading, error, refresh } = useListFetch<ApiTeacher>(
    async () => (await teacherApi.getTeachers({ page_size: 200, ordering: 'user__first_name' })).results, []
  )
  const { data: subjects, refresh: refreshSubjects } = useListFetch<ApiSubject>(
    async () => (await subjectApi.getSubjects({ page_size: 200 })).results, []
  )
  const { data: assignments, loading: assignmentsLoading, error: assignmentsError, refresh: refreshAssignments } = useListFetch<ApiTeacherSubjectAssignment>(
    async () => (await teacherSubjectAssignmentApi.getAssignments({ page_size: 200, is_active: true })).results, []
  )

  const [showAssign, setShowAssign] = useState(false)
  const [assignTeacher, setAssignTeacher] = useState('')
  const [assignSubject, setAssignSubject] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [unassigningId, setUnassigningId] = useState<string | null>(null)

  function teacherName(t: ApiTeacher) {
    return `${t.user.first_name} ${t.user.last_name}`
  }

  function assignmentsFor(teacherId: string) {
    return assignments.filter(a => a.teacher === teacherId)
  }

  async function refreshAll() {
    await Promise.all([refresh(), refreshSubjects(), refreshAssignments()])
  }

  async function handleAssign() {
    if (!assignTeacher) { setFormError('Please select a teacher.'); return }
    if (!assignSubject) { setFormError('Please select a subject.'); return }
    if (assignmentsFor(assignTeacher).some(a => a.subject === assignSubject)) {
      setFormError('This subject is already assigned to this teacher.'); return
    }
    setSaving(true)
    setFormError(null)
    try {
      await teacherSubjectAssignmentApi.assign({ teacher: assignTeacher, subject: assignSubject })
      setShowAssign(false)
      setAssignTeacher(''); setAssignSubject('')
      await refreshAll()
    } catch (err) {
      setFormError(errMsg(err, 'Failed to assign subject.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleUnassign(a: ApiTeacherSubjectAssignment) {
    if (!window.confirm(`Remove ${a.subject_detail?.name ?? 'this subject'} from this teacher?`)) return
    setUnassigningId(a.id)
    try {
      await teacherSubjectAssignmentApi.unassign(a.id)
      await refreshAll()
    } catch (err) {
      window.alert(errMsg(err, 'Failed to remove assignment.'))
    } finally {
      setUnassigningId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Faculty Members"
        subtitle={`${deptName} · ${loading ? 'Loading…' : `${teachers.length} Faculty`}`}
        actions={<Button size="sm" onClick={() => { setAssignTeacher(''); setAssignSubject(''); setFormError(null); setShowAssign(true) }}>Assign Subject</Button>}
      />
      <StateBlock loading={loading} error={error} empty={!loading && !error && teachers.length === 0}
        loadingLabel="Loading faculty..." errorLabel="Failed to load faculty. Try again." emptyLabel="No faculty members found for your department." onRetry={refresh} />
      {assignmentsError && <div className="mb-4"><Alert type="error">{assignmentsError}</Alert></div>}
      {!loading && !error && teachers.length > 0 && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'name', header: 'Name', render: r => teacherName(r as unknown as ApiTeacher) },
              { key: 'designation', header: 'Designation' },
              { key: 'employee_id', header: 'Employee ID' },
              {
                key: 'assigned_subjects', header: 'Assigned Subjects', render: r => {
                  const teacher = r as unknown as ApiTeacher
                  const rows = assignmentsFor(teacher.id)
                  if (assignmentsLoading) return <span className="text-slate-400">Loading…</span>
                  if (rows.length === 0) return <span className="text-slate-400">None</span>
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {rows.map(a => (
                        <span key={a.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                          {a.subject_detail?.name ?? a.subject}
                          <button
                            className="text-blue-400 hover:text-red-600 font-bold leading-none"
                            onClick={() => handleUnassign(a)}
                            disabled={unassigningId === a.id}
                            title="Unassign"
                          >
                            {unassigningId === a.id ? '…' : '×'}
                          </button>
                        </span>
                      ))}
                    </div>
                  )
                }
              },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={r.is_active ? 'green' : 'red'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
            ]}
            data={teachers as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Assign Subject">
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}
          <Select label="Teacher" value={assignTeacher} onChange={e => setAssignTeacher(e.target.value)}>
            <option value="">Select teacher</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{teacherName(t)} ({t.employee_id})</option>)}
          </Select>
          <Select label="Subject" value={assignSubject} onChange={e => setAssignSubject(e.target.value)}>
            <option value="">Select subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleAssign} disabled={saving}>{saving ? 'Assigning…' : 'Assign Subject'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAssign(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Students — real Student API, backend-scoped to HOD.department
// ---------------------------------------------------------------------------

function StudentsPage({ deptName }: { deptName: string }) {
  const { data, loading, error, refresh } = useListFetch<ApiStudent>(
    async () => (await studentApi.getStudents({ page_size: 200, ordering: 'admission_number' })).results, []
  )
  return (
    <div>
      <PageHeader title="Students" subtitle={`${deptName} · ${loading ? 'Loading…' : `${data.length} Students`}`} />
      <StateBlock loading={loading} error={error} empty={!loading && !error && data.length === 0}
        loadingLabel="Loading students..." errorLabel="Failed to load students. Try again." emptyLabel="No students found for your department." onRetry={refresh} />
      {!loading && !error && data.length > 0 && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'admission_number', header: 'Admission No.' },
              { key: 'name', header: 'Name', render: r => `${(r.user as ApiStudent['user']).first_name} ${(r.user as ApiStudent['user']).last_name}` },
              { key: 'course', header: 'Course', render: r => (r.course_detail as ApiCourse)?.name ?? '—' },
              { key: 'current_semester', header: 'Semester' },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={r.is_active ? 'green' : 'red'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
            ]}
            data={data as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Courses — real Course CRUD, backend-scoped + write-enforced to
// HOD.department (apps.core.mixins.HODScopedQuerysetMixin +
// HODDepartmentWriteMixin). Department is never chosen by the HOD --
// it's forced to their own department id on every create.
// ---------------------------------------------------------------------------

const emptyCourseForm = { name: '', code: '', degree: 'bachelor', duration_years: '3', total_semesters: '6', description: '' }

function CoursesPage({ deptName, departmentId }: { deptName: string; departmentId: string }) {
  const { data: courses, loading, error, refresh } = useListFetch<ApiCourse>(
    async () => (await courseApi.getCourses({ page_size: 200, ordering: 'name' })).results, []
  )
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ApiCourse | null>(null)
  const [form, setForm] = useState(emptyCourseForm)
  const [editForm, setEditForm] = useState(emptyCourseForm)
  const [status, setStatus] = useState('Active')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openEdit(c: ApiCourse) {
    setEditForm({
      name: c.name, code: c.code, degree: c.degree,
      duration_years: String(c.duration_years), total_semesters: String(c.total_semesters),
      description: c.description || '',
    })
    setStatus(c.is_active ? 'Active' : 'Inactive')
    setFormError(null)
    setEditing(c)
  }

  async function handleCreate() {
    if (!form.name.trim()) { setFormError('Please enter a course name.'); return }
    if (!form.code.trim()) { setFormError('Please enter a course code.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await courseApi.createCourse({
        department: departmentId,
        name: form.name.trim(),
        code: form.code.toUpperCase(),
        degree: form.degree,
        duration_years: Number(form.duration_years) || 1,
        total_semesters: Number(form.total_semesters) || 1,
        description: form.description,
      })
      setForm(emptyCourseForm)
      setShowAdd(false)
      await refresh()
    } catch (err) {
      setFormError(errMsg(err, 'Failed to create course.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    if (!editForm.name.trim()) { setFormError('Please enter a course name.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await courseApi.updateCourse(editing.id, {
        name: editForm.name.trim(),
        code: editForm.code.toUpperCase(),
        degree: editForm.degree,
        duration_years: Number(editForm.duration_years) || 1,
        total_semesters: Number(editForm.total_semesters) || 1,
        description: editForm.description,
        is_active: status === 'Active',
      })
      setEditing(null)
      await refresh()
    } catch (err) {
      setFormError(errMsg(err, 'Failed to update course.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: ApiCourse) {
    if (!window.confirm(`Delete ${c.name}? This cannot be undone.`)) return
    setDeletingId(c.id)
    try {
      await courseApi.deleteCourse(c.id)
      await refresh()
    } catch (err) {
      window.alert(errMsg(err, 'Failed to delete course.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Courses" subtitle={`${deptName} · ${loading ? 'Loading…' : `${courses.length} Courses`}`}
        actions={<Button size="sm" onClick={() => { setForm(emptyCourseForm); setFormError(null); setShowAdd(true) }}>+ Add Course</Button>} />
      <StateBlock loading={loading} error={error} empty={!loading && !error && courses.length === 0}
        loadingLabel="Loading courses..." errorLabel="Failed to load courses. Try again." emptyLabel="No courses found for your department." onRetry={refresh} />
      {!loading && !error && courses.length > 0 && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'name', header: 'Course Name' },
              { key: 'code', header: 'Code' },
              { key: 'degree', header: 'Degree', render: r => degreeLabel(String(r.degree)) },
              { key: 'duration_years', header: 'Duration (yrs)' },
              { key: 'total_semesters', header: 'Semesters' },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={r.is_active ? 'green' : 'slate'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiCourse
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} disabled={deletingId === row.id}>
                        {deletingId === row.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  )
                }
              },
            ]}
            data={courses as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Course">
        {editing && (
          <div className="flex flex-col gap-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <Input label="Course Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            <Input label="Course Code" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value })} />
            <Select label="Degree" value={editForm.degree} onChange={e => setEditForm({ ...editForm, degree: e.target.value })}>
              {DEGREE_CHOICES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Duration (Years)" type="number" value={editForm.duration_years} onChange={e => setEditForm({ ...editForm, duration_years: e.target.value })} />
              <Input label="Total Semesters" type="number" value={editForm.total_semesters} onChange={e => setEditForm({ ...editForm, total_semesters: e.target.value })} />
            </div>
            <Input label="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
              <option>Active</option><option>Inactive</option>
            </Select>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Course">
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}
          <Input label="Course Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Computer Applications" />
          <Input label="Course Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. MCA" />
          <Select label="Degree" value={form.degree} onChange={e => setForm({ ...form, degree: e.target.value })}>
            {DEGREE_CHOICES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration (Years)" type="number" value={form.duration_years} onChange={e => setForm({ ...form, duration_years: e.target.value })} />
            <Input label="Total Semesters" type="number" value={form.total_semesters} onChange={e => setForm({ ...form, total_semesters: e.target.value })} />
          </div>
          <Input label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Adding…' : 'Add Course'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subjects — real Subject CRUD, backend-scoped + write-enforced via the
// parent Course's department (HODScopedQuerysetMixin hod_department_lookup
// ='course__department' / HODDepartmentWriteMixin checks course.department).
// Course/Semester dropdowns are pulled from courseApi/lookupApi, both of
// which are already scoped to the HOD's own department on the backend.
// ---------------------------------------------------------------------------

const emptySubjectForm = { course: '', semester: '', code: '', name: '', credits: '4', subject_type: 'theory', description: '' }

function SubjectsPage({ deptName }: { deptName: string }) {
  const { data: courses } = useListFetch<ApiCourse>(async () => (await courseApi.getCourses({ page_size: 200 })).results, [])
  const { data: semesters } = useListFetch<ApiSemester>(async () => await lookupApi.getSemesters(), [])
  const { data, loading, error, refresh } = useListFetch<ApiSubject>(async () => (await subjectApi.getSubjects({ page_size: 200, ordering: 'code' })).results, [])

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ApiSubject | null>(null)
  const [form, setForm] = useState(emptySubjectForm)
  const [editForm, setEditForm] = useState(emptySubjectForm)
  const [status, setStatus] = useState('Active')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const courseName = (id: string) => courses.find(c => c.id === id)?.name ?? id
  const semesterName = (id: string) => semesters.find(s => s.id === id)?.name ?? id
  // Semester dropdown must only ever offer semesters of the currently-selected course.
  const semestersForCourse = (courseId: string) => semesters.filter(s => s.course === courseId)

  function openEdit(s: ApiSubject) {
    setEditForm({
      course: s.course, semester: s.semester, code: s.code, name: s.name,
      credits: String(s.credits), subject_type: s.subject_type, description: s.description || '',
    })
    setStatus(s.is_active ? 'Active' : 'Inactive')
    setFormError(null)
    setEditing(s)
  }

  async function handleCreate() {
    if (!form.course) { setFormError('Please select a course.'); return }
    if (!form.semester) { setFormError('Please select a semester.'); return }
    if (!form.code.trim()) { setFormError('Please enter a subject code.'); return }
    if (!form.name.trim()) { setFormError('Please enter a subject name.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await subjectApi.createSubject({
        course: form.course,
        semester: form.semester,
        code: form.code.toUpperCase(),
        name: form.name.trim(),
        credits: Number(form.credits) || 1,
        subject_type: form.subject_type as 'theory' | 'lab',
        description: form.description,
      })
      setForm(emptySubjectForm)
      setShowAdd(false)
      await refresh()
    } catch (err) {
      setFormError(errMsg(err, 'Failed to create subject.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    if (!editForm.name.trim()) { setFormError('Please enter a subject name.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await subjectApi.updateSubject(editing.id, {
        course: editForm.course,
        semester: editForm.semester,
        code: editForm.code.toUpperCase(),
        name: editForm.name.trim(),
        credits: Number(editForm.credits) || 1,
        subject_type: editForm.subject_type as 'theory' | 'lab',
        description: editForm.description,
        is_active: status === 'Active',
      })
      setEditing(null)
      await refresh()
    } catch (err) {
      setFormError(errMsg(err, 'Failed to update subject.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(s: ApiSubject) {
    if (!window.confirm(`Delete ${s.name}? This cannot be undone.`)) return
    setDeletingId(s.id)
    try {
      await subjectApi.deleteSubject(s.id)
      await refresh()
    } catch (err) {
      window.alert(errMsg(err, 'Failed to delete subject.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Subjects" subtitle={`${deptName} · ${loading ? 'Loading…' : `${data.length} Subjects`}`}
        actions={<Button size="sm" onClick={() => { setForm(emptySubjectForm); setFormError(null); setShowAdd(true) }}>+ Add Subject</Button>} />
      <StateBlock loading={loading} error={error} empty={!loading && !error && data.length === 0}
        loadingLabel="Loading subjects..." errorLabel="Failed to load subjects. Try again." emptyLabel="No subjects found for your department's courses." onRetry={refresh} />
      {!loading && !error && data.length > 0 && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Subject' },
              { key: 'course', header: 'Course', render: r => courseName(r.course as string) },
              { key: 'semester', header: 'Semester', render: r => semesterName(r.semester as string) },
              { key: 'credits', header: 'Credits' },
              { key: 'subject_type', header: 'Type', render: r => <Badge variant="blue">{String(r.subject_type)}</Badge> },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={r.is_active ? 'green' : 'slate'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiSubject
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} disabled={deletingId === row.id}>
                        {deletingId === row.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  )
                }
              },
            ]}
            data={data as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Subject">
        {editing && (
          <div className="flex flex-col gap-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <Select label="Course" value={editForm.course} onChange={e => setEditForm({ ...editForm, course: e.target.value, semester: '' })}>
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Semester" value={editForm.semester} onChange={e => setEditForm({ ...editForm, semester: e.target.value })}>
              <option value="">Select semester</option>
              {semestersForCourse(editForm.course).map(s => <option key={s.id} value={s.id}>{s.name || `Semester ${s.semester_number}`}</option>)}
            </Select>
            <Input label="Subject Code" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value })} />
            <Input label="Subject Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Credits" type="number" value={editForm.credits} onChange={e => setEditForm({ ...editForm, credits: e.target.value })} />
              <Select label="Type" value={editForm.subject_type} onChange={e => setEditForm({ ...editForm, subject_type: e.target.value })}>
                {SUBJECT_TYPE_CHOICES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <Input label="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
              <option>Active</option><option>Inactive</option>
            </Select>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Subject">
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}
          <Select label="Course" value={form.course} onChange={e => setForm({ ...form, course: e.target.value, semester: '' })}>
            <option value="">Select course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Semester" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
            <option value="">Select semester</option>
            {semestersForCourse(form.course).map(s => <option key={s.id} value={s.id}>{s.name || `Semester ${s.semester_number}`}</option>)}
          </Select>
          <Input label="Subject Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. MCA401" />
          <Input label="Subject Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Database Management Systems" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Credits" type="number" value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })} />
            <Select label="Type" value={form.subject_type} onChange={e => setForm({ ...form, subject_type: e.target.value })}>
              {SUBJECT_TYPE_CHOICES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <Input label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Adding…' : 'Add Subject'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timetable — real Timetable CRUD, backend-scoped + write-enforced to
// HOD.department. Teacher dropdown is filtered client-side to teachers
// actually assigned (TeacherSubjectAssignment) to the selected subject --
// the backend (TimetableSerializer.validate) still rejects any
// unassigned teacher-subject combination regardless of what the form sends.
// ---------------------------------------------------------------------------

const emptyTimetableForm = { course: '', semester: '', subject: '', teacher: '', day_of_week: 'monday', period_number: '1', room_number: '', start_time: '', end_time: '' }

function TimetablePage({ deptName, departmentId }: { deptName: string; departmentId: string }) {
  const { data, loading, error, refresh } = useListFetch<ApiTimetableSlot>(
    async () => (await timetableApi.getTimetables({ page_size: 200, ordering: 'day_of_week' })).results, []
  )
  const { data: courses } = useListFetch<ApiCourse>(async () => (await courseApi.getCourses({ page_size: 200 })).results, [])
  const { data: semesters } = useListFetch<ApiSemester>(async () => await lookupApi.getSemesters(), [])
  const { data: subjects } = useListFetch<ApiSubject>(async () => (await subjectApi.getSubjects({ page_size: 200 })).results, [])
  const { data: teachers } = useListFetch<ApiTeacher>(async () => (await teacherApi.getTeachers({ page_size: 200 })).results, [])
  const { data: assignments } = useListFetch<ApiTeacherSubjectAssignment>(
    async () => (await teacherSubjectAssignmentApi.getAssignments({ page_size: 200, is_active: true })).results, []
  )

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ApiTimetableSlot | null>(null)
  const [form, setForm] = useState(emptyTimetableForm)
  const [editForm, setEditForm] = useState(emptyTimetableForm)
  const [status, setStatus] = useState('Active')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const courseName = (id: string) => courses.find(c => c.id === id)?.name ?? id
  const subjectName = (id: string) => subjects.find(s => s.id === id)?.name ?? id
  const teacherName = (id: string) => { const t = teachers.find(t => t.id === id); return t ? `${t.user.first_name} ${t.user.last_name}` : id }
  const semestersForCourse = (courseId: string) => semesters.filter(s => s.course === courseId)
  const subjectsForCourseSemester = (courseId: string, semesterId: string) =>
    subjects.filter(s => s.course === courseId && (!semesterId || s.semester === semesterId))
  // Teacher dropdown deliberately restricted to teachers with an ACTIVE
  // assignment for the selected subject -- the backend enforces this too,
  // this is only the frontend narrowing per Priority 8 Phase 7.
  const teachersForSubject = (subjectId: string) => {
    if (!subjectId) return teachers
    const assignedIds = new Set(assignments.filter(a => a.subject === subjectId).map(a => a.teacher))
    return teachers.filter(t => assignedIds.has(t.id))
  }

  function openEdit(slot: ApiTimetableSlot) {
    setEditForm({
      course: slot.course, semester: slot.semester, subject: slot.subject, teacher: slot.teacher,
      day_of_week: slot.day_of_week, period_number: String(slot.period_number),
      room_number: slot.room_number, start_time: slot.start_time, end_time: slot.end_time,
    })
    setStatus(slot.is_active ? 'Active' : 'Inactive')
    setFormError(null)
    setEditing(slot)
  }

  function validateForm(f: typeof emptyTimetableForm): string | null {
    if (!f.course) return 'Please select a course.'
    if (!f.semester) return 'Please select a semester.'
    if (!f.subject) return 'Please select a subject.'
    if (!f.teacher) return 'Please select a teacher.'
    if (!f.room_number.trim()) return 'Please enter a room number.'
    if (!f.start_time) return 'Please enter a start time.'
    if (!f.end_time) return 'Please enter an end time.'
    return null
  }

  async function handleCreate() {
    const err = validateForm(form)
    if (err) { setFormError(err); return }
    setSaving(true)
    setFormError(null)
    try {
      await timetableApi.createTimetable({
        department: departmentId,
        course: form.course,
        semester: form.semester,
        subject: form.subject,
        teacher: form.teacher,
        day_of_week: form.day_of_week as ApiTimetableSlot['day_of_week'],
        period_number: Number(form.period_number) || 1,
        room_number: form.room_number.trim(),
        start_time: form.start_time,
        end_time: form.end_time,
      })
      setForm(emptyTimetableForm)
      setShowAdd(false)
      await refresh()
    } catch (e) {
      setFormError(errMsg(e, 'Failed to create timetable slot.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    const err = validateForm(editForm)
    if (err) { setFormError(err); return }
    setSaving(true)
    setFormError(null)
    try {
      await timetableApi.updateTimetable(editing.id, {
        course: editForm.course,
        semester: editForm.semester,
        subject: editForm.subject,
        teacher: editForm.teacher,
        day_of_week: editForm.day_of_week as ApiTimetableSlot['day_of_week'],
        period_number: Number(editForm.period_number) || 1,
        room_number: editForm.room_number.trim(),
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        is_active: status === 'Active',
      })
      setEditing(null)
      await refresh()
    } catch (e) {
      setFormError(errMsg(e, 'Failed to update timetable slot.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(slot: ApiTimetableSlot) {
    if (!window.confirm('Delete this timetable slot? This cannot be undone.')) return
    setDeletingId(slot.id)
    try {
      await timetableApi.deleteTimetable(slot.id)
      await refresh()
    } catch (e) {
      window.alert(errMsg(e, 'Failed to delete timetable slot.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Timetable" subtitle={`${deptName} · ${loading ? 'Loading…' : `${data.length} Scheduled Slots`}`}
        actions={<Button size="sm" onClick={() => { setForm(emptyTimetableForm); setFormError(null); setShowAdd(true) }}>+ Add Timetable</Button>} />
      <StateBlock loading={loading} error={error} empty={!loading && !error && data.length === 0}
        loadingLabel="Loading timetable..." errorLabel="Failed to load timetable. Try again." emptyLabel="No timetable slots found for your department." onRetry={refresh} />
      {!loading && !error && data.length > 0 && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'day_of_week', header: 'Day' },
              { key: 'period_number', header: 'Period' },
              { key: 'subject', header: 'Subject', render: r => subjectName(r.subject as string) },
              { key: 'teacher', header: 'Teacher', render: r => teacherName(r.teacher as string) },
              { key: 'course', header: 'Course', render: r => courseName(r.course as string) },
              { key: 'start_time', header: 'Start' },
              { key: 'end_time', header: 'End' },
              { key: 'room_number', header: 'Room' },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={r.is_active ? 'green' : 'slate'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiTimetableSlot
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} disabled={deletingId === row.id}>
                        {deletingId === row.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  )
                }
              },
            ]}
            data={data as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Timetable Slot" size="lg">
        {editing && (
          <div className="flex flex-col gap-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <Select label="Course" value={editForm.course} onChange={e => setEditForm({ ...editForm, course: e.target.value, semester: '', subject: '', teacher: '' })}>
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Semester" value={editForm.semester} onChange={e => setEditForm({ ...editForm, semester: e.target.value, subject: '', teacher: '' })}>
              <option value="">Select semester</option>
              {semestersForCourse(editForm.course).map(s => <option key={s.id} value={s.id}>{s.name || `Semester ${s.semester_number}`}</option>)}
            </Select>
            <Select label="Subject" value={editForm.subject} onChange={e => setEditForm({ ...editForm, subject: e.target.value, teacher: '' })}>
              <option value="">Select subject</option>
              {subjectsForCourseSemester(editForm.course, editForm.semester).map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </Select>
            <Select label="Teacher (assigned to this subject)" value={editForm.teacher} onChange={e => setEditForm({ ...editForm, teacher: e.target.value })}>
              <option value="">Select teacher</option>
              {teachersForSubject(editForm.subject).map(t => <option key={t.id} value={t.id}>{teacherName(t.id)}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Day" value={editForm.day_of_week} onChange={e => setEditForm({ ...editForm, day_of_week: e.target.value })}>
                {DAY_CHOICES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
              <Input label="Period Number" type="number" value={editForm.period_number} onChange={e => setEditForm({ ...editForm, period_number: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Time" type="time" value={editForm.start_time} onChange={e => setEditForm({ ...editForm, start_time: e.target.value })} />
              <Input label="End Time" type="time" value={editForm.end_time} onChange={e => setEditForm({ ...editForm, end_time: e.target.value })} />
            </div>
            <Input label="Room Number" value={editForm.room_number} onChange={e => setEditForm({ ...editForm, room_number: e.target.value })} />
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
              <option>Active</option><option>Inactive</option>
            </Select>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Timetable Slot" size="lg">
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}
          <Select label="Course" value={form.course} onChange={e => setForm({ ...form, course: e.target.value, semester: '', subject: '', teacher: '' })}>
            <option value="">Select course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Semester" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value, subject: '', teacher: '' })}>
            <option value="">Select semester</option>
            {semestersForCourse(form.course).map(s => <option key={s.id} value={s.id}>{s.name || `Semester ${s.semester_number}`}</option>)}
          </Select>
          <Select label="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value, teacher: '' })}>
            <option value="">Select subject</option>
            {subjectsForCourseSemester(form.course, form.semester).map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
          </Select>
          <Select label="Teacher (assigned to this subject)" value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })}>
            <option value="">Select teacher</option>
            {teachersForSubject(form.subject).map(t => <option key={t.id} value={t.id}>{teacherName(t.id)}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Day" value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })}>
              {DAY_CHOICES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
            <Input label="Period Number" type="number" value={form.period_number} onChange={e => setForm({ ...form, period_number: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
            <Input label="End Time" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
          </div>
          <Input label="Room Number" value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} placeholder="e.g. Lab 3" />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Adding…' : 'Add Timetable'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Attendance — real AttendanceRecord API, backend-scoped to HOD.department
// via the parent timetable slot's department.
// ---------------------------------------------------------------------------

function AttendancePage({ deptName }: { deptName: string }) {
  const { data, loading, error, refresh } = useListFetch<ApiAttendanceRecord>(
    async () => (await attendanceApi.getRecords({ page_size: 500 })).results, []
  )

  const summary = useMemo(() => {
    const total = data.length
    const present = data.filter(r => r.status === 'present').length
    return { total, present, pct: total ? Math.round((present / total) * 1000) / 10 : null }
  }, [data])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of data) counts[r.status] = (counts[r.status] ?? 0) + 1
    return Object.entries(counts).map(([status, count]) => ({ status, count }))
  }, [data])

  return (
    <div>
      <PageHeader title="Attendance" subtitle={`${deptName} · ${loading ? 'Loading…' : summary.pct != null ? `Avg Attendance ${summary.pct}%` : 'No records yet'}`} />
      <StateBlock loading={loading} error={error} empty={!loading && !error && data.length === 0}
        loadingLabel="Loading attendance..." errorLabel="Failed to load attendance. Try again." emptyLabel="No attendance records found for your department." onRetry={refresh} />
      {!loading && !error && data.length > 0 && (
        <>
          <Card className="mb-5">
            <h3 className="font-semibold text-slate-900 mb-4 font-display">Attendance Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusCounts} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card padding={false}>
            <Table
              columns={[
                { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'present' ? 'green' : r.status === 'absent' ? 'red' : 'yellow'}>{String(r.status)}</Badge> },
                { key: 'remarks', header: 'Remarks' },
              ]}
              data={data.slice(0, 100) as unknown as Record<string, unknown>[]}
            />
          </Card>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Results — real SemesterResult API, backend-scoped to HOD.department
// via the student's department.
// ---------------------------------------------------------------------------

function ResultsPage({ deptName }: { deptName: string }) {
  const { data, loading, error, refresh } = useListFetch<ApiSemesterResult>(
    async () => (await examResultApi.getResults({ page_size: 500 })).results, []
  )

  const bySemester = useMemo(() => {
    const groups: Record<string, { pass: number; fail: number; total: number }> = {}
    for (const r of data) {
      const key = r.semester
      groups[key] = groups[key] ?? { pass: 0, fail: 0, total: 0 }
      groups[key].total += 1
      if (r.result_status === 'pass') groups[key].pass += 1
      else if (r.result_status === 'fail') groups[key].fail += 1
    }
    return Object.entries(groups).map(([semester, g]) => ({
      semester,
      passPct: g.total ? Math.round((g.pass / g.total) * 100) : 0,
      failPct: g.total ? Math.round((g.fail / g.total) * 100) : 0,
    }))
  }, [data])

  return (
    <div>
      <PageHeader title="Results" subtitle={`${deptName} · ${loading ? 'Loading…' : `${data.length} Semester Results`}`} />
      <StateBlock loading={loading} error={error} empty={!loading && !error && data.length === 0}
        loadingLabel="Loading results..." errorLabel="Failed to load results. Try again." emptyLabel="No published results found for your department." onRetry={refresh} />
      {!loading && !error && data.length > 0 && (
        <>
          <Card className="mb-5">
            <h3 className="font-semibold text-slate-900 mb-4 font-display">Pass Rate by Semester</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bySemester} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="semester" tick={{ fontSize: 10 }} hide={bySemester.length > 6} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="passPct" fill="#10b981" name="Pass %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failPct" fill="#fca5a5" name="Fail %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card padding={false}>
            <Table
              columns={[
                { key: 'result_status', header: 'Status', render: r => <Badge variant={r.result_status === 'pass' ? 'green' : 'red'}>{String(r.result_status)}</Badge> },
                { key: 'sgpa', header: 'SGPA' },
                { key: 'cgpa', header: 'CGPA' },
                { key: 'published_date', header: 'Published' },
              ]}
              data={data.slice(0, 100) as unknown as Record<string, unknown>[]}
            />
          </Card>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Research — real ResearchProject API, backend-scoped to HOD.department
// ---------------------------------------------------------------------------

function ResearchPage({ deptName }: { deptName: string }) {
  const { data, loading, error, refresh } = useListFetch<ApiResearchProject>(
    async () => (await researchApi.getProjects({ page_size: 200 })).results, []
  )
  const [showAdd, setShowAdd] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const emptyForm = { title: '', description: '', funding_agency: '', start_date: new Date().toISOString().slice(0, 10) }
  const [form, setForm] = useState(emptyForm)

  async function handleCreate() {
    if (!form.title.trim()) { setCreateError('Please enter a project title.'); return }
    if (!form.description.trim()) { setCreateError('Please enter a description.'); return }
    setCreating(true)
    setCreateError(null)
    try {
      // department + principal_investigator are derived server-side from
      // the authenticated HOD -- never sent from here (Problem 1).
      await researchApi.createProject({
        title: form.title,
        description: form.description,
        funding_agency: form.funding_agency || undefined,
        start_date: form.start_date,
      })
      setForm(emptyForm)
      setShowAdd(false)
      refresh()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to submit research project.')
    } finally {
      setCreating(false)
    }
  }

  const statusVariant = (s: string) => s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'yellow'

  return (
    <div>
      <PageHeader title="Research & Projects" subtitle={`${deptName} · ${loading ? 'Loading…' : `${data.length} Projects`}`}
        actions={<Button size="sm" onClick={() => { setCreateError(null); setForm(emptyForm); setShowAdd(true) }}>+ Submit Project</Button>} />
      <StateBlock loading={loading} error={error} empty={!loading && !error && data.length === 0}
        loadingLabel="Loading research projects..." errorLabel="Failed to load research projects. Try again." emptyLabel="No research projects found for your department." onRetry={refresh} />
      {!loading && !error && data.length > 0 && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'title', header: 'Title' },
              { key: 'funding_agency', header: 'Funding Agency' },
              { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'ongoing' ? 'blue' : r.status === 'completed' ? 'green' : 'yellow'}>{String(r.status)}</Badge> },
              { key: 'approval_status', header: 'Approval', render: r => <Badge variant={statusVariant(String(r.approval_status))}>{String(r.approval_status)}</Badge> },
              { key: 'start_date', header: 'Start Date' },
              { key: 'end_date', header: 'End Date' },
            ]}
            data={data as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Submit Research Project">
        <div className="flex flex-col gap-4">
          {createError && <Alert type="error">{createError}</Alert>}
          <Input label="Project Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Input label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <Input label="Funding Agency (optional)" value={form.funding_agency} onChange={e => setForm({ ...form, funding_agency: e.target.value })} />
          <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
          <p className="text-xs text-slate-400">Submitted under {deptName} with you as Principal Investigator. An Admin must approve it before it appears publicly.</p>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={creating}>{creating ? 'Submitting…' : 'Submit for Approval'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Placements — real PlacementApplication API, backend-scoped to
// HOD.department via the student's department.
// ---------------------------------------------------------------------------

function PlacementsPage({ deptName }: { deptName: string }) {
  // Admin-created PlacementDrive records -- HOD read access (Problem 5).
  const { data: drives, loading: drivesLoading, error: drivesError, refresh: refreshDrives } = useListFetch<ApiPlacementDrive>(
    async () => (await placementApi.getDrives({ page_size: 200 })).results, []
  )
  const { data, loading, error, refresh } = useListFetch<ApiPlacementApplication>(
    async () => (await placementApi.getApplications({ page_size: 500 })).results, []
  )

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of data) counts[a.status] = (counts[a.status] ?? 0) + 1
    const colors: Record<string, string> = { selected: '#10b981', shortlisted: '#3b82f6', applied: '#f59e0b', rejected: '#f87171' }
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: colors[name] ?? '#94a3b8' }))
  }, [data])

  const applicationsByDrive = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of data) map[a.placement_drive] = (map[a.placement_drive] ?? 0) + 1
    return map
  }, [data])

  return (
    <div>
      <PageHeader title="Placements" subtitle={`${deptName} · ${drivesLoading ? 'Loading…' : `${drives.length} Drives`} · ${loading ? '…' : `${data.length} Applications from your department`}`} />

      <h3 className="font-semibold text-slate-900 mb-3 font-display">Placement Drives</h3>
      <StateBlock loading={drivesLoading} error={drivesError} empty={!drivesLoading && !drivesError && drives.length === 0}
        loadingLabel="Loading placement drives..." errorLabel="Failed to load placement drives. Try again." emptyLabel="No placement drives have been created yet." onRetry={refreshDrives} />
      {!drivesLoading && !drivesError && drives.length > 0 && (
        <Card padding={false} className="mb-6">
          <Table
            columns={[
              { key: 'company_name', header: 'Company' },
              { key: 'job_title', header: 'Role' },
              { key: 'location', header: 'Location' },
              { key: 'package_lpa', header: 'Package (LPA)' },
              { key: 'application_deadline', header: 'Deadline' },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={r.is_active ? 'green' : 'slate'}>{r.is_active ? 'Active' : 'Closed'}</Badge> },
              { key: 'applications', header: 'Dept. Applicants', render: r => applicationsByDrive[String(r.id)] ?? 0 },
            ]}
            data={drives as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <h3 className="font-semibold text-slate-900 mb-3 font-display">Applications — {deptName}</h3>
      <StateBlock loading={loading} error={error} empty={!loading && !error && data.length === 0}
        loadingLabel="Loading placement data..." errorLabel="Failed to load placement data. Try again." emptyLabel="No placement applications found for your department's students." onRetry={refresh} />
      {!loading && !error && data.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-semibold text-slate-900 mb-4 font-display">Application Outcomes</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {byStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card padding={false}>
            <Table columns={[{ key: 'name', header: 'Outcome' }, { key: 'value', header: 'Applications' }]} data={byStatus as unknown as Record<string, unknown>[]} />
          </Card>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Analytics — same real /hods/analytics/ endpoint as the dashboard overview
// ---------------------------------------------------------------------------

function AnalyticsPage({ deptName }: { deptName: string }) {
  const [stats, setStats] = useState<ApiHODAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    hodApi.getAnalytics()
      .then(res => { setStats(res); setLoading(false) })
      .catch(err => { setError(errMsg(err, 'Failed to load department analytics.')); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div>
      <PageHeader title="Department Analytics" subtitle={deptName} />
      <StateBlock loading={loading} error={error} empty={false}
        loadingLabel="Loading analytics..." errorLabel="Failed to load analytics. Try again." emptyLabel="" onRetry={load} />
      {!loading && !error && stats && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <StatCard label="Faculty" value={String(stats.faculty_count)} icon={<Users className="w-5 h-5" />} color="blue" />
          <StatCard label="Students" value={String(stats.student_count)} icon={<GraduationCap className="w-5 h-5" />} color="green" />
          <StatCard label="Courses" value={String(stats.course_count)} icon={<BookOpen className="w-5 h-5" />} color="purple" />
          <StatCard label="Avg Attendance" value={stats.attendance.avg_attendance_pct != null ? `${stats.attendance.avg_attendance_pct}%` : 'N/A'} icon={<ClipboardList className="w-5 h-5" />} color="yellow" />
          <StatCard label="Avg CGPA" value={stats.results.avg_cgpa != null ? String(stats.results.avg_cgpa) : 'N/A'} icon={<BarChart2 className="w-5 h-5" />} color="blue" />
          <StatCard label="Placement Rate" value={stats.placements.placement_rate_pct != null ? `${stats.placements.placement_rate_pct}%` : 'N/A'} icon={<Briefcase className="w-5 h-5" />} color="green" />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reports — CSVs generated client-side, but every row now comes from a real
// backend fetch above; nothing here is a static array anymore.
// ---------------------------------------------------------------------------

function ReportsPage({ deptName }: { deptName: string }) {
  const { data: faculty } = useListFetch<ApiTeacher>(async () => (await teacherApi.getTeachers({ page_size: 200 })).results, [])
  const { data: students } = useListFetch<ApiStudent>(async () => (await studentApi.getStudents({ page_size: 200 })).results, [])
  const { data: attendance } = useListFetch<ApiAttendanceRecord>(async () => (await attendanceApi.getRecords({ page_size: 500 })).results, [])
  const { data: results } = useListFetch<ApiSemesterResult>(async () => (await examResultApi.getResults({ page_size: 500 })).results, [])
  const { data: placements } = useListFetch<ApiPlacementApplication>(async () => (await placementApi.getApplications({ page_size: 500 })).results, [])

  const reports: { name: string; desc: string; rows: Record<string, unknown>[]; file: string }[] = [
    { name: 'Faculty Report', desc: 'Faculty list with designation and status', rows: faculty.map(f => ({ name: `${f.user.first_name} ${f.user.last_name}`, designation: f.designation, employee_id: f.employee_id, is_active: f.is_active })), file: 'faculty-report.csv' },
    { name: 'Student Report', desc: 'Student roster with course and semester', rows: students.map(s => ({ admission_number: s.admission_number, name: `${s.user.first_name} ${s.user.last_name}`, course: s.course_detail?.name, semester: s.current_semester })), file: 'student-report.csv' },
    { name: 'Attendance Report', desc: 'Attendance record status breakdown', rows: attendance.map(a => ({ status: a.status, remarks: a.remarks })), file: 'attendance-report.csv' },
    { name: 'Results Report', desc: 'Semester results with SGPA/CGPA', rows: results.map(r => ({ status: r.result_status, sgpa: r.sgpa, cgpa: r.cgpa })), file: 'results-report.csv' },
    { name: 'Placement Report', desc: 'Placement application outcomes', rows: placements.map(p => ({ status: p.status, applied_at: p.applied_at })), file: 'placement-report.csv' },
  ]

  return (
    <div>
      <PageHeader title="Reports" subtitle={`${deptName} · Generate and download department reports`} />
      <div className="grid sm:grid-cols-2 gap-4">
        {reports.map(r => (
          <Card key={r.name} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900">{r.name}</p>
              <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
            </div>
            <Button size="sm" disabled={!r.rows.length} onClick={() => downloadCsv(r.file, r.rows)}>
              {r.rows.length ? 'Generate' : 'No Data'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AI Department Assistant — no real backend AI endpoint exists for HOD yet.
// Per instructions: never fabricate one; leave it clearly unavailable.
// ---------------------------------------------------------------------------

function AiAssistantPage() {
  return (
    <div>
      <PageHeader title="AI Department Assistant" subtitle="Not yet available" />
      <Card>
        <p className="text-sm text-slate-500">
          The AI Department Assistant is not connected to a backend service yet. This page will
          go live once a real HOD AI endpoint is available — no simulated responses are shown here.
        </p>
      </Card>
    </div>
  )
}

export default function HODDashboard({ page = '' }: { page?: string }) {
  const { hod, loading: hodLoading, error: hodError } = useHodProfile()
  const deptName = hod?.department_detail?.name ?? (hodLoading ? 'Loading…' : 'Your Department')
  const hodName = hod ? `${hod.teacher_detail.user.first_name} ${hod.teacher_detail.user.last_name}` : ''

  const pageMap: Record<string, { title: string; component: React.ReactNode }> = {
    '': { title: 'Dashboard', component: <Dashboard hod={hod} /> },
    'faculty': { title: 'Faculty', component: <FacultyPage deptName={deptName} /> },
    'students': { title: 'Students', component: <StudentsPage deptName={deptName} /> },
    'courses': { title: 'Courses', component: <CoursesPage deptName={deptName} departmentId={hod?.department ?? ''} /> },
    'subjects': { title: 'Subjects', component: <SubjectsPage deptName={deptName} /> },
    'timetable': { title: 'Timetable', component: <TimetablePage deptName={deptName} departmentId={hod?.department ?? ''} /> },
    'attendance': { title: 'Attendance', component: <AttendancePage deptName={deptName} /> },
    'results': { title: 'Results', component: <ResultsPage deptName={deptName} /> },
    'research': { title: 'Research', component: <ResearchPage deptName={deptName} /> },
    'placements': { title: 'Placements', component: <PlacementsPage deptName={deptName} /> },
    'analytics': { title: 'Analytics', component: <AnalyticsPage deptName={deptName} /> },
    'reports': { title: 'Reports', component: <ReportsPage deptName={deptName} /> },
    'ai': { title: 'AI Department Assistant', component: <AiAssistantPage /> },
  }

  const pageData = pageMap[page] ?? pageMap['']

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      role="HOD"
      userName={hodName || 'HOD'}
      userSub={hod ? `${deptName} · Head of Department` : ''}
      pageTitle={pageData.title}
    >
      {hodError && <div className="mb-4"><Alert type="error">{hodError}</Alert></div>}
      {pageData.component}
    </DashboardLayout>
  )
}
