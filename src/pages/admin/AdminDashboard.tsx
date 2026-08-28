import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import {
  LayoutDashboard, GraduationCap, Users, UserCheck, Building, UserPlus, CreditCard,
  Briefcase, Globe, Wrench, Monitor, Shield, FileText, BarChart2, MessageSquare, Search, FileCheck
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { StatCard, Card, Badge, Button, Table, PageHeader, SearchBar, Select, Input, Modal, Alert } from '../../components/ui'
import {
  admissionApi, academicYearApi, courseApi, departmentApi, lookupApi, semesterApi, teacherApi,
  staffApi, studentApi, adminApi, cmsApi, financeApi, placementApi, researchApi, infrastructureApi, examResultApi, certificateApi, ApiError,
  type ApiAdmission, type ApiDepartment, type ApiCourse, type ApiAcademicYear, type ApiSemester,
  type ApiTeacher, type ApiStaff, type ApiStudent, type AdminAnalytics, type AdminUserRow, type AdminRoleRow, type AuditLogRow,
  type ApiContentPage, type ContentPageType,
  type AdminFeeSummaryRow, type ApiPlacementDrive, type ApiResearchProject, type ApiFacility, type ApiSemesterResult,
  type ApiCertificate,
} from '../../services/api'

/* ============================================================
   SHARED DATA SOURCES
   Departments / semesters / statuses are defined once here and
   reused across Students, Teachers, Departments, and Analytics
   so filters and counts never fall out of sync with each other.
   ============================================================ */

interface DeptRow {
  id: string
  code: string
  name: string
  hod: string
  faculty: number
  students: number
  status: string
  desc: string
}

/**
 * initialDepartments (12-row hardcoded mock) removed -- Department
 * Management's source of truth is now GET /departments/ (see
 * DeptsMgmt below and the `departments` state in AdminDashboard's root
 * component). This mapper is the only place mock DeptRow shape meets the
 * real ApiDepartment response, so Students/Teachers/Research/Analytics
 * below keep working unmodified against real data.
 */
function apiDeptToRow(d: ApiDepartment): DeptRow {
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    hod: d.hod_name || 'Unassigned',
    faculty: d.faculty_count ?? 0,
    students: d.student_count ?? 0,
    status: d.is_active ? 'Active' : 'Inactive',
    desc: d.description || '',
  }
}

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8]
const STUDENT_STATUSES = ['Active', 'Inactive', 'Alumni']

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

/* ============================================================
   ENTITY TYPES + INITIAL DATA
   ============================================================ */

/**
 * FeeRow / PlacementRow / ResearchRow / InfraRow and their hardcoded
 * initial* arrays (initialFees, initialPlacements, initialResearch,
 * initialInfra) were removed -- Fee/Placement/Research/Infrastructure
 * Management now read directly from AdminFeeSummaryRow, ApiPlacementDrive,
 * ApiResearchProject, and ApiFacility (see services/api.ts) inside
 * FeesMgmt/PlacementsMgmt/ResearchMgmt/InfrastructureMgmt below.
 */

/* ============================================================
   DASHBOARD
   ============================================================ */

function Dashboard({ departments }: { departments: DeptRow[] }) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const [a, l] = await Promise.all([
        adminApi.getAnalytics(),
        adminApi.getAuditLogs({ page_size: 4 }),
      ])
      setAnalytics(a)
      setRecentLogs(l.results)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load dashboard analytics.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const totals = analytics?.totals
  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="EduVerse College" />
      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={load}>Retry</button></Alert></div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={loading ? '…' : (totals?.students ?? 0).toLocaleString()} icon={<GraduationCap className="w-5 h-5" />} color="blue" change={loading ? undefined : `${totals?.active_students ?? 0} active`} />
        <StatCard label="Faculty Members" value={loading ? '…' : (totals?.teachers ?? 0).toLocaleString()} icon={<Users className="w-5 h-5" />} color="green" change={loading ? undefined : `${totals?.active_teachers ?? 0} active`} />
        <StatCard label="Departments" value={loading ? '…' : (totals?.departments ?? departments.length)} icon={<Building className="w-5 h-5" />} color="purple" />
        <StatCard label="Admissions" value={loading ? '…' : (analytics?.admissions?.total ?? 0).toLocaleString()} icon={<UserPlus className="w-5 h-5" />} color="yellow" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Student Enrollment Trend</h3>
          {loading ? (
            <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
          ) : !analytics?.enrollment_trend?.length ? (
            <p className="text-sm text-slate-400 py-16 text-center">No enrollment data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.enrollment_trend}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="students" stroke="#2563eb" strokeWidth={2.5} fill="url(#blueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Fee Collection (₹)</h3>
          {loading ? (
            <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
          ) : !analytics?.fees?.monthly_collection?.length ? (
            <p className="text-sm text-slate-400 py-16 text-center">No fee payment data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.fees.monthly_collection} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4,4,0,0]} />
                <Bar dataKey="pending" fill="#fca5a5" name="Pending" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Recent System Activity</h3>
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-slate-500 py-4">Loading…</p>
            ) : recentLogs.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No recent activity.</p>
            ) : recentLogs.map(l => (
              <div key={l.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <Badge variant={l.action === 'login' ? 'green' : l.action === 'update' ? 'yellow' : 'slate'}>{l.action}</Badge>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{l.resource} {l.description}</p>
                  <p className="text-xs text-slate-400">{l.user_display} · {new Date(l.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Quick Stats</h3>
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500 py-4">Loading…</p>
            ) : [
              ['Active Staff', String(totals?.active_staff ?? 0), 'green'],
              ['HODs', String(totals?.hods ?? 0), 'blue'],
              ['Active Courses', String(totals?.courses ?? 0), 'purple'],
              ['Placement Applications', String(analytics?.placements?.total_applications ?? 0), 'yellow'],
              ['Fee Payments Recorded', String(analytics?.fees?.total_payments ?? 0), 'slate'],
            ].map(([l, v, c]) => (
              <div key={String(l)} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-600">{l}</span>
                <Badge variant={c as 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'slate'}>{v}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ============================================================
   STUDENT MANAGEMENT
   ============================================================ */

function StudentsMgmt({ departments, notify }: {
  departments: DeptRow[]
  notify: (msg: string) => void
}) {
  const [students, setStudentsList] = useState<ApiStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [viewing, setViewing] = useState<ApiStudent | null>(null)
  const [editing, setEditing] = useState<ApiStudent | null>(null)
  const [editForm, setEditForm] = useState({ phone: '', email: '', guardian_name: '', guardian_phone: '', address: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [pendingStudents, setPendingStudents] = useState<ApiStudent[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)

  async function fetchPendingStudents() {
    setPendingLoading(true)
    try {
      const res = await studentApi.getStudents({ approval_status: 'pending', page_size: 100 })
      setPendingStudents(res.results)
    } catch {
      setPendingStudents([])
    } finally {
      setPendingLoading(false)
    }
  }
  useEffect(() => { fetchPendingStudents() }, [])

  async function fetchStudents() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await studentApi.getStudents({
        search: search || undefined,
        department: deptFilter === 'All' ? undefined : deptFilter,
        is_active: statusFilter === 'All' ? undefined : statusFilter === 'Active',
        page_size: 200,
      })
      setStudentsList(res.results)
      setCount(res.count)
    } catch (err) {
      setStudentsList([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load students.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchStudents() }, [deptFilter, statusFilter])

  const filtered = students.filter(s =>
    `${s.user.first_name} ${s.user.last_name} ${s.student_id ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  function openEdit(s: ApiStudent) {
    setEditForm({ phone: s.phone, email: s.email, guardian_name: s.guardian_name, guardian_phone: s.guardian_phone, address: s.address, password: '' })
    setFormError(null)
    setEditing(s)
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)
    setFormError(null)
    try {
      await studentApi.updateStudent(editing.id, {
        phone: editForm.phone,
        email: editForm.email,
        guardian_name: editForm.guardian_name,
        guardian_phone: editForm.guardian_phone,
        address: editForm.address,
      })
      if (editForm.password && editForm.password.length >= 6) {
        await studentApi.setPassword(editing.id, editForm.password)
      }
      notify(`${editing.user.first_name} updated successfully`)
      setEditing(null)
      await fetchStudents()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update student.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: ApiStudent) {
    if (!window.confirm(`Remove ${row.user.first_name} ${row.user.last_name} (${row.student_id}) from student records?`)) return
    setDeletingId(row.id)
    try {
      await studentApi.deleteStudent(row.id)
      notify(`${row.user.first_name} removed`)
      await fetchStudents()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete student.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleApprove(row: ApiStudent) {
    setApprovingId(row.id)
    try {
      await studentApi.approveStudent(row.id)
      notify(`${row.user.first_name} ${row.user.last_name} approved — account is now active.`)
      await Promise.all([fetchStudents(), fetchPendingStudents()])
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to approve student.')
    } finally {
      setApprovingId(null)
    }
  }

  async function handleReject(row: ApiStudent) {
    if (!window.confirm(`Reject ${row.user.first_name} ${row.user.last_name}'s pending account? They will not be able to log in.`)) return
    setApprovingId(row.id)
    try {
      await studentApi.rejectStudent(row.id)
      notify(`${row.user.first_name} ${row.user.last_name} rejected.`)
      await Promise.all([fetchStudents(), fetchPendingStudents()])
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to reject student.')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Student Management" subtitle={`${count.toLocaleString()} students across all departments — new accounts are created via Admissions or Staff Add Student`} />

      {/* Staff-direct-created students awaiting Admin approval (Priority 14) */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 font-display">Pending Student Approvals</h3>
          <Badge variant="yellow">{pendingStudents.length}</Badge>
        </div>
        {pendingLoading ? (
          <p className="text-sm text-slate-500 py-4 text-center">Loading pending approvals…</p>
        ) : pendingStudents.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No students awaiting approval.</p>
        ) : (
          <Table
            columns={[
              { key: 'student_id', header: 'Student ID', render: r => <span className="font-mono text-xs">{(r as unknown as ApiStudent).student_id ?? '—'}</span> },
              { key: 'name', header: 'Name', render: r => `${(r as unknown as ApiStudent).user.first_name} ${(r as unknown as ApiStudent).user.last_name}` },
              { key: 'department', header: 'Dept', render: r => (r as unknown as ApiStudent).department_detail?.name ?? '—' },
              { key: 'course', header: 'Course', render: r => (r as unknown as ApiStudent).course_detail?.name ?? '—' },
              { key: 'created_at', header: 'Created', render: r => new Date((r as unknown as ApiStudent).created_at).toLocaleDateString() },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiStudent
                  return (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={approvingId === row.id} onClick={() => handleApprove(row)} className="bg-emerald-600 hover:bg-emerald-700">
                        {approvingId === row.id ? '…' : 'Approve'}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={approvingId === row.id} onClick={() => handleReject(row)} className="text-red-600 hover:bg-red-50">
                        Reject
                      </Button>
                    </div>
                  )
                }
              },
            ]}
            data={pendingStudents as unknown as Record<string, unknown>[]}
          />
        )}
      </Card>

      <Card className="mb-4">
        <div className="flex gap-3 flex-wrap items-end">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, ID..." className="flex-1 min-w-48" />
          <Select className="w-40" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="All">All Depts</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
          </Select>
          <Select className="w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </div>
      </Card>

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={fetchStudents}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading students…</p></Card>
      ) : !loadError && filtered.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No students found.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'student_id', header: 'Roll No' },
              { key: 'name', header: 'Name', render: r => `${(r as unknown as ApiStudent).user.first_name} ${(r as unknown as ApiStudent).user.last_name}` },
              { key: 'department', header: 'Dept' },
              { key: 'current_semester', header: 'Sem', render: r => `Sem ${(r as unknown as ApiStudent).current_semester}` },
              { key: 'admission_date', header: 'Admitted' },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={(r as unknown as ApiStudent).is_active ? 'green' : 'red'}>{(r as unknown as ApiStudent).is_active ? 'Active' : 'Inactive'}</Badge> },
              { key: 'approval_status', header: 'Approval', render: r => {
                const st = (r as unknown as ApiStudent).approval_status
                return <Badge variant={st === 'approved' ? 'green' : st === 'rejected' ? 'red' : 'yellow'}>{st}</Badge>
              } },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiStudent
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(row)}>View</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} disabled={deletingId === row.id}>{deletingId === row.id ? 'Removing…' : 'Delete'}</Button>
                    </div>
                  )
                }
              },
            ]}
            data={filtered as unknown as Record<string, unknown>[]}
          />
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">Showing {filtered.length} of {count} students</p>
          </div>
        </Card>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Student Details">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Roll No</span><span className="font-medium text-slate-900">{viewing.student_id}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{viewing.user.first_name} {viewing.user.last_name}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Department</span><span className="font-medium text-slate-900">{viewing.department}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Course</span><span className="font-medium text-slate-900">{viewing.course_detail?.name ?? viewing.course}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Semester</span><span className="font-medium text-slate-900">Sem {viewing.current_semester}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Email</span><span className="font-medium text-slate-900">{viewing.email || '—'}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Phone</span><span className="font-medium text-slate-900">{viewing.phone || '—'}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Guardian</span><span className="font-medium text-slate-900">{viewing.guardian_name || '—'} ({viewing.guardian_phone || '—'})</span></div>
            <div className="flex justify-between pb-2"><span className="text-slate-500">Status</span><Badge variant={viewing.is_active ? 'green' : 'red'}>{viewing.is_active ? 'Active' : 'Inactive'}</Badge></div>
            <Button variant="outline" className="mt-2" onClick={() => setViewing(null)}>Close</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Student">
        {editing && (
          <div className="flex flex-col gap-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <Input label="Email" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
            <Input label="Phone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="Guardian Name" value={editForm.guardian_name} onChange={e => setEditForm({ ...editForm, guardian_name: e.target.value })} />
            <Input label="Guardian Phone" value={editForm.guardian_phone} onChange={e => setEditForm({ ...editForm, guardian_phone: e.target.value })} />
            <Input label="Address" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
            <Input label="Reset Password (optional)" type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" />
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ============================================================
   TEACHER MANAGEMENT
   ============================================================ */

const emptyTeacherForm = {
  first_name: '', last_name: '', department: '', employee_id: '', designation: 'Assistant Professor',
  qualification: '', specialization: '', experience_years: '0', phone: '', email: '', address: '',
  joining_date: new Date().toISOString().slice(0, 10), password: '',
}

function TeachersMgmt({ departments, notify }: {
  departments: DeptRow[]
  notify: (msg: string) => void
}) {
  const [teachers, setTeachers] = useState<ApiTeacher[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [viewing, setViewing] = useState<ApiTeacher | null>(null)
  const [editing, setEditing] = useState<ApiTeacher | null>(null)
  const [form, setForm] = useState(emptyTeacherForm)
  const [editForm, setEditForm] = useState(emptyTeacherForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function fetchTeachers() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await teacherApi.getTeachers({ page_size: 200, ordering: 'department' })
      setTeachers(res.results)
    } catch (err) {
      setTeachers([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load teachers.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchTeachers() }, [])

  const filtered = teachers.filter(t =>
    (`${t.user.first_name} ${t.user.last_name}`.toLowerCase().includes(search.toLowerCase()) || t.employee_id.toLowerCase().includes(search.toLowerCase())) &&
    (deptFilter === 'All' || t.department === deptFilter)
  )

  // department is stored/transmitted as the Department UUID; resolve it to
  // a human-readable "CODE – Name" for display purposes only.
  function deptLabel(id: string) {
    const d = departments.find(d => d.id === id)
    return d ? `${d.code} – ${d.name}` : id
  }

  function openEdit(t: ApiTeacher) {
    setEditForm({
      first_name: t.user.first_name, last_name: t.user.last_name, department: t.department,
      employee_id: t.employee_id, designation: t.designation, qualification: t.qualification,
      specialization: t.specialization, experience_years: String(t.experience_years), phone: t.phone,
      email: t.email, address: t.address, joining_date: t.joining_date, password: '',
    })
    setFormError(null)
    setEditing(t)
  }

  async function handleCreate() {
    if (!form.first_name.trim()) { setFormError('Please enter a first name.'); return }
    if (!form.department) { setFormError('Please select a department.'); return }
    if (!form.employee_id.trim()) { setFormError('Please enter an employee ID.'); return }
    if (!form.password || form.password.length < 6) { setFormError('Password must be at least 6 characters.'); return }
    setSaving(true)
    setFormError(null)
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
      notify(`${form.first_name} ${form.last_name} added successfully`)
      setForm(emptyTeacherForm)
      setShowAdd(false)
      await fetchTeachers()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create teacher.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)
    setFormError(null)
    try {
      await teacherApi.updateTeacher(editing.id, {
        user_details: { first_name: editForm.first_name.trim(), last_name: editForm.last_name.trim() },
        department: editForm.department,
        employee_id: editForm.employee_id.trim(),
        designation: editForm.designation,
        qualification: editForm.qualification,
        specialization: editForm.specialization,
        experience_years: Number(editForm.experience_years) || 0,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
        joining_date: editForm.joining_date,
      })
      if (editForm.password && editForm.password.length >= 6) {
        await teacherApi.setPassword(editing.id, editForm.password)
      }
      notify(`${editForm.first_name} ${editForm.last_name} updated successfully`)
      setEditing(null)
      await fetchTeachers()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update teacher.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: ApiTeacher) {
    if (!window.confirm(`Remove ${row.user.first_name} ${row.user.last_name} (${row.employee_id}) from faculty records?`)) return
    setDeletingId(row.id)
    try {
      await teacherApi.deleteTeacher(row.id)
      notify(`${row.user.first_name} removed`)
      await fetchTeachers()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete teacher.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Teacher Management" subtitle={`${teachers.length} faculty members across all departments`}
        actions={<Button size="sm" onClick={() => { setForm(emptyTeacherForm); setFormError(null); setShowAdd(true) }}>+ Add Teacher</Button>} />
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search teachers..." className="flex-1 min-w-48" />
        <Select className="w-44" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="All">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
        </Select>
      </div>

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={fetchTeachers}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading teachers…</p></Card>
      ) : !loadError && filtered.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No teachers found.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'employee_id', header: 'Emp ID' },
              { key: 'name', header: 'Name', render: r => `${(r as unknown as ApiTeacher).user.first_name} ${(r as unknown as ApiTeacher).user.last_name}` },
              { key: 'department', header: 'Department', render: r => deptLabel((r as unknown as ApiTeacher).department) }, { key: 'designation', header: 'Designation' },
              { key: 'experience_years', header: 'Experience', render: r => `${(r as unknown as ApiTeacher).experience_years} yrs` },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={(r as unknown as ApiTeacher).is_active ? 'green' : 'red'}>{(r as unknown as ApiTeacher).is_active ? 'Active' : 'Inactive'}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiTeacher
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(row)}>View</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} disabled={deletingId === row.id}>{deletingId === row.id ? 'Removing…' : 'Delete'}</Button>
                    </div>
                  )
                }
              },
            ]}
            data={filtered as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Teacher Details">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Emp ID</span><span className="font-medium text-slate-900">{viewing.employee_id}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{viewing.user.first_name} {viewing.user.last_name}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Department</span><span className="font-medium text-slate-900">{deptLabel(viewing.department)}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Designation</span><span className="font-medium text-slate-900">{viewing.designation}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Qualification</span><span className="font-medium text-slate-900">{viewing.qualification || '—'}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Experience</span><span className="font-medium text-slate-900">{viewing.experience_years} yrs</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Email</span><span className="font-medium text-slate-900">{viewing.email || '—'}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Phone</span><span className="font-medium text-slate-900">{viewing.phone || '—'}</span></div>
            <div className="flex justify-between pb-2"><span className="text-slate-500">Status</span><Badge variant={viewing.is_active ? 'green' : 'red'}>{viewing.is_active ? 'Active' : 'Inactive'}</Badge></div>
            <Button variant="outline" className="mt-2" onClick={() => setViewing(null)}>Close</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Teacher">
        {editing && (
          <div className="flex flex-col gap-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
              <Input label="Last Name" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
            </div>
            <Select label="Department" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })}>
              {departments.map(d => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
            </Select>
            <Input label="Employee ID" value={editForm.employee_id} onChange={e => setEditForm({ ...editForm, employee_id: e.target.value })} />
            <Input label="Designation" value={editForm.designation} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} />
            <Input label="Qualification" value={editForm.qualification} onChange={e => setEditForm({ ...editForm, qualification: e.target.value })} />
            <Input label="Specialization" value={editForm.specialization} onChange={e => setEditForm({ ...editForm, specialization: e.target.value })} />
            <Input label="Experience (years)" type="number" min={0} value={editForm.experience_years} onChange={e => setEditForm({ ...editForm, experience_years: e.target.value })} />
            <Input label="Email" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
            <Input label="Phone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="Address" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="Street, City, State" />
            <Input label="Reset Password (optional)" type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" />
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Teacher">
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Jane" />
            <Input label="Last Name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Doe" />
          </div>
          <Select label="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
            <option value="">Select department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
          </Select>
          <Input label="Employee ID" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} placeholder="e.g. EMP1042" />
          <Input label="Designation" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="Assistant Professor" />
          <Input label="Qualification" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="Ph.D. Computer Science" />
          <Input label="Specialization" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="Machine Learning" />
          <Input label="Experience (years)" type="number" min={0} value={form.experience_years} onChange={e => setForm({ ...form, experience_years: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@edu.in" />
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street, City, State" />
          <Input label="Login Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Teacher'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   STAFF MANAGEMENT
   ============================================================ */

const emptyStaffForm = {
  first_name: '', last_name: '', department: '', employee_id: '', designation: 'Administrative Staff',
  phone: '', email: '', address: '', joining_date: new Date().toISOString().slice(0, 10), password: '',
}

function StaffMgmt({ departments, notify }: {
  departments: DeptRow[]
  notify: (msg: string) => void
}) {
  const [staff, setStaff] = useState<ApiStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [viewing, setViewing] = useState<ApiStaff | null>(null)
  const [editing, setEditing] = useState<ApiStaff | null>(null)
  const [form, setForm] = useState(emptyStaffForm)
  const [editForm, setEditForm] = useState(emptyStaffForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function fetchStaff() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await staffApi.getStaff({ page_size: 200 })
      setStaff(res.results)
    } catch (err) {
      setStaff([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load staff.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchStaff() }, [])

  const filtered = staff.filter(s =>
    `${s.user.first_name} ${s.user.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.employee_id.toLowerCase().includes(search.toLowerCase())
  )

  // department is stored/transmitted as the Department UUID; resolve it to
  // a human-readable "CODE – Name" for display purposes only.
  function deptLabel(id: string) {
    const d = departments.find(d => d.id === id)
    return d ? `${d.code} – ${d.name}` : id
  }

  function openEdit(s: ApiStaff) {
    setEditForm({
      first_name: s.user.first_name, last_name: s.user.last_name, department: s.department,
      employee_id: s.employee_id, designation: s.designation, phone: s.phone, email: s.email,
      address: s.address, joining_date: s.joining_date, password: '',
    })
    setFormError(null)
    setEditing(s)
  }

  async function handleCreate() {
    if (!form.first_name.trim()) { setFormError('Please enter a first name.'); return }
    if (!form.department) { setFormError('Please select a department.'); return }
    if (!form.employee_id.trim()) { setFormError('Please enter an employee ID.'); return }
    if (!form.password || form.password.length < 6) { setFormError('Password must be at least 6 characters.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await staffApi.createStaff({
        user_details: { first_name: form.first_name.trim(), last_name: form.last_name.trim(), password: form.password },
        department: form.department,
        employee_id: form.employee_id.trim(),
        designation: form.designation,
        phone: form.phone,
        email: form.email,
        address: form.address,
        joining_date: form.joining_date,
      })
      notify(`${form.first_name} ${form.last_name} added successfully`)
      setForm(emptyStaffForm)
      setShowAdd(false)
      await fetchStaff()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create staff member.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)
    setFormError(null)
    try {
      await staffApi.updateStaff(editing.id, {
        department: editForm.department,
        employee_id: editForm.employee_id.trim(),
        designation: editForm.designation,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
        joining_date: editForm.joining_date,
      })
      if (editForm.password && editForm.password.length >= 6) {
        await staffApi.setPassword(editing.id, editForm.password)
      }
      notify(`${editForm.first_name} ${editForm.last_name} updated successfully`)
      setEditing(null)
      await fetchStaff()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update staff member.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: ApiStaff) {
    if (!window.confirm(`Remove ${row.user.first_name} ${row.user.last_name} (${row.employee_id}) from staff records?`)) return
    setDeletingId(row.id)
    try {
      await staffApi.deleteStaff(row.id)
      notify(`${row.user.first_name} removed`)
      await fetchStaff()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete staff member.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Staff Management" subtitle={`${staff.length} staff members`}
        actions={<Button size="sm" onClick={() => { setForm(emptyStaffForm); setFormError(null); setShowAdd(true) }}>+ Add Staff</Button>} />
      <Card className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search staff..." className="min-w-48" />
      </Card>

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={fetchStaff}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading staff…</p></Card>
      ) : !loadError && filtered.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No staff members found.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'employee_id', header: 'Staff ID' },
              { key: 'name', header: 'Name', render: r => `${(r as unknown as ApiStaff).user.first_name} ${(r as unknown as ApiStaff).user.last_name}` },
              { key: 'designation', header: 'Role' }, { key: 'department', header: 'Department/Office', render: r => deptLabel((r as unknown as ApiStaff).department) },
              { key: 'joining_date', header: 'Joined' },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={(r as unknown as ApiStaff).is_active ? 'green' : 'yellow'}>{(r as unknown as ApiStaff).is_active ? 'Active' : 'Inactive'}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiStaff
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(row)}>View</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} disabled={deletingId === row.id}>{deletingId === row.id ? 'Removing…' : 'Delete'}</Button>
                    </div>
                  )
                }
              },
            ]}
            data={filtered as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Staff Details">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Staff ID</span><span className="font-medium text-slate-900">{viewing.employee_id}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{viewing.user.first_name} {viewing.user.last_name}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Role</span><span className="font-medium text-slate-900">{viewing.designation}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Department/Office</span><span className="font-medium text-slate-900">{deptLabel(viewing.department)}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Joined</span><span className="font-medium text-slate-900">{viewing.joining_date}</span></div>
            <div className="flex justify-between pb-2"><span className="text-slate-500">Status</span><Badge variant={viewing.is_active ? 'green' : 'yellow'}>{viewing.is_active ? 'Active' : 'Inactive'}</Badge></div>
            <Button variant="outline" className="mt-2" onClick={() => setViewing(null)}>Close</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Staff">
        {editing && (
          <div className="flex flex-col gap-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
              <Input label="Last Name" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
            </div>
            <Select label="Department" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })}>
              {departments.map(d => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
            </Select>
            <Input label="Employee ID" value={editForm.employee_id} onChange={e => setEditForm({ ...editForm, employee_id: e.target.value })} />
            <Input label="Role" value={editForm.designation} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} />
            <Input label="Email" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
            <Input label="Phone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="Address" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="Street, City, State" />
            <Input label="Reset Password (optional)" type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" />
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Staff">
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="First name" />
            <Input label="Last Name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Last name" />
          </div>
          <Select label="Department/Office" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
            <option value="">Select department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
          </Select>
          <Input label="Employee ID" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} placeholder="e.g. STF1042" />
          <Input label="Role" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Senior Clerk" />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street, City, State" />
          <Input label="Login Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Add Staff'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   DEPARTMENT MANAGEMENT
   ============================================================ */

function DeptsMgmt({ departments, loading, loadError, refresh, notify }: {
  departments: DeptRow[]
  loading: boolean
  loadError: string | null
  refresh: () => void
  notify: (msg: string) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [viewing, setViewing] = useState<DeptRow | null>(null)
  const [editing, setEditing] = useState<DeptRow | null>(null)
  const [form, setForm] = useState({ code: '', name: '', desc: '' })
  const [editForm, setEditForm] = useState({ code: '', name: '', desc: '', status: 'Active' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openEdit(row: DeptRow) {
    setEditForm({ code: row.code, name: row.name, desc: row.desc, status: row.status })
    setFormError(null)
    setEditing(row)
  }

  async function handleCreate() {
    if (!form.name.trim()) { setFormError('Please enter a department name'); return }
    if (!form.code.trim()) { setFormError('Please enter a department code'); return }
    setSaving(true)
    setFormError(null)
    try {
      await departmentApi.createDepartment({ code: form.code.toUpperCase(), name: form.name.trim(), description: form.desc })
      notify(`${form.name} added successfully`)
      setForm({ code: '', name: '', desc: '' })
      setShowAdd(false)
      refresh()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create department.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    if (!editForm.name.trim()) { setFormError('Please enter a department name'); return }
    setSaving(true)
    setFormError(null)
    try {
      await departmentApi.updateDepartment(editing.id, {
        code: editForm.code.toUpperCase(),
        name: editForm.name.trim(),
        description: editForm.desc,
        is_active: editForm.status === 'Active',
      })
      notify(`${editForm.name} updated successfully`)
      setEditing(null)
      refresh()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update department.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: DeptRow) {
    if (!window.confirm(`Delete ${row.name}? This cannot be undone.`)) return
    setDeletingId(row.id)
    try {
      await departmentApi.deleteDepartment(row.id)
      notify(`${row.name} deleted successfully`)
      refresh()
    } catch (err) {
      // Backend returns 400 with a readable message when the department is
      // still referenced (PROTECT) by students/teachers/courses/etc.
      notify(err instanceof ApiError ? err.message : 'Failed to delete department.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Departments" subtitle={`${departments.length} departments`} actions={<Button size="sm" onClick={() => { setForm({ code: '', name: '', desc: '' }); setFormError(null); setShowAdd(true) }}>+ Add Department</Button>} />

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={refresh}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading departments…</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'name', header: 'Department Name' }, { key: 'hod', header: 'Head of Department' },
              { key: 'faculty', header: 'Faculty Count' }, { key: 'students', header: 'Students' },
              { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'Active' ? 'green' : 'slate'}>{String(r.status)}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as DeptRow
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(row)}>View</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} disabled={deletingId === row.id}>
                        {deletingId === row.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  )
                }
              },
            ]}
            data={departments as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Department Details" size="lg">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Code</span><span className="font-medium text-slate-900">{viewing.code}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{viewing.name}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Head of Department</span><span className="font-medium text-slate-900">{viewing.hod}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Faculty Count</span><span className="font-medium text-slate-900">{viewing.faculty}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Students</span><span className="font-medium text-slate-900">{viewing.students}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Status</span><span className="font-medium text-slate-900">{viewing.status}</span></div>
            {viewing.desc && <p className="text-slate-600">{viewing.desc}</p>}
            <Button variant="outline" className="mt-2" onClick={() => setViewing(null)}>Close</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Department">
        {editing && (
          <div className="flex flex-col gap-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <Input label="Department Code" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value })} />
            <Input label="Department Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            <Input label="Description" value={editForm.desc} onChange={e => setEditForm({ ...editForm, desc: e.target.value })} />
            <Select label="Status" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
              <option>Active</option><option>Inactive</option>
            </Select>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Department">
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}
          <Input label="Department Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. AERO" />
          <Input label="Department Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aerospace Engineering" />
          <Input label="Description" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="Optional" />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Adding…' : 'Add Department'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   COURSE MANAGEMENT
   ============================================================ */

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

const emptyCourseForm = {
  department: '', name: '', code: '', degree: 'bachelor', duration_years: '4', total_semesters: '8', description: '',
}

function CoursesMgmt({ notify }: { notify: (msg: string) => void }) {
  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [realDepartments, setRealDepartments] = useState<ApiDepartment[]>([])

  const [showAdd, setShowAdd] = useState(false)
  const [viewing, setViewing] = useState<ApiCourse | null>(null)
  const [editing, setEditing] = useState<ApiCourse | null>(null)
  const [form, setForm] = useState(emptyCourseForm)
  const [editForm, setEditForm] = useState(emptyCourseForm)
  const [status, setStatus] = useState('Active')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    lookupApi.getDepartments().then(setRealDepartments).catch(() => {})
  }, [])

  async function fetchCourses() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await courseApi.getCourses({ page_size: 200, ordering: 'department' })
      setCourses(res.results)
    } catch (err) {
      setCourses([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load courses.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchCourses() }, [])

  function openEdit(c: ApiCourse) {
    setEditForm({
      department: c.department, name: c.name, code: c.code, degree: c.degree,
      duration_years: String(c.duration_years), total_semesters: String(c.total_semesters),
      description: c.description || '',
    })
    setStatus(c.is_active ? 'Active' : 'Inactive')
    setFormError(null)
    setEditing(c)
  }

  async function handleCreate() {
    if (!form.department) { setFormError('Please select a department.'); return }
    if (!form.name.trim()) { setFormError('Please enter a course name.'); return }
    if (!form.code.trim()) { setFormError('Please enter a course code.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await courseApi.createCourse({
        department: form.department,
        name: form.name.trim(),
        code: form.code.toUpperCase(),
        degree: form.degree,
        duration_years: Number(form.duration_years) || 1,
        total_semesters: Number(form.total_semesters) || 1,
        description: form.description,
      })
      notify(`${form.name} added successfully`)
      setForm(emptyCourseForm)
      setShowAdd(false)
      await fetchCourses()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create course.')
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
        department: editForm.department,
        name: editForm.name.trim(),
        code: editForm.code.toUpperCase(),
        degree: editForm.degree,
        duration_years: Number(editForm.duration_years) || 1,
        total_semesters: Number(editForm.total_semesters) || 1,
        description: editForm.description,
        is_active: status === 'Active',
      })
      notify(`${editForm.name} updated successfully`)
      setEditing(null)
      await fetchCourses()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update course.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: ApiCourse) {
    if (!window.confirm(`Delete ${c.name}? This cannot be undone.`)) return
    setDeletingId(c.id)
    try {
      await courseApi.deleteCourse(c.id)
      notify(`${c.name} deleted successfully`)
      await fetchCourses()
    } catch (err) {
      // Backend returns 400 with a readable message when the course is
      // still referenced (PROTECT) by semesters/students/subjects/etc.
      notify(err instanceof ApiError ? err.message : 'Failed to delete course.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Courses" subtitle={`${courses.length} courses`} actions={<Button size="sm" onClick={() => { setForm(emptyCourseForm); setFormError(null); setShowAdd(true) }}>+ Add Course</Button>} />

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={fetchCourses}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading courses…</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'name', header: 'Course Name' },
              { key: 'code', header: 'Code' },
              { key: 'department', header: 'Department', render: r => (r as unknown as ApiCourse).department_detail?.name ?? '—' },
              { key: 'degree', header: 'Degree', render: r => degreeLabel(String((r as unknown as ApiCourse).degree)) },
              { key: 'duration_years', header: 'Duration (yrs)' },
              { key: 'total_semesters', header: 'Semesters' },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={(r as unknown as ApiCourse).is_active ? 'green' : 'slate'}>{(r as unknown as ApiCourse).is_active ? 'Active' : 'Inactive'}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiCourse
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(row)}>View</Button>
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

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Course Details" size="lg">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Code</span><span className="font-medium text-slate-900">{viewing.code}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{viewing.name}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Department</span><span className="font-medium text-slate-900">{viewing.department_detail?.name ?? '—'}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Degree</span><span className="font-medium text-slate-900">{degreeLabel(viewing.degree)}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Duration</span><span className="font-medium text-slate-900">{viewing.duration_years} years</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Total Semesters</span><span className="font-medium text-slate-900">{viewing.total_semesters}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Semesters Configured</span><span className="font-medium text-slate-900">{viewing.semester_count ?? 0}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Status</span><span className="font-medium text-slate-900">{viewing.is_active ? 'Active' : 'Inactive'}</span></div>
            {viewing.description && <p className="text-slate-600">{viewing.description}</p>}
            <Button variant="outline" className="mt-2" onClick={() => setViewing(null)}>Close</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Course">
        {editing && (
          <div className="flex flex-col gap-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <Select label="Department" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })}>
              {realDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
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
          <Select label="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
            <option value="">Select department</option>
            {realDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
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

/* ============================================================
   ACADEMIC YEAR MANAGEMENT
   ============================================================ */

const emptyAcademicYearForm = { name: '', start_date: '', end_date: '', is_current: false }

function AcademicYearMgmt({ notify }: { notify: (msg: string) => void }) {
  const [years, setYears] = useState<ApiAcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [viewing, setViewing] = useState<ApiAcademicYear | null>(null)
  const [editing, setEditing] = useState<ApiAcademicYear | null>(null)
  const [form, setForm] = useState(emptyAcademicYearForm)
  const [editForm, setEditForm] = useState(emptyAcademicYearForm)
  const [status, setStatus] = useState('Active')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function fetchYears() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await academicYearApi.getAcademicYears({ page_size: 200, ordering: '-start_date' })
      setYears(res.results)
    } catch (err) {
      setYears([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load academic years.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchYears() }, [])

  function openEdit(y: ApiAcademicYear) {
    setEditForm({ name: y.name, start_date: y.start_date, end_date: y.end_date, is_current: y.is_current })
    setStatus(y.is_active ? 'Active' : 'Inactive')
    setFormError(null)
    setEditing(y)
  }

  async function handleCreate() {
    if (!form.name.trim()) { setFormError('Please enter an academic year name.'); return }
    if (!form.start_date) { setFormError('Please select a start date.'); return }
    if (!form.end_date) { setFormError('Please select an end date.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await academicYearApi.createAcademicYear({
        name: form.name.trim(), start_date: form.start_date, end_date: form.end_date, is_current: form.is_current,
      })
      notify(`${form.name} added successfully`)
      setForm(emptyAcademicYearForm)
      setShowAdd(false)
      await fetchYears()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create academic year.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    if (!editForm.name.trim()) { setFormError('Please enter an academic year name.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await academicYearApi.updateAcademicYear(editing.id, {
        name: editForm.name.trim(), start_date: editForm.start_date, end_date: editForm.end_date,
        is_current: editForm.is_current, is_active: status === 'Active',
      })
      notify(`${editForm.name} updated successfully`)
      setEditing(null)
      await fetchYears()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update academic year.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(y: ApiAcademicYear) {
    if (!window.confirm(`Delete ${y.name}? This cannot be undone.`)) return
    setDeletingId(y.id)
    try {
      await academicYearApi.deleteAcademicYear(y.id)
      notify(`${y.name} deleted successfully`)
      await fetchYears()
    } catch (err) {
      // Backend returns 400 with a readable message when the academic
      // year is still referenced (PROTECT) by semesters/fees/admissions.
      notify(err instanceof ApiError ? err.message : 'Failed to delete academic year.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Academic Years" subtitle={`${years.length} academic years`} actions={<Button size="sm" onClick={() => { setForm(emptyAcademicYearForm); setFormError(null); setShowAdd(true) }}>+ Add Academic Year</Button>} />

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={fetchYears}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading academic years…</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'start_date', header: 'Start Date' },
              { key: 'end_date', header: 'End Date' },
              { key: 'is_current', header: 'Current', render: r => (r as unknown as ApiAcademicYear).is_current ? <Badge variant="blue">Current</Badge> : <span className="text-slate-400">—</span> },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={(r as unknown as ApiAcademicYear).is_active ? 'green' : 'slate'}>{(r as unknown as ApiAcademicYear).is_active ? 'Active' : 'Inactive'}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiAcademicYear
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(row)}>View</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} disabled={deletingId === row.id}>
                        {deletingId === row.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  )
                }
              },
            ]}
            data={years as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Academic Year Details">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{viewing.name}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Start Date</span><span className="font-medium text-slate-900">{viewing.start_date}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">End Date</span><span className="font-medium text-slate-900">{viewing.end_date}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Current</span><span className="font-medium text-slate-900">{viewing.is_current ? 'Yes' : 'No'}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Status</span><span className="font-medium text-slate-900">{viewing.is_active ? 'Active' : 'Inactive'}</span></div>
            <Button variant="outline" className="mt-2" onClick={() => setViewing(null)}>Close</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Academic Year">
        {editing && (
          <div className="flex flex-col gap-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <Input label="Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="e.g. 2026-2027" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} />
              <Input label="End Date" type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={editForm.is_current} onChange={e => setEditForm({ ...editForm, is_current: e.target.checked })} />
              Set as current academic year
            </label>
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Academic Year">
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2026-2027" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_current} onChange={e => setForm({ ...form, is_current: e.target.checked })} />
            Set as current academic year
          </label>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Adding…' : 'Add Academic Year'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   SEMESTER MANAGEMENT
   ============================================================ */

const emptySemesterForm = { academic_year: '', course: '', semester_number: '1', name: '', start_date: '', end_date: '' }

function SemesterMgmt({ notify }: { notify: (msg: string) => void }) {
  const [semesters, setSemesters] = useState<ApiSemester[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [realAcademicYears, setRealAcademicYears] = useState<ApiAcademicYear[]>([])
  const [realCourses, setRealCourses] = useState<ApiCourse[]>([])

  const [showAdd, setShowAdd] = useState(false)
  const [viewing, setViewing] = useState<ApiSemester | null>(null)
  const [editing, setEditing] = useState<ApiSemester | null>(null)
  const [form, setForm] = useState(emptySemesterForm)
  const [editForm, setEditForm] = useState(emptySemesterForm)
  const [status, setStatus] = useState('Active')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    lookupApi.getAcademicYears().then(setRealAcademicYears).catch(() => {})
    lookupApi.getCourses().then(setRealCourses).catch(() => {})
  }, [])

  async function fetchSemesters() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await semesterApi.getSemesters({ page_size: 200, ordering: 'academic_year' })
      setSemesters(res.results)
    } catch (err) {
      setSemesters([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load semesters.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchSemesters() }, [])

  function openEdit(s: ApiSemester) {
    setEditForm({
      academic_year: s.academic_year, course: s.course, semester_number: String(s.semester_number),
      name: s.name || '', start_date: s.start_date, end_date: s.end_date,
    })
    setStatus(s.is_active ? 'Active' : 'Inactive')
    setFormError(null)
    setEditing(s)
  }

  async function handleCreate() {
    if (!form.academic_year) { setFormError('Please select an academic year.'); return }
    if (!form.course) { setFormError('Please select a course.'); return }
    if (!form.start_date) { setFormError('Please select a start date.'); return }
    if (!form.end_date) { setFormError('Please select an end date.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await semesterApi.createSemester({
        academic_year: form.academic_year, course: form.course,
        semester_number: Number(form.semester_number) || 1,
        name: form.name, start_date: form.start_date, end_date: form.end_date,
      })
      notify('Semester added successfully')
      setForm(emptySemesterForm)
      setShowAdd(false)
      await fetchSemesters()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create semester.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)
    setFormError(null)
    try {
      await semesterApi.updateSemester(editing.id, {
        academic_year: editForm.academic_year, course: editForm.course,
        semester_number: Number(editForm.semester_number) || 1,
        name: editForm.name, start_date: editForm.start_date, end_date: editForm.end_date,
        is_active: status === 'Active',
      })
      notify('Semester updated successfully')
      setEditing(null)
      await fetchSemesters()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update semester.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(s: ApiSemester) {
    if (!window.confirm('Delete this semester? This cannot be undone.')) return
    setDeletingId(s.id)
    try {
      await semesterApi.deleteSemester(s.id)
      notify('Semester deleted successfully')
      await fetchSemesters()
    } catch (err) {
      // Backend returns 400 with a readable message when the semester is
      // still referenced (PROTECT) by students/timetables/examinations/etc.
      notify(err instanceof ApiError ? err.message : 'Failed to delete semester.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Semesters" subtitle={`${semesters.length} semesters`} actions={<Button size="sm" onClick={() => { setForm(emptySemesterForm); setFormError(null); setShowAdd(true) }}>+ Add Semester</Button>} />

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={fetchSemesters}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading semesters…</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'semester_number', header: 'Sem #', render: r => `Semester ${(r as unknown as ApiSemester).semester_number}` },
              { key: 'course', header: 'Course', render: r => (r as unknown as ApiSemester).course_detail?.name ?? '—' },
              { key: 'academic_year', header: 'Academic Year', render: r => (r as unknown as ApiSemester).academic_year_detail?.name ?? '—' },
              { key: 'start_date', header: 'Start Date' },
              { key: 'end_date', header: 'End Date' },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={(r as unknown as ApiSemester).is_active ? 'green' : 'slate'}>{(r as unknown as ApiSemester).is_active ? 'Active' : 'Inactive'}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiSemester
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(row)}>View</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} disabled={deletingId === row.id}>
                        {deletingId === row.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  )
                }
              },
            ]}
            data={semesters as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Semester Details">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Semester #</span><span className="font-medium text-slate-900">{viewing.semester_number}</span></div>
            {viewing.name && <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{viewing.name}</span></div>}
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Course</span><span className="font-medium text-slate-900">{viewing.course_detail?.name ?? '—'}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Academic Year</span><span className="font-medium text-slate-900">{viewing.academic_year_detail?.name ?? '—'}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Start Date</span><span className="font-medium text-slate-900">{viewing.start_date}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">End Date</span><span className="font-medium text-slate-900">{viewing.end_date}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Status</span><span className="font-medium text-slate-900">{viewing.is_active ? 'Active' : 'Inactive'}</span></div>
            <Button variant="outline" className="mt-2" onClick={() => setViewing(null)}>Close</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Semester">
        {editing && (
          <div className="flex flex-col gap-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <Select label="Academic Year" value={editForm.academic_year} onChange={e => setEditForm({ ...editForm, academic_year: e.target.value })}>
              {realAcademicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </Select>
            <Select label="Course" value={editForm.course} onChange={e => setEditForm({ ...editForm, course: e.target.value })}>
              {realCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Semester Number" type="number" value={editForm.semester_number} onChange={e => setEditForm({ ...editForm, semester_number: e.target.value })} />
              <Input label="Name (optional)" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} />
              <Input label="End Date" type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} />
            </div>
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Semester">
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}
          <Select label="Academic Year" value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })}>
            <option value="">Select academic year</option>
            {realAcademicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </Select>
          <Select label="Course" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })}>
            <option value="">Select course</option>
            {realCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Semester Number" type="number" value={form.semester_number} onChange={e => setForm({ ...form, semester_number: e.target.value })} />
            <Input label="Name (optional)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Adding…' : 'Add Semester'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   ADMISSION MANAGEMENT
   ============================================================ */

function AdmissionsMgmt({ notify }: { notify: (msg: string) => void }) {
  const [admissions, setAdmissionsList] = useState<ApiAdmission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [realDepartments, setRealDepartments] = useState<ApiDepartment[]>([])
  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [academicYears, setAcademicYears] = useState<ApiAcademicYear[]>([])

  const [showNew, setShowNew] = useState(false)
  const emptyForm = {
    first_name: '', last_name: '', email: '', phone: '', date_of_birth: '',
    gender: 'male' as 'male' | 'female' | 'other', guardian_name: '', guardian_phone: '', address: '',
    roll_number: '', department: '', course: '', academic_year: '',
    admission_date: new Date().toISOString().slice(0, 10), admission_type: 'regular' as 'regular' | 'lateral' | 'management',
    previous_school: '', previous_percentage: '', entrance_exam_score: '', remarks: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    lookupApi.getDepartments().then(setRealDepartments).catch(() => {})
    lookupApi.getCourses().then(setCourses).catch(() => {})
    lookupApi.getAcademicYears().then(setAcademicYears).catch(() => {})
  }, [])

  async function fetchAdmissions() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await admissionApi.getAdmissions({ page_size: 100, ordering: 'application_number' })
      setAdmissionsList(res.results)
    } catch (err) {
      setAdmissionsList([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load admissions.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchAdmissions() }, [])

  const coursesForDept = (deptId: string) => courses.filter(c => c.department === deptId)

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

  async function handleDelete(a: ApiAdmission) {
    if (!window.confirm(`Delete registration for ${a.full_name}? This cannot be undone.`)) return
    setUpdatingId(a.id)
    try {
      await admissionApi.deleteAdmission(a.id)
      notify(`Registration for ${a.full_name} deleted`)
      await fetchAdmissions()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete registration.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleCreate() {
    if (!form.first_name.trim()) { setCreateError('Applicant first name is required.'); return }
    if (!form.department) { setCreateError('Please select a department.'); return }
    if (!form.course) { setCreateError('Please select a course.'); return }
    if (!form.academic_year) { setCreateError('Please select an academic year.'); return }

    setCreating(true)
    setCreateError(null)
    try {
      // Backend generates the application number and any Student ID later --
      // this form only ever creates a REGISTRATION record, never a login account.
      const applicationNumber = `APP${Date.now().toString().slice(-8)}`
      await admissionApi.createAdmission({
        application_number: applicationNumber,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email,
        phone: form.phone,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        guardian_name: form.guardian_name,
        guardian_phone: form.guardian_phone,
        address: form.address,
        roll_number: form.roll_number,
        department: form.department,
        course: form.course,
        academic_year: form.academic_year,
        admission_date: form.admission_date,
        admission_type: form.admission_type,
        admission_status: 'pending',
        previous_school: form.previous_school,
        previous_percentage: Number(form.previous_percentage) || 0,
        entrance_exam_score: form.entrance_exam_score ? Number(form.entrance_exam_score) : null,
        remarks: form.remarks,
      })
      notify(`Registration submitted for ${form.first_name} ${form.last_name}. Staff will review it in Student Management.`)
      setForm(emptyForm)
      setShowNew(false)
      await fetchAdmissions()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to submit registration.')
    } finally {
      setCreating(false)
    }
  }

  const pending = admissions.filter(a => a.admission_status === 'pending').length
  const approved = admissions.filter(a => a.admission_status === 'approved').length
  const rejected = admissions.filter(a => a.admission_status === 'rejected').length

  return (
    <div>
      <PageHeader title="Admission Management" subtitle="Student Registration Form — creates a registration record only; Staff creates the login account afterwards"
        actions={<>
          <Button size="sm" variant="secondary" onClick={() => downloadCsv('admissions.csv', admissions as unknown as Record<string, unknown>[])}>Export</Button>
          <Button size="sm" onClick={() => { setCreateError(null); setForm(emptyForm); setShowNew(true) }}>+ New Application</Button>
        </>} />
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[[String(admissions.length), 'Total Applications'], [String(pending), 'Pending Review'], [String(approved), 'Approved'], [String(rejected), 'Rejected']].map(([v, l]) => (
          <Card key={l} className="text-center p-4"><div className="text-2xl font-bold text-slate-900 font-display">{v}</div><div className="text-xs text-slate-500 mt-0.5">{l}</div></Card>
        ))}
      </div>

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={() => fetchAdmissions()}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading registrations…</p></Card>
      ) : !loadError && admissions.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No admission registrations yet.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'application_number', header: 'App ID' },
              { key: 'full_name', header: 'Applicant' },
              { key: 'dept', header: 'Department', render: r => (r as unknown as ApiAdmission).department_detail?.name ?? '—' },
              { key: 'admission_date', header: 'Applied On' },
              { key: 'account', header: 'Account', render: r => (r as unknown as ApiAdmission).account_created ? <Badge variant="green">Created</Badge> : <Badge variant="slate">Not Created</Badge> },
              { key: 'status', header: 'Status', render: r => {
                const st = (r as unknown as ApiAdmission).admission_status
                return <Badge variant={st === 'approved' ? 'green' : st === 'rejected' ? 'red' : 'yellow'}>{st}</Badge>
              } },
              { key: 'actions', header: 'Action', render: r => {
                const a = r as unknown as ApiAdmission
                return (
                  <div className="flex gap-1">
                    {a.admission_status === 'pending' && (
                      <>
                        <Button size="sm" disabled={updatingId === a.id} onClick={() => setStatus(a, 'approved')}>Approve</Button>
                        <Button size="sm" variant="danger" disabled={updatingId === a.id} onClick={() => setStatus(a, 'rejected')}>Reject</Button>
                      </>
                    )}
                    {!a.account_created && (
                      <Button size="sm" variant="ghost" disabled={updatingId === a.id} onClick={() => handleDelete(a)}>Delete</Button>
                    )}
                  </div>
                )
              } },
            ]}
            data={admissions as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Application — Student Registration Form" size="lg">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-500">This creates a registration record only. Staff will review it and create the student's login account (with a backend-generated Student ID) separately in Student Management.</p>
          {createError && <Alert type="error">{createError}</Alert>}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="First Name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Last Name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
            <Select label="Gender" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as 'male' | 'female' | 'other' })}>
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </Select>
            <Input label="Guardian Name" value={form.guardian_name} onChange={e => setForm({ ...form, guardian_name: e.target.value })} />
            <Input label="Guardian Phone" value={form.guardian_phone} onChange={e => setForm({ ...form, guardian_phone: e.target.value })} />
          </div>
          <Input label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value, course: '' })}>
              <option value="">Select department</option>
              {realDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Select label="Course" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })}>
              <option value="">Select course</option>
              {coursesForDept(form.department).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Academic Year" value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })}>
              <option value="">Select academic year</option>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </Select>
            <Input label="Roll Number" value={form.roll_number} onChange={e => setForm({ ...form, roll_number: e.target.value })} placeholder="Used later to generate the Student ID" />
            <Input label="Admission Date" type="date" value={form.admission_date} onChange={e => setForm({ ...form, admission_date: e.target.value })} />
            <Select label="Admission Type" value={form.admission_type} onChange={e => setForm({ ...form, admission_type: e.target.value as 'regular' | 'lateral' | 'management' })}>
              <option value="regular">Regular</option><option value="lateral">Lateral</option><option value="management">Management</option>
            </Select>
            <Input label="Previous School" value={form.previous_school} onChange={e => setForm({ ...form, previous_school: e.target.value })} />
            <Input label="Previous Percentage" type="number" value={form.previous_percentage} onChange={e => setForm({ ...form, previous_percentage: e.target.value })} />
            <Input label="Entrance Exam Score (optional)" type="number" value={form.entrance_exam_score} onChange={e => setForm({ ...form, entrance_exam_score: e.target.value })} />
          </div>
          <Input label="Remarks (optional)" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={creating}>{creating ? 'Submitting…' : 'Submit Application'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


/* ============================================================
   FEE MANAGEMENT
   ============================================================ */

function FeesMgmt({ notify }: { notify: (msg: string) => void }) {
  const [fees, setFees] = useState<AdminFeeSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  async function fetchFees() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await financeApi.getAdminFeeSummary()
      setFees(res)
    } catch (err) {
      setFees([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load fee data.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchFees() }, [])

  const filtered = fees.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.admission_number.toLowerCase().includes(search.toLowerCase()))
  const statusLabel = (s: AdminFeeSummaryRow['status']) => s === 'cleared' ? 'Cleared' : s === 'overdue' ? 'Overdue' : 'Partial'

  return (
    <div>
      <PageHeader title="Fee Management" subtitle="2026–27 Academic Year"
        actions={<Button size="sm" onClick={() => { downloadCsv('fee-report.csv', fees as unknown as Record<string, unknown>[]); notify('Fee report generated') }}>Generate Report</Button>} />
      <Card className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by student name or ID..." className="min-w-48" />
      </Card>

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={() => fetchFees()}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading fee records…</p></Card>
      ) : !loadError && filtered.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No fee payment records found.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'admission_number', header: 'Student ID' }, { key: 'name', header: 'Name' }, { key: 'department', header: 'Dept' },
              { key: 'total', header: 'Total (₹)', render: r => `₹${Number(r.total as string).toLocaleString()}` },
              { key: 'paid', header: 'Paid (₹)', render: r => <span className="text-emerald-600 font-medium">₹{Number(r.paid as string).toLocaleString()}</span> },
              { key: 'pending', header: 'Pending (₹)', render: r => Number(r.pending as string) > 0 ? <span className="text-red-500 font-medium">₹{Number(r.pending as string).toLocaleString()}</span> : <span className="text-emerald-600">—</span> },
              { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'cleared' ? 'green' : r.status === 'overdue' ? 'red' : 'yellow'}>{statusLabel(r.status as AdminFeeSummaryRow['status'])}</Badge> },
              { key: 'action', header: 'Action', render: r => r.status !== 'cleared' ? <Button size="sm" onClick={() => notify(`Reminder sent to ${String(r.name)}`)}>Send Reminder</Button> : null },
            ]}
            data={filtered as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}
    </div>
  )
}

/* ============================================================
   CERTIFICATE MANAGEMENT (view/print/download issued by Staff)
   ============================================================ */

function CertificatesMgmt({ notify }: { notify: (msg: string) => void }) {
  const [certs, setCerts] = useState<ApiCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<ApiCertificate | null>(null)

  async function fetchCertificates() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await certificateApi.getCertificates({ page_size: 200, ordering: '-requested_at' })
      setCerts(res.results)
    } catch (err) {
      setCerts([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load certificates.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchCertificates() }, [])

  async function handleDownload(cert: ApiCertificate) {
    try {
      await certificateApi.download(cert.id, `${cert.certificate_number}.html`)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to download certificate.')
    }
  }

  const filtered = certs.filter(c =>
    (c.student_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.admission_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    c.certificate_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="Certificate Management" subtitle="Certificates issued by Staff (real-time from the database)" />
      <Card className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by certificate no, student name or admission no..." className="min-w-48" />
      </Card>

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={() => fetchCertificates()}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading certificates…</p></Card>
      ) : !loadError && filtered.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No certificates found.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'certificate_number', header: 'Cert ID' },
              { key: 'student_name', header: 'Student', render: r => String(r.student_name ?? '—') },
              { key: 'certificate_type_display', header: 'Type', render: r => String(r.certificate_type_display ?? r.certificate_type) },
              { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'issued' ? 'green' : 'blue'}>{String(r.status_display ?? r.status)}</Badge> },
              { key: 'issued_by_name', header: 'Issued By', render: r => String(r.issued_by_name ?? '—') },
              {
                key: 'action', header: 'Action', render: r => (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(r as unknown as ApiCertificate)}>View</Button>
                    <Button size="sm" onClick={() => handleDownload(r as unknown as ApiCertificate)}>Download</Button>
                  </div>
                ),
              },
            ]}
            data={filtered as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Certificate Details">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Cert ID</span><span className="font-medium text-slate-900">{viewing.certificate_number}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Student</span><span className="font-medium text-slate-900">{viewing.student_name ?? '—'} ({viewing.admission_number ?? '—'})</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Type</span><span className="font-medium text-slate-900">{viewing.certificate_type_display ?? viewing.certificate_type}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Issued By</span><span className="font-medium text-slate-900">{viewing.issued_by_name ?? '—'}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Issued Date</span><span className="font-medium text-slate-900">{viewing.issued_date ?? '—'}</span></div>
            <div className="flex justify-between pb-2"><span className="text-slate-500">Status</span><Badge variant={viewing.status === 'issued' ? 'green' : 'blue'}>{viewing.status_display ?? viewing.status}</Badge></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setViewing(null)}>Close</Button>
              <Button className="flex-1" onClick={() => { window.print(); handleDownload(viewing) }}>Print / Download</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ============================================================
   PLACEMENT MANAGEMENT
   ============================================================ */

function driveStatusLabel(d: ApiPlacementDrive): 'Completed' | 'Ongoing' {
  return new Date(d.drive_date) < new Date() ? 'Completed' : 'Ongoing'
}

function PlacementsMgmt({ notify }: { notify: (msg: string) => void }) {
  const [placements, setPlacements] = useState<ApiPlacementDrive[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<ApiPlacementDrive | null>(null)
  const emptyForm = { company_name: '', job_title: '', package_lpa: '', location: '', eligibility_criteria: '', application_deadline: '', drive_date: '' }
  const [form, setForm] = useState(emptyForm)

  async function fetchDrives() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await placementApi.getDrives({ page_size: 100 })
      setPlacements(res.results)
    } catch (err) {
      setPlacements([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load placement drives.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchDrives() }, [])

  async function handleCreate() {
    if (!form.company_name.trim()) { setCreateError('Please enter a company name.'); return }
    if (!form.job_title.trim()) { setCreateError('Please enter a role.'); return }
    if (!form.package_lpa.trim()) { setCreateError('Please enter a package.'); return }
    if (!form.application_deadline || !form.drive_date) { setCreateError('Please set both dates.'); return }
    setCreating(true)
    setCreateError(null)
    try {
      await placementApi.createDrive({
        company_name: form.company_name,
        job_title: form.job_title,
        employment_type: 'full_time',
        package_lpa: form.package_lpa,
        location: form.location || 'Not specified',
        eligibility_criteria: form.eligibility_criteria || 'Not specified',
        application_deadline: form.application_deadline,
        drive_date: form.drive_date,
        is_active: true,
      })
      notify(`${form.company_name} drive added`)
      setForm(emptyForm)
      setShowAdd(false)
      await fetchDrives()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to add placement drive.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <PageHeader title="Placement Management" subtitle="2026–27 Placement Season" actions={<Button size="sm" onClick={() => { setCreateError(null); setForm(emptyForm); setShowAdd(true) }}>+ Add Drive</Button>} />

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={() => fetchDrives()}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading placement drives…</p></Card>
      ) : !loadError && placements.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No placement drives yet.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'company_name', header: 'Company' }, { key: 'job_title', header: 'Role' },
              { key: 'package_lpa', header: 'Package', render: r => `₹${r.package_lpa} LPA` },
              { key: 'students_placed', header: 'Students Placed' },
              { key: 'drive_date', header: 'Date' },
              { key: 'status', header: 'Status', render: r => { const st = driveStatusLabel(r as unknown as ApiPlacementDrive); return <Badge variant={st === 'Completed' ? 'green' : 'blue'}>{st}</Badge> } },
              { key: 'actions', header: 'Actions', render: r => <Button size="sm" variant="ghost" onClick={() => setViewing(r as unknown as ApiPlacementDrive)}>View</Button> },
            ]}
            data={placements as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Placement Drive Details">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Company</span><span className="font-medium text-slate-900">{viewing.company_name}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Role</span><span className="font-medium text-slate-900">{viewing.job_title}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Package</span><span className="font-medium text-slate-900">₹{viewing.package_lpa} LPA</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Students Placed</span><span className="font-medium text-slate-900">{viewing.students_placed}</span></div>
            <div className="flex justify-between pb-2"><span className="text-slate-500">Status</span><Badge variant={driveStatusLabel(viewing) === 'Completed' ? 'green' : 'blue'}>{driveStatusLabel(viewing)}</Badge></div>
            <Button variant="outline" className="mt-2" onClick={() => setViewing(null)}>Close</Button>
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Placement Drive">
        <div className="flex flex-col gap-4">
          {createError && <Alert type="error">{createError}</Alert>}
          <Input label="Company" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="e.g. Amazon" />
          <Input label="Role" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} placeholder="e.g. Software Engineer" />
          <Input label="Package (LPA)" value={form.package_lpa} onChange={e => setForm({ ...form, package_lpa: e.target.value })} placeholder="e.g. 12" />
          <Input label="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          <Input label="Eligibility Criteria" value={form.eligibility_criteria} onChange={e => setForm({ ...form, eligibility_criteria: e.target.value })} />
          <Input label="Application Deadline" type="date" value={form.application_deadline} onChange={e => setForm({ ...form, application_deadline: e.target.value })} />
          <Input label="Drive Date" type="date" value={form.drive_date} onChange={e => setForm({ ...form, drive_date: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={creating}>{creating ? 'Adding…' : 'Add Drive'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   RESEARCH MANAGEMENT
   ============================================================ */

/* ============================================================
   SEMESTER RESULTS MANAGEMENT (Problems 6 + 7)
   The SemesterResult model has no separate draft/published flag --
   published_date is a required field, so creating the row IS the publish
   step. This is the minimal missing workflow: HOD/Student result pages
   were already correctly wired to real APIs, but nothing could create a
   row for them to show.
   ============================================================ */

// Semester.name is optional (blank/null allowed) -- if Admin creates a
// Semester without a name, `s.name` alone renders a blank <option>, which
// looks like "no usable options" in the dropdown even though a real row
// exists. Always fall back to a real, always-present composite label.
function semesterLabel(s: ApiSemester): string {
  if (s.name && s.name.trim()) return s.name
  const course = s.course_detail?.code || s.course_detail?.name || s.course
  const year = s.academic_year_detail?.name || s.academic_year
  return `Semester ${s.semester_number} — ${course} — ${year}`
}

function ResultsMgmt({ notify }: { notify: (msg: string) => void }) {
  const [results, setResults] = useState<ApiSemesterResult[]>([])
  const [students, setStudents] = useState<ApiStudent[]>([])
  const [semesters, setSemesters] = useState<ApiSemester[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const emptyForm = { student: '', semester: '', sgpa: '', cgpa: '', total_credits_earned: '', result_status: 'pass', published_date: new Date().toISOString().slice(0, 10), remarks: '' }
  const [form, setForm] = useState(emptyForm)

  async function fetchAll() {
    setLoading(true)
    setLoadError(null)
    try {
      const [res, stu, sem] = await Promise.all([
        examResultApi.getResults({ page_size: 200 }),
        studentApi.getStudents({ page_size: 500 }),
        lookupApi.getSemesters(),
      ])
      setResults(res.results)
      setStudents(stu.results)
      setSemesters(sem)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load semester results.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchAll() }, [])

  const studentById = Object.fromEntries(students.map(s => [s.id, s]))
  const semesterById = Object.fromEntries(semesters.map(s => [s.id, s]))

  async function handleCreate() {
    if (!form.student) { setCreateError('Please select a student.'); return }
    if (!form.semester) { setCreateError('Please select a semester.'); return }
    if (!form.sgpa || !form.cgpa || !form.total_credits_earned) { setCreateError('Please enter SGPA, CGPA, and total credits earned.'); return }
    setCreating(true)
    setCreateError(null)
    try {
      await examResultApi.createResult({
        student: form.student,
        semester: form.semester,
        sgpa: form.sgpa,
        cgpa: form.cgpa,
        total_credits_earned: Number(form.total_credits_earned),
        result_status: form.result_status,
        published_date: form.published_date,
        remarks: form.remarks || undefined,
      })
      notify('Semester result published')
      setForm(emptyForm)
      setShowAdd(false)
      await fetchAll()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to publish result.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <PageHeader title="Semester Results" subtitle="Publish final semester results — visible to the student and their HOD once saved"
        actions={<Button size="sm" onClick={() => { setCreateError(null); setForm(emptyForm); setShowAdd(true) }}>+ Publish Result</Button>} />

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={fetchAll}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading semester results…</p></Card>
      ) : !loadError && results.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No semester results published yet.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'student', header: 'Student', render: r => { const s = studentById[String(r.student)]; return s ? `${s.user.first_name} ${s.user.last_name} (${s.admission_number})` : String(r.student) } },
              { key: 'semester', header: 'Semester', render: r => { const s = semesterById[String(r.semester)]; return s ? semesterLabel(s) : String(r.semester) } },
              { key: 'sgpa', header: 'SGPA' },
              { key: 'cgpa', header: 'CGPA' },
              { key: 'result_status', header: 'Status', render: r => <Badge variant={r.result_status === 'pass' ? 'green' : r.result_status === 'fail' ? 'red' : 'yellow'}>{String(r.result_status)}</Badge> },
              { key: 'published_date', header: 'Published' },
            ]}
            data={results as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Publish Semester Result">
        <div className="flex flex-col gap-4">
          {createError && <Alert type="error">{createError}</Alert>}
          <Select label="Student" value={form.student} onChange={e => setForm({ ...form, student: e.target.value })}>
            <option value="">Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.user.first_name} {s.user.last_name} ({s.admission_number})</option>)}
          </Select>
          <Select label="Semester" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
            <option value="">Select semester</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{semesterLabel(s)}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="SGPA" type="number" step="0.01" value={form.sgpa} onChange={e => setForm({ ...form, sgpa: e.target.value })} />
            <Input label="CGPA" type="number" step="0.01" value={form.cgpa} onChange={e => setForm({ ...form, cgpa: e.target.value })} />
          </div>
          <Input label="Total Credits Earned" type="number" value={form.total_credits_earned} onChange={e => setForm({ ...form, total_credits_earned: e.target.value })} />
          <Select label="Result Status" value={form.result_status} onChange={e => setForm({ ...form, result_status: e.target.value })}>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="withheld">Withheld</option>
          </Select>
          <Input label="Published Date" type="date" value={form.published_date} onChange={e => setForm({ ...form, published_date: e.target.value })} />
          <Input label="Remarks (optional)" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={creating}>{creating ? 'Publishing…' : 'Publish Result'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ResearchMgmt({ notify }: {
  notify: (msg: string) => void
}) {
  const [projects, setProjects] = useState<ApiResearchProject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<ApiResearchProject | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  async function fetchProjects() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await researchApi.getProjects({ page_size: 100 })
      setProjects(res.results)
    } catch (err) {
      setProjects([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load research projects.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchProjects() }, [])

  async function handleApprove(row: ApiResearchProject) {
    setActingId(row.id)
    try {
      await researchApi.approveProject(row.id)
      notify(`${row.title} approved — now visible on the public site`)
      await fetchProjects()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to approve project.')
    } finally {
      setActingId(null)
    }
  }

  async function handleReject(row: ApiResearchProject) {
    setActingId(row.id)
    try {
      await researchApi.rejectProject(row.id)
      notify(`${row.title} rejected`)
      await fetchProjects()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to reject project.')
    } finally {
      setActingId(null)
    }
  }

  const statusVariant = (s: string) => s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'yellow'

  return (
    <div>
      <PageHeader title="Research" subtitle="HOD-submitted research projects awaiting review — projects originate from HOD, Admin approves or rejects" />

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={() => fetchProjects()}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading research projects…</p></Card>
      ) : !loadError && projects.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No research projects submitted yet.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'title', header: 'Project Title' },
              { key: 'department_code', header: 'Department', render: r => (r.department_code as string) || '—' },
              { key: 'principal_investigator_name', header: 'Lead', render: r => (r.principal_investigator_name as string) || 'Unassigned' },
              { key: 'start_date', header: 'Year', render: r => String(r.start_date).slice(0, 4) },
              { key: 'approval_status', header: 'Approval', render: r => <Badge variant={statusVariant(String(r.approval_status))}>{String(r.approval_status)}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiResearchProject
                  return (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(row)}>View</Button>
                      {row.approval_status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => handleApprove(row)} disabled={actingId === row.id}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(row)} disabled={actingId === row.id}>Reject</Button>
                        </>
                      )}
                    </div>
                  )
                }
              },
            ]}
            data={projects as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Research Project Details">
        {viewing && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Title</span><span className="font-medium text-slate-900 text-right ml-4">{viewing.title}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Department</span><span className="font-medium text-slate-900">{viewing.department_name || viewing.department_code}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Lead</span><span className="font-medium text-slate-900">{viewing.principal_investigator_name || 'Unassigned'}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Year</span><span className="font-medium text-slate-900">{viewing.start_date.slice(0, 4)}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">Approval</span><Badge variant={statusVariant(viewing.approval_status)}>{viewing.approval_status}</Badge></div>
            {viewing.reviewed_by_name && <div className="flex justify-between pb-2"><span className="text-slate-500">Reviewed By</span><span className="font-medium text-slate-900">{viewing.reviewed_by_name}</span></div>}
            <Button variant="outline" className="mt-2" onClick={() => setViewing(null)}>Close</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ============================================================
   INFRASTRUCTURE MANAGEMENT
   ============================================================ */

function InfrastructureMgmt({ notify }: { notify: (msg: string) => void }) {
  const [facilities, setFacilities] = useState<ApiFacility[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const emptyForm = { name: '', facility_type: '', capacity: '' }
  const [form, setForm] = useState(emptyForm)

  async function fetchFacilities() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await infrastructureApi.getFacilities({ page_size: 100 })
      setFacilities(res.results)
    } catch (err) {
      setFacilities([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load facilities.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchFacilities() }, [])

  async function handleCreate() {
    if (!form.name.trim()) { setCreateError('Please enter a facility name.'); return }
    setCreating(true)
    setCreateError(null)
    try {
      await infrastructureApi.createFacility({
        name: form.name,
        facility_type: form.facility_type || 'Other',
        capacity: form.capacity,
        status: 'operational',
      })
      notify(`${form.name} added`)
      setForm(emptyForm)
      setShowAdd(false)
      await fetchFacilities()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to add facility.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleStatus(row: ApiFacility) {
    const nextStatus = row.status === 'operational' ? 'under_maintenance' : 'operational'
    setUpdatingId(row.id)
    try {
      await infrastructureApi.updateFacility(row.id, { status: nextStatus })
      notify(`${row.name} marked ${nextStatus === 'operational' ? 'Operational' : 'Under Maintenance'}`)
      await fetchFacilities()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update facility status.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Infrastructure" subtitle="Campus facilities" actions={<Button size="sm" onClick={() => { setCreateError(null); setForm(emptyForm); setShowAdd(true) }}>+ Add Facility</Button>} />

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={() => fetchFacilities()}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading facilities…</p></Card>
      ) : !loadError && facilities.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No facilities recorded yet.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'name', header: 'Facility' }, { key: 'facility_type', header: 'Type' }, { key: 'capacity', header: 'Capacity' },
              { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'operational' ? 'green' : 'yellow'}>{r.status === 'operational' ? 'Operational' : 'Under Maintenance'}</Badge> },
              { key: 'actions', header: 'Actions', render: r => <Button size="sm" variant="ghost" disabled={updatingId === (r as unknown as ApiFacility).id} onClick={() => toggleStatus(r as unknown as ApiFacility)}>Toggle Status</Button> },
            ]}
            data={facilities as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Facility">
        <div className="flex flex-col gap-4">
          {createError && <Alert type="error">{createError}</Alert>}
          <Input label="Facility Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Type" value={form.facility_type} onChange={e => setForm({ ...form, facility_type: e.target.value })} placeholder="e.g. Lab, Hostel, Library" />
          <Input label="Capacity" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 60 seats" />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={creating}>{creating ? 'Adding…' : 'Add Facility'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   WEBSITE CMS
   ============================================================ */

const PAGE_TYPES: { value: ContentPageType; label: string }[] = [
  { value: 'about', label: 'About' },
  { value: 'vision', label: 'Vision' },
  { value: 'mission', label: 'Mission' },
  { value: 'principal_message', label: 'Principal Message' },
  { value: 'privacy_policy', label: 'Privacy Policy' },
  { value: 'terms', label: 'Terms' },
  { value: 'other', label: 'Other' },
]

const emptyCmsForm = {
  title: '', slug: '', page_type: 'other' as ContentPageType, content: '',
  meta_title: '', meta_description: '', is_published: false,
}

function CmsMgmt({ notify }: { notify: (msg: string) => void }) {
  const [pages, setPages] = useState<ApiContentPage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ApiContentPage | null>(null)
  const [form, setForm] = useState(emptyCmsForm)
  const [editForm, setEditForm] = useState(emptyCmsForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function fetchPages() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await cmsApi.getPages({ page_size: 200 })
      setPages(res.results)
    } catch (err) {
      setPages([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load CMS pages.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchPages() }, [])

  const filtered = pages.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase()))

  function slugify(title: string) {
    return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  function openEdit(p: ApiContentPage) {
    setEditForm({
      title: p.title, slug: p.slug, page_type: p.page_type, content: p.content,
      meta_title: p.meta_title ?? '', meta_description: p.meta_description ?? '', is_published: p.is_published,
    })
    setFormError(null)
    setEditing(p)
  }

  async function handleCreate() {
    if (!form.title.trim()) { setFormError('Please enter a page title.'); return }
    if (!form.content.trim()) { setFormError('Please enter page content.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await cmsApi.createPage({
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        page_type: form.page_type,
        content: form.content,
        meta_title: form.meta_title,
        meta_description: form.meta_description,
        is_published: form.is_published,
      })
      notify(`${form.title} created`)
      setForm(emptyCmsForm)
      setShowAdd(false)
      await fetchPages()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create page.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)
    setFormError(null)
    try {
      await cmsApi.updatePage(editing.id, {
        title: editForm.title,
        slug: editForm.slug,
        page_type: editForm.page_type,
        content: editForm.content,
        meta_title: editForm.meta_title,
        meta_description: editForm.meta_description,
        is_published: editForm.is_published,
      })
      notify(`${editForm.title} updated`)
      setEditing(null)
      await fetchPages()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update page.')
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish(row: ApiContentPage) {
    setBusyId(row.id)
    try {
      await cmsApi.updatePage(row.id, { is_published: !row.is_published })
      notify(`${row.title} ${row.is_published ? 'unpublished' : 'published'}`)
      await fetchPages()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update publish status.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(row: ApiContentPage) {
    if (!window.confirm(`Delete page "${row.title}"? This cannot be undone.`)) return
    setBusyId(row.id)
    try {
      await cmsApi.deletePage(row.id)
      notify(`${row.title} deleted`)
      await fetchPages()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete page.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Website CMS" subtitle={`${pages.length} content pages`}
        actions={<Button size="sm" onClick={() => { setForm(emptyCmsForm); setFormError(null); setShowAdd(true) }}>+ Add Page</Button>} />
      <Card className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search pages..." className="min-w-48" />
      </Card>

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={fetchPages}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading pages…</p></Card>
      ) : !loadError && filtered.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No CMS pages yet.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'title', header: 'Page' },
              { key: 'slug', header: 'Slug', render: r => <span className="text-slate-400 font-mono text-xs">/{(r as unknown as ApiContentPage).slug}</span> },
              { key: 'page_type_display', header: 'Type' },
              { key: 'updated_at', header: 'Last Updated', render: r => new Date((r as unknown as ApiContentPage).updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
              { key: 'is_published', header: 'Status', render: r => <Badge variant={(r as unknown as ApiContentPage).is_published ? 'green' : 'slate'}>{(r as unknown as ApiContentPage).is_published ? 'Published' : 'Draft'}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as ApiContentPage
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                      <Button size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => togglePublish(row)}>{row.is_published ? 'Unpublish' : 'Publish'}</Button>
                      <Button size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => handleDelete(row)}>Delete</Button>
                    </div>
                  )
                }
              },
            ]}
            data={filtered as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Page" size="lg">
        {editing && (
          <div className="flex flex-col gap-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <Input label="Title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
            <Input label="Slug" value={editForm.slug} onChange={e => setEditForm({ ...editForm, slug: e.target.value })} />
            <Select label="Page Type" value={editForm.page_type} onChange={e => setEditForm({ ...editForm, page_type: e.target.value as ContentPageType })}>
              {PAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
              <textarea className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32" value={editForm.content} onChange={e => setEditForm({ ...editForm, content: e.target.value })} />
            </div>
            <Input label="Meta Title" value={editForm.meta_title} onChange={e => setEditForm({ ...editForm, meta_title: e.target.value })} />
            <Input label="Meta Description" value={editForm.meta_description} onChange={e => setEditForm({ ...editForm, meta_description: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={editForm.is_published} onChange={e => setEditForm({ ...editForm, is_published: e.target.checked })} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Published
            </label>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Page" size="lg">
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}
          <Input label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} placeholder="e.g. About Us" />
          <Input label="Slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated from title" />
          <Select label="Page Type" value={form.page_type} onChange={e => setForm({ ...form, page_type: e.target.value as ContentPageType })}>
            {PAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
            <textarea className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Page body content" />
          </div>
          <Input label="Meta Title (optional)" value={form.meta_title} onChange={e => setForm({ ...form, meta_title: e.target.value })} />
          <Input label="Meta Description (optional)" value={form.meta_description} onChange={e => setForm({ ...form, meta_description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            Publish immediately
          </label>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Add Page'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   USER MANAGEMENT
   (frontend-only role/status labels — does not touch auth/JWT)
   ============================================================ */

function UsersMgmt({ notify }: { notify: (msg: string) => void }) {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [pwModalUser, setPwModalUser] = useState<AdminUserRow | null>(null)
  const [pwValue, setPwValue] = useState('')

  async function fetchUsers() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await adminApi.getUsers({ search: search || undefined, role: roleFilter === 'All' ? undefined : roleFilter.toLowerCase(), page_size: 200 })
      setUsers(res.results)
    } catch (err) {
      setUsers([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchUsers() }, [roleFilter])

  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name} ${u.username} ${u.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  async function toggleStatus(row: AdminUserRow) {
    setBusyId(row.id)
    try {
      if (row.is_active) {
        await adminApi.deactivateUser(row.id)
        notify(`${row.username} deactivated`)
      } else {
        await adminApi.activateUser(row.id)
        notify(`${row.username} activated`)
      }
      await fetchUsers()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Action failed. Admins cannot deactivate their own account.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSetPassword() {
    if (!pwModalUser) return
    if (pwValue.length < 6) { notify('Password must be at least 6 characters'); return }
    try {
      await adminApi.setUserPassword(pwModalUser.id, pwValue)
      notify(`Password updated for ${pwModalUser.username}`)
      setPwModalUser(null)
      setPwValue('')
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to set password.')
    }
  }

  return (
    <div>
      <PageHeader title="User Management" subtitle={`${users.length} user accounts`} />
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, username, or email..." className="flex-1 min-w-48" />
        <Select className="w-40" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="All">All Roles</option>
          <option value="admin">Admin</option><option value="hod">HOD</option><option value="teacher">Teacher</option>
          <option value="staff">Staff</option><option value="student">Student</option>
        </Select>
      </div>

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={fetchUsers}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading users…</p></Card>
      ) : !loadError && filtered.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No users found.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'display_id', header: 'ID' },
              { key: 'name', header: 'Name', render: r => `${(r as unknown as AdminUserRow).first_name} ${(r as unknown as AdminUserRow).last_name}` },
              { key: 'email', header: 'Email' }, { key: 'role_display', header: 'Role' },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={(r as unknown as AdminUserRow).is_active ? 'green' : 'red'}>{(r as unknown as AdminUserRow).is_active ? 'Active' : 'Suspended'}</Badge> },
              {
                key: 'actions', header: 'Actions', render: r => {
                  const row = r as unknown as AdminUserRow
                  return (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toggleStatus(row)} disabled={busyId === row.id}>
                        {busyId === row.id ? '…' : row.is_active ? 'Suspend' : 'Reactivate'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setPwModalUser(row); setPwValue('') }}>Set Password</Button>
                    </div>
                  )
                }
              },
            ]}
            data={filtered as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      <Modal open={!!pwModalUser} onClose={() => setPwModalUser(null)} title="Set Password">
        {pwModalUser && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500">New password for <span className="font-semibold text-slate-900">{pwModalUser.username}</span></p>
            <Input label="New Password" type="password" value={pwValue} onChange={e => setPwValue(e.target.value)} placeholder="Min 6 characters" />
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSetPassword}>Update Password</Button>
              <Button variant="outline" className="flex-1" onClick={() => setPwModalUser(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ============================================================
   ROLES & PERMISSIONS
   ============================================================ */

function RolesMgmt({ notify }: { notify: (msg: string) => void }) {
  const [roles, setRoles] = useState<AdminRoleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function fetchRoles() {
    setLoading(true)
    setLoadError(null)
    try {
      setRoles(await adminApi.getRoles())
    } catch (err) {
      setRoles([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load roles.')
      notify('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchRoles() }, [])

  return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Live counts from the backend role enum — access levels are enforced server-side, not editable here." />

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={fetchRoles}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading roles…</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'label', header: 'Role', render: r => <span className="font-semibold text-slate-900">{String((r as unknown as AdminRoleRow).label)}</span> },
              { key: 'user_count', header: 'Users' },
              { key: 'value', header: 'System Value', render: r => <span className="text-slate-400 font-mono text-xs">{(r as unknown as AdminRoleRow).value}</span> },
            ]}
            data={roles as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}
    </div>
  )
}

/* ============================================================
   SYSTEM LOGS
   ============================================================ */

function SystemLogs({ notify }: { notify: (msg: string) => void }) {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')

  async function fetchLogs() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await adminApi.getAuditLogs({
        action: actionFilter === 'All' ? undefined : actionFilter,
        date_from: dateFilter || undefined,
        date_to: dateFilter || undefined,
        page,
        page_size: 50,
      })
      setLogs(res.results)
      setCount(res.count)
    } catch (err) {
      setLogs([])
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load audit logs.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchLogs() }, [actionFilter, dateFilter, page])

  const actionTypes = ['create', 'update', 'delete', 'activate', 'deactivate', 'login', 'password_reset', 'role_change']
  const filtered = logs.filter(l =>
    l.user_display.toLowerCase().includes(search.toLowerCase()) || l.resource.toLowerCase().includes(search.toLowerCase()) || l.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="System Logs" subtitle="Real audit trail — admin-only"
        actions={<Button size="sm" variant="secondary" onClick={() => { downloadCsv('system-logs.csv', filtered as unknown as Record<string, unknown>[]); notify(`Exported ${filtered.length} log entries`) }}>Export Logs</Button>} />
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <Select className="w-40" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}>
          <option value="All">All Actions</option>
          {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input type="date" className="w-44" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1) }} />
      </div>

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={fetchLogs}>Retry</button></Alert></div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">Loading logs…</p></Card>
      ) : !loadError && filtered.length === 0 ? (
        <Card><p className="text-sm text-slate-500 text-center py-8">No log entries found.</p></Card>
      ) : !loadError && (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'user_display', header: 'User' },
              { key: 'action', header: 'Action', render: r => <Badge variant={(r as unknown as AuditLogRow).action === 'delete' ? 'red' : (r as unknown as AuditLogRow).action === 'create' ? 'green' : (r as unknown as AuditLogRow).action === 'login' ? 'blue' : 'yellow'}>{(r as unknown as AuditLogRow).action}</Badge> },
              { key: 'resource', header: 'Resource' }, { key: 'description', header: 'Description' },
              { key: 'created_at', header: 'Time', render: r => new Date((r as unknown as AuditLogRow).created_at).toLocaleString() },
            ]}
            data={filtered as unknown as Record<string, unknown>[]}
          />
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">Showing {filtered.length} of {count} log entries</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
              <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={logs.length < 50}>Next</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ============================================================
   ANALYTICS
   ============================================================ */

function Analytics() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      setAnalytics(await adminApi.getAnalytics())
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const totals = analytics?.totals
  const deptWise = (analytics?.department_wise_students ?? []).map(d => ({ name: d.department__name ?? 'Unassigned', students: d.count }))
  const courseWise = (analytics?.course_wise_students ?? []).map(c => ({ name: c.course__name ?? 'Unassigned', students: c.count }))

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Institution-wide metrics, computed live from the database" />

      {loadError && (
        <div className="mb-4"><Alert type="error">{loadError} <button className="underline font-semibold ml-1" onClick={load}>Retry</button></Alert></div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Students" value={loading ? '…' : (totals?.active_students ?? 0).toLocaleString()} icon={<GraduationCap className="w-5 h-5" />} color="blue" />
        <StatCard label="Active Faculty" value={loading ? '…' : (totals?.active_teachers ?? 0).toLocaleString()} icon={<Users className="w-5 h-5" />} color="green" />
        <StatCard label="Placement Applications" value={loading ? '…' : (analytics?.placements?.total_applications ?? 0).toLocaleString()} icon={<Briefcase className="w-5 h-5" />} color="purple" change={loading ? undefined : `${analytics?.placements?.active_drives ?? 0} active drives`} />
        <StatCard label="Research Projects" value={loading ? '…' : (analytics?.research?.total_projects ?? 0).toLocaleString()} icon={<Globe className="w-5 h-5" />} color="yellow" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Dept-wise Student Count</h3>
          {deptWise.length === 0 ? <p className="text-sm text-slate-500 py-8 text-center">No data yet.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptWise} barSize={18} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="students" fill="#2563eb" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Course-wise Student Count</h3>
          {courseWise.length === 0 ? <p className="text-sm text-slate-500 py-8 text-center">No data yet.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={courseWise} barSize={18} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="students" fill="#10b981" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Fee Collection</h3>
          <p className="text-2xl font-bold text-slate-900">₹{(analytics?.fees?.total_collected ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{analytics?.fees?.total_payments ?? 0} payments recorded</p>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Admissions by Status</h3>
          <div className="space-y-2">
            {(analytics?.admissions?.by_status ?? []).map(s => (
              <div key={s.admission_status} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-600 capitalize">{s.admission_status}</span>
                <Badge variant="blue">{s.count}</Badge>
              </div>
            ))}
            {(!analytics?.admissions || analytics.admissions.by_status.length === 0) && <p className="text-sm text-slate-500">No admissions data yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ============================================================
   ROOT COMPONENT
   ============================================================ */

export default function AdminDashboard({ page = '' }: { page?: string }) {
  const [departments, setDepartments] = useState<DeptRow[]>([])
  const [deptLoading, setDeptLoading] = useState(true)
  const [deptError, setDeptError] = useState<string | null>(null)
  const [pendingAdmissions, setPendingAdmissions] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  function notify(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2500)
  }

  // Departments: fetched once here and shared read-only by Students/Teachers/
  // Research/Analytics dropdowns below (same DeptRow shape they always
  // consumed); DeptsMgmt is the only one that mutates it, via the real API.
  async function fetchDepartments() {
    setDeptLoading(true)
    setDeptError(null)
    try {
      const res = await departmentApi.getDepartments({ page_size: 200, ordering: 'name' })
      setDepartments(res.results.map(apiDeptToRow))
    } catch (err) {
      setDepartments([])
      setDeptError(err instanceof ApiError ? err.message : 'Failed to load departments.')
    } finally {
      setDeptLoading(false)
    }
  }
  useEffect(() => { fetchDepartments() }, [])

  // Pending-admissions sidebar badge: real count from the Admissions API
  // (no local business-data array here -- AdmissionsMgmt owns the full list).
  useEffect(() => {
    admissionApi.getAdmissions({ admission_status: 'pending', page_size: 1 })
      .then(res => setPendingAdmissions(res.count))
      .catch(() => setPendingAdmissions(0))
  }, [])

  const sidebarItems = [
    { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Students', to: '/admin/students', icon: <GraduationCap className="w-4 h-4" /> },
    { label: 'Teachers', to: '/admin/teachers', icon: <Users className="w-4 h-4" /> },
    { label: 'Staff', to: '/admin/staff', icon: <UserCheck className="w-4 h-4" /> },
    { label: 'Departments', to: '/admin/departments', icon: <Building className="w-4 h-4" /> },
    { label: 'Courses', to: '/admin/courses', icon: <GraduationCap className="w-4 h-4" /> },
    { label: 'Academic Years', to: '/admin/academic-years', icon: <FileText className="w-4 h-4" /> },
    { label: 'Semesters', to: '/admin/semesters', icon: <FileText className="w-4 h-4" /> },
    { label: 'Admissions', to: '/admin/admissions', icon: <UserPlus className="w-4 h-4" />, badge: pendingAdmissions },
    { label: 'Fees', to: '/admin/fees', icon: <CreditCard className="w-4 h-4" /> },
    { label: 'Certificates', to: '/admin/certificates', icon: <FileCheck className="w-4 h-4" /> },
    { label: 'Placements', to: '/admin/placements', icon: <Briefcase className="w-4 h-4" /> },
    { label: 'Results', to: '/admin/results', icon: <FileText className="w-4 h-4" /> },
    { label: 'Research', to: '/admin/research', icon: <Globe className="w-4 h-4" /> },
    { label: 'Infrastructure', to: '/admin/infrastructure', icon: <Wrench className="w-4 h-4" /> },
    { label: 'Website CMS', to: '/admin/cms', icon: <Monitor className="w-4 h-4" /> },
    { label: 'User Management', to: '/admin/users', icon: <Shield className="w-4 h-4" /> },
    { label: 'Roles & Permissions', to: '/admin/roles', icon: <Shield className="w-4 h-4" /> },
    { label: 'System Logs', to: '/admin/logs', icon: <FileText className="w-4 h-4" /> },
    { label: 'Analytics', to: '/admin/analytics', icon: <BarChart2 className="w-4 h-4" /> },
    { label: 'AI Executive Assistant', to: '/admin/ai', icon: <MessageSquare className="w-4 h-4" /> },
  ]

  const pageMap: Record<string, { title: string; component: React.ReactNode }> = {
    '': { title: 'Dashboard', component: <Dashboard departments={departments} /> },
    'students': { title: 'Student Management', component: <StudentsMgmt departments={departments} notify={notify} /> },
    'teachers': { title: 'Teacher Management', component: <TeachersMgmt departments={departments} notify={notify} /> },
    'staff': { title: 'Staff Management', component: <StaffMgmt departments={departments} notify={notify} /> },
    'departments': { title: 'Departments', component: <DeptsMgmt departments={departments} loading={deptLoading} loadError={deptError} refresh={fetchDepartments} notify={notify} /> },
    'courses': { title: 'Courses', component: <CoursesMgmt notify={notify} /> },
    'academic-years': { title: 'Academic Years', component: <AcademicYearMgmt notify={notify} /> },
    'semesters': { title: 'Semesters', component: <SemesterMgmt notify={notify} /> },
    'admissions': { title: 'Admission Management', component: <AdmissionsMgmt notify={notify} /> },
    'fees': { title: 'Fee Management', component: <FeesMgmt notify={notify} /> },
    'certificates': { title: 'Certificate Management', component: <CertificatesMgmt notify={notify} /> },
    'placements': { title: 'Placement Management', component: <PlacementsMgmt notify={notify} /> },
    'results': { title: 'Semester Results', component: <ResultsMgmt notify={notify} /> },
    'research': { title: 'Research', component: <ResearchMgmt notify={notify} /> },
    'infrastructure': { title: 'Infrastructure', component: <InfrastructureMgmt notify={notify} /> },
    'cms': { title: 'Website CMS', component: <CmsMgmt notify={notify} /> },
    'users': { title: 'User Management', component: <UsersMgmt notify={notify} /> },
    'roles': { title: 'Roles & Permissions', component: <RolesMgmt notify={notify} /> },
    'logs': { title: 'System Logs', component: <SystemLogs notify={notify} /> },
    'analytics': { title: 'Analytics', component: <Analytics /> },
  }

  const pageData = pageMap[page] ?? pageMap['']
  return (
    <DashboardLayout sidebarItems={sidebarItems} role="Admin" userName="Mr. A. K. Verma" userSub="System Administrator" pageTitle={pageData.title}>
      {toast && (
        <div className="fixed top-4 right-4 z-[60] max-w-sm">
          <Alert type="success">{toast}</Alert>
        </div>
      )}
      {pageData.component}
    </DashboardLayout>
  )
}
