import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { LayoutDashboard, ClipboardList, Users, FileText, Upload, Database, PenLine, MessageCircle, CalendarCheck, Calendar, Bell, MessageSquare, Pencil, Trash2, Paperclip } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { StatCard, Card, Badge, Button, Table, PageHeader, Avatar, Modal, Input, Select, Alert } from '../../components/ui'
import {
  teacherApi, timetableApi, attendanceApi, assignmentApi, examinationApi, studentApi, lookupApi, departmentApi,
  studyMaterialApi, questionBankApi, leaveApi, notificationApi, feedbackApi,
  ApiError,
  type ApiTeacher, type ApiDepartment, type ApiSubject, type ApiSemester,
  type ApiTimetableSlot, type ApiAttendanceSession, type ApiAttendanceRecord,
  type ApiAssignment, type ApiAssignmentSubmission, type ApiExamination, type ApiStudent,
  type ApiStudyMaterial, type ApiQuestion, type ApiQuestionType,
  type ApiLeaveRequest, type ApiNotification, type ApiTeacherFeedback,
} from '../../services/api'

const sidebarItems = [
  { label: 'Dashboard', to: '/teacher', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Attendance Entry', to: '/teacher/attendance', icon: <ClipboardList className="w-4 h-4" /> },
  { label: 'Student List', to: '/teacher/students', icon: <Users className="w-4 h-4" /> },
  { label: 'Assignment Management', to: '/teacher/assignments', icon: <FileText className="w-4 h-4" /> },
  { label: 'Upload Notes', to: '/teacher/notes', icon: <Upload className="w-4 h-4" /> },
  { label: 'Question Bank', to: '/teacher/questions', icon: <Database className="w-4 h-4" /> },
  { label: 'Marks Entry', to: '/teacher/marks', icon: <PenLine className="w-4 h-4" /> },
  { label: 'Feedback', to: '/teacher/feedback', icon: <MessageCircle className="w-4 h-4" /> },
  { label: 'Leave Approval', to: '/teacher/leaves', icon: <CalendarCheck className="w-4 h-4" /> },
  { label: 'Timetable', to: '/teacher/timetable', icon: <Calendar className="w-4 h-4" /> },
  { label: 'Notifications', to: '/teacher/notifications', icon: <Bell className="w-4 h-4" /> },
  { label: 'AI Teaching Assistant', to: '/teacher/ai', icon: <MessageSquare className="w-4 h-4" /> },
]

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}
const today = () => new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
const todayISO = () => new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// Shared lookups (subjects/semesters/departments) — fetched once, joined
// client-side against the id-only FKs the backend returns (same convention
// already used by lookupApi elsewhere in this project).
// ---------------------------------------------------------------------------

interface Lookups {
  subjects: ApiSubject[]
  semesters: ApiSemester[]
  loading: boolean
  error: string | null
}

function useLookups(): Lookups {
  const [state, setState] = useState<Lookups>({ subjects: [], semesters: [], loading: true, error: null })
  useEffect(() => {
    let cancelled = false
    Promise.all([lookupApi.getSubjects(), lookupApi.getSemesters()])
      .then(([subjects, semesters]) => { if (!cancelled) setState({ subjects, semesters, loading: false, error: null }) })
      .catch(err => { if (!cancelled) setState(s => ({ ...s, loading: false, error: err instanceof ApiError ? err.message : 'Failed to load subjects/semesters.' })) })
    return () => { cancelled = true }
  }, [])
  return state
}

function subjectLabel(subjects: ApiSubject[], id: string): string {
  const s = subjects.find(x => x.id === id)
  return s ? `${s.name} (${s.code})` : id
}
function semesterLabel(semesters: ApiSemester[], id: string): string {
  const s = semesters.find(x => x.id === id)
  if (!s) return id
  const courseCode = s.course_detail?.code ?? ''
  return `${courseCode} · Sem ${s.semester_number}`.trim()
}

// ---------------------------------------------------------------------------
// Teacher profile — the REAL logged-in teacher, never hardcoded.
// ---------------------------------------------------------------------------

interface TeacherProfileState {
  teacher: ApiTeacher | null
  department: ApiDepartment | null
  loading: boolean
  error: string | null
}

function useTeacherProfile(): TeacherProfileState {
  const [state, setState] = useState<TeacherProfileState>({ teacher: null, department: null, loading: true, error: null })
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const teacher = await teacherApi.getMe()
        let department: ApiDepartment | null = null
        try { department = await departmentApi.getDepartment(teacher.department) } catch { /* non-fatal */ }
        if (!cancelled) setState({ teacher, department, loading: false, error: null })
      } catch (err) {
        if (!cancelled) setState({ teacher: null, department: null, loading: false, error: err instanceof ApiError ? err.message : 'Failed to load your teacher profile.' })
      }
    }
    load()
    return () => { cancelled = true }
  }, [])
  return state
}

function teacherDisplayName(teacher: ApiTeacher | null): string {
  if (!teacher) return 'Teacher'
  const name = `${teacher.user.first_name} ${teacher.user.last_name}`.trim()
  return name || teacher.user.username
}

// Shared feedback-loading hook (Teacher's own feedback, backend-scoped —
// see TeacherFeedbackViewSet.get_queryset). Used by both the Dashboard
// preview and the full FeedbackPage so we only fetch once per mount each.
function useTeacherFeedback() {
  const [feedback, setFeedback] = useState<ApiTeacherFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    feedbackApi.getTeacherFeedback({ page_size: 100, ordering: '-created_at' })
      .then(res => setFeedback(res.results))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load feedback.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  return { feedback, loading, error, reload: load }
}

// Shared notifications-loading hook (role-filtered server-side — see
// NotificationViewSet.get_queryset). Used by both the Dashboard preview
// and the full NotificationsPage.
function useTeacherNotifications() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    notificationApi.getNotifications({ page_size: 50, ordering: '-published_at' })
      .then(res => setNotifications(res.results))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load notifications.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  return { notifications, loading, error, reload: load }
}

function feedbackDisplayName(f: ApiTeacherFeedback): string {
  return f.student_name?.trim() || 'Anonymous'
}

function notificationTime(n: ApiNotification): string {
  const raw = n.published_at || n.created_at
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// =============================================================================
// Dashboard
// =============================================================================

function Dashboard({ teacher, department }: { teacher: ApiTeacher | null; department: ApiDepartment | null }) {
  const { subjects, semesters } = useLookups()
  const [timetable, setTimetable] = useState<ApiTimetableSlot[]>([])
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [pendingGrading, setPendingGrading] = useState<number | null>(null)
  const [examinations, setExaminations] = useState<ApiExamination[]>([])
  const [examAverages, setExamAverages] = useState<{ name: string; avg: number; max: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { feedback, loading: feedbackLoading, error: feedbackError, reload: reloadFeedback } = useTeacherFeedback()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [tt, myStudents, submissions, exams] = await Promise.all([
          timetableApi.getTimetables({ page_size: 200 }),
          studentApi.getMyStudents({ page_size: 1 }),
          assignmentApi.getSubmissions({ page_size: 200 }),
          examinationApi.getExaminations({ page_size: 5, ordering: '-exam_date' }),
        ])
        if (cancelled) return
        setTimetable(tt.results)
        setStudentCount(myStudents.count)
        setPendingGrading(submissions.results.filter(s => s.status !== 'not_submitted' && (s.obtained_marks === null || s.obtained_marks === undefined)).length)
        setExaminations(exams.results)

        const averages = await Promise.all(exams.results.slice(0, 5).map(async exam => {
          try {
            const marks = await examinationApi.getInternalMarks({ examination: exam.id, page_size: 200 })
            const values = marks.results.map(m => Number(m.marks_obtained)).filter(v => !Number.isNaN(v))
            const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
            return { name: exam.title.length > 14 ? exam.title.slice(0, 14) + '…' : exam.title, avg: Math.round(avg * 10) / 10, max: Number(exam.maximum_marks) }
          } catch {
            return { name: exam.title, avg: 0, max: Number(exam.maximum_marks) }
          }
        }))
        if (!cancelled) setExamAverages(averages)
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load dashboard data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const subjectsTeaching = new Set(timetable.map(t => t.subject)).size
  const todaysClasses = timetable.filter(t => t.day_of_week === today()).sort((a, b) => a.period_number - b.period_number)

  return (
    <div>
      <PageHeader
        title="Teacher Dashboard"
        subtitle={teacher ? `${teacherDisplayName(teacher)} · ${department?.name ?? ''} · ${teacher.designation}` : 'Loading your profile…'}
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="My Students" value={studentCount ?? '—'} icon={<Users className="w-5 h-5" />} color="blue" />
        <StatCard label="Subjects Teaching" value={subjectsTeaching} icon={<Database className="w-5 h-5" />} color="purple" />
        <StatCard label="Today's Classes" value={todaysClasses.length} icon={<ClipboardList className="w-5 h-5" />} color="green" />
        <StatCard label="Pending Grading" value={pendingGrading ?? '—'} icon={<CalendarCheck className="w-5 h-5" />} color="yellow" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Recent Examinations — Average Marks</h3>
          {loading ? (
            <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
          ) : examAverages.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No examinations created yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={examAverages} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="#2563eb" name="Average Marks" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Today's Timetable</h3>
          {loading ? (
            <p className="text-sm text-slate-400 py-4">Loading…</p>
          ) : todaysClasses.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No classes scheduled today.</p>
          ) : (
            todaysClasses.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className="w-20 text-xs text-slate-500 font-mono flex-shrink-0">{t.start_time?.slice(0, 5)}–{t.end_time?.slice(0, 5)}</div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{subjectLabel(subjects, t.subject)}</p>
                  <p className="text-xs text-slate-500">{t.room_number} · {semesterLabel(semesters, t.semester)}</p>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-slate-900 mb-4 font-display">Recent Feedback from Students</h3>
        {feedbackError && <div className="mb-3"><Alert type="error">{feedbackError} <button className="underline font-semibold ml-1" onClick={reloadFeedback}>Retry</button></Alert></div>}
        <div className="space-y-3">
          {feedbackLoading ? (
            <p className="text-sm text-slate-400 py-4 text-center">Loading…</p>
          ) : feedback.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No feedback available</p>
          ) : (
            feedback.slice(0, 5).map(f => (
              <div key={f.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <Avatar name={feedbackDisplayName(f)} size="sm" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-700">{feedbackDisplayName(f)}</span>
                    <span className="text-amber-400">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                  </div>
                  <p className="text-xs text-slate-600">{f.comment}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

// =============================================================================
// Attendance Entry — Teacher's own timetable -> AttendanceSession -> Records
// =============================================================================

function AttendanceEntry({ notify }: { notify: (msg: string) => void }) {
  const { subjects, semesters } = useLookups()
  const [timetable, setTimetable] = useState<ApiTimetableSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [date, setDate] = useState<string>(todayISO())
  const [session, setSession] = useState<ApiAttendanceSession | null>(null)
  const [students, setStudents] = useState<ApiStudent[]>([])
  const [records, setRecords] = useState<Record<string, { id: string | null; status: ApiAttendanceRecord['status'] }>>({})
  const [loadingTimetable, setLoadingTimetable] = useState(true)
  const [loadingClass, setLoadingClass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    timetableApi.getTimetables({ page_size: 200, ordering: 'day_of_week' })
      .then(res => { if (!cancelled) { setTimetable(res.results); setLoadingTimetable(false) } })
      .catch(err => { if (!cancelled) { setError(err instanceof ApiError ? err.message : 'Failed to load your timetable.'); setLoadingTimetable(false) } })
    return () => { cancelled = true }
  }, [])

  async function loadClass() {
    if (!selectedSlot || !date) return
    setLoadingClass(true)
    setError(null)
    try {
      const slot = timetable.find(t => t.id === selectedSlot)
      if (!slot) throw new Error('Class not found in your timetable.')

      const existing = await attendanceApi.getSessions({ timetable: slot.id, attendance_date: date, page_size: 1 })
      const sess = existing.results[0] ?? await attendanceApi.createSession({ timetable: slot.id, attendance_date: date })

      const [studentRes, recordRes] = await Promise.all([
        studentApi.getMyStudents({ semester: slot.semester, page_size: 200 }),
        attendanceApi.getRecords({ attendance_session: sess.id, page_size: 200 }),
      ])

      const recMap: Record<string, { id: string | null; status: ApiAttendanceRecord['status'] }> = {}
      for (const s of studentRes.results) recMap[s.id] = { id: null, status: 'present' }
      for (const r of recordRes.results) recMap[r.student] = { id: r.id, status: r.status }

      setSession(sess)
      setStudents(studentRes.results)
      setRecords(recMap)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load class roster.')
      setSession(null)
      setStudents([])
    } finally {
      setLoadingClass(false)
    }
  }

  function toggle(studentId: string) {
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status: prev[studentId]?.status === 'present' ? 'absent' : 'present' },
    }))
  }

  function markAll(status: ApiAttendanceRecord['status']) {
    setRecords(prev => {
      const next = { ...prev }
      for (const id of Object.keys(next)) next[id] = { ...next[id], status }
      return next
    })
  }

  async function handleSave() {
    if (!session) return
    setSaving(true)
    setError(null)
    try {
      await Promise.all(students.map(s => {
        const rec = records[s.id]
        if (!rec) return Promise.resolve()
        if (rec.id) return attendanceApi.updateRecord(rec.id, { status: rec.status })
        return attendanceApi.createRecord({ attendance_session: session.id, student: s.id, status: rec.status })
      }))
      notify('Attendance saved successfully')
      await loadClass()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  const presentCount = Object.values(records).filter(r => r.status === 'present').length

  return (
    <div>
      <PageHeader title="Attendance Entry" subtitle="Select your class and date to mark attendance" />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <Card className="mb-5">
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <Select label="Class" value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)} disabled={loadingTimetable}>
            <option value="">{loadingTimetable ? 'Loading your classes…' : 'Select a class'}</option>
            {timetable.map(t => (
              <option key={t.id} value={t.id}>
                {DAY_LABELS[t.day_of_week]} P{t.period_number} · {subjectLabel(subjects, t.subject)} · {semesterLabel(semesters, t.semester)}
              </option>
            ))}
          </Select>
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Button onClick={loadClass} disabled={!selectedSlot || loadingClass}>{loadingClass ? 'Loading…' : 'Load Class'}</Button>
        </div>
        {!loadingTimetable && timetable.length === 0 && (
          <p className="text-sm text-slate-400 mt-3">You have no timetable slots assigned yet.</p>
        )}
      </Card>

      {session && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <Card className="text-center"><div className="text-2xl font-bold text-slate-900 font-display">{students.length}</div><div className="text-xs text-slate-500">Total Students</div></Card>
            <Card className="text-center"><div className="text-2xl font-bold text-emerald-600 font-display">{presentCount}</div><div className="text-xs text-slate-500">Present</div></Card>
            <Card className="text-center"><div className="text-2xl font-bold text-red-500 font-display">{students.length - presentCount}</div><div className="text-xs text-slate-500">Absent</div></Card>
          </div>
          <Card>
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => markAll('present')}>Mark All Present</Button>
                <Button size="sm" variant="outline" onClick={() => markAll('absent')}>Mark All Absent</Button>
              </div>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Attendance'}</Button>
            </div>
            {students.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No students enrolled in this class's semester yet.</p>
            ) : (
              <div className="space-y-2">
                {students.map(s => {
                  const rec = records[s.id]
                  const present = rec?.status === 'present'
                  return (
                    <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${present ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex items-center gap-3">
                        <Avatar name={`${s.user.first_name} ${s.user.last_name}`} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{s.user.first_name} {s.user.last_name}</p>
                          <p className="text-xs text-slate-500">{s.roll_number || s.admission_number}</p>
                        </div>
                      </div>
                      <button onClick={() => toggle(s.id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${present ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-red-400 text-white hover:bg-red-500'}`}>
                        {present ? 'Present' : 'Absent'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

// =============================================================================
// Student List — derived from the teacher's OWN timetable (Teacher -> Timetable -> Semester -> Students)
// =============================================================================

function StudentList() {
  const [students, setStudents] = useState<ApiStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    studentApi.getMyStudents({ page_size: 200 })
      .then(res => setStudents(res.results))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load your students.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div>
      <PageHeader title="Student List" subtitle={loading ? 'Loading…' : `${students.length} student${students.length === 1 ? '' : 's'} across your classes`} />
      {error && <div className="mb-4"><Alert type="error">{error} <button className="underline font-semibold ml-1" onClick={load}>Retry</button></Alert></div>}
      {loading ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">Loading students…</p></Card>
      ) : students.length === 0 ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">No students found for your assigned classes yet.</p></Card>
      ) : (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'roll_number', header: 'Roll No', render: r => String(r.roll_number || r.admission_number) },
              { key: 'name', header: 'Name', render: r => {
                const student = r as unknown as ApiStudent
                return <div className="flex items-center gap-2"><Avatar name={`${student.user.first_name} ${student.user.last_name}`} size="sm" />{student.user.first_name} {student.user.last_name}</div>
              } },
              { key: 'course', header: 'Course', render: r => (r as unknown as ApiStudent).course_detail?.code ?? '' },
              { key: 'semester', header: 'Semester', render: r => `Sem ${(r as unknown as ApiStudent).semester_detail?.semester_number ?? ''}` },
              { key: 'email', header: 'Email' },
              { key: 'is_active', header: 'Status', render: r => <Badge variant={(r as unknown as ApiStudent).is_active ? 'green' : 'red'}>{(r as unknown as ApiStudent).is_active ? 'Active' : 'Inactive'}</Badge> },
            ]}
            data={students as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}
    </div>
  )
}

// =============================================================================
// Assignment Management
// =============================================================================

function AssignmentMgmt({ notify }: { notify: (msg: string) => void }) {
  const { subjects, semesters } = useLookups()
  const [assignments, setAssignments] = useState<ApiAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [viewing, setViewing] = useState<ApiAssignment | null>(null)
  const [viewSubmissions, setViewSubmissions] = useState<ApiAssignmentSubmission[]>([])
  const [viewStudentMap, setViewStudentMap] = useState<Record<string, ApiStudent>>({})
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)

  const [grading, setGrading] = useState<ApiAssignment | null>(null)
  const [gradeInputs, setGradeInputs] = useState<Record<string, { obtained_marks: string; feedback: string }>>({})
  const [savingGrades, setSavingGrades] = useState(false)

  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ subject: '', semester: '', title: '', description: '', assigned_date: todayISO(), due_date: '', maximum_marks: '100' })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    assignmentApi.getAssignments({ page_size: 100, ordering: '-created_at' })
      .then(res => setAssignments(res.results))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load assignments.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleAddAssignment() {
    if (!form.title.trim() || !form.subject || !form.semester || !form.due_date || !form.description.trim()) {
      setFormError('Please fill in title, description, subject, semester and due date.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await assignmentApi.createAssignment({
        subject: form.subject, semester: form.semester, title: form.title.trim(), description: form.description.trim(),
        assigned_date: form.assigned_date, due_date: form.due_date, maximum_marks: Number(form.maximum_marks) || 100,
      })
      notify(`"${form.title}" created`)
      setForm({ subject: '', semester: '', title: '', description: '', assigned_date: todayISO(), due_date: '', maximum_marks: '100' })
      setShowNew(false)
      load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create assignment.')
    } finally {
      setSaving(false)
    }
  }

  async function openView(a: ApiAssignment) {
    setViewing(a)
    setLoadingSubmissions(true)
    try {
      const [subs, roster] = await Promise.all([
        assignmentApi.getSubmissions({ assignment: a.id, page_size: 200 }),
        studentApi.getMyStudents({ semester: a.semester, page_size: 200 }),
      ])
      setViewSubmissions(subs.results)
      setViewStudentMap(Object.fromEntries(roster.results.map(s => [s.id, s])))
    } catch {
      setViewSubmissions([])
    } finally {
      setLoadingSubmissions(false)
    }
  }

  async function openGrade(a: ApiAssignment) {
    setGrading(a)
    setLoadingSubmissions(true)
    try {
      const subs = await assignmentApi.getSubmissions({ assignment: a.id, page_size: 200 })
      setViewSubmissions(subs.results)
      const roster = await studentApi.getMyStudents({ semester: a.semester, page_size: 200 })
      setViewStudentMap(Object.fromEntries(roster.results.map(s => [s.id, s])))
      const inputs: Record<string, { obtained_marks: string; feedback: string }> = {}
      for (const sub of subs.results) inputs[sub.id] = { obtained_marks: sub.obtained_marks ?? '', feedback: sub.feedback ?? '' }
      setGradeInputs(inputs)
    } finally {
      setLoadingSubmissions(false)
    }
  }

  async function handleSaveGrades() {
    if (!grading) return
    setSavingGrades(true)
    try {
      await Promise.all(viewSubmissions.map(sub => {
        const input = gradeInputs[sub.id]
        if (!input || input.obtained_marks === '') return Promise.resolve()
        return assignmentApi.gradeSubmission(sub.id, { obtained_marks: Number(input.obtained_marks), feedback: input.feedback })
      }))
      notify('Grades saved successfully')
      setGrading(null)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to save grades.')
    } finally {
      setSavingGrades(false)
    }
  }

  return (
    <div>
      <PageHeader title="Assignment Management" subtitle="Create and track student assignments"
        actions={<Button size="sm" onClick={() => setShowNew(true)}>+ New Assignment</Button>} />

      {error && <div className="mb-4"><Alert type="error">{error} <button className="underline font-semibold ml-1" onClick={load}>Retry</button></Alert></div>}

      {loading ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">Loading assignments…</p></Card>
      ) : assignments.length === 0 ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">No assignments yet. Click "New Assignment" to create one.</p></Card>
      ) : (
        <div className="space-y-4">
          {assignments.map(a => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1"><Badge variant="blue">{subjectLabel(subjects, a.subject)}</Badge>{!a.is_active && <Badge variant="slate">Inactive</Badge>}</div>
                  <h3 className="font-semibold text-slate-900 mb-1">{a.title}</h3>
                  <p className="text-sm text-slate-500">Issued: {a.assigned_date} · Due: {a.due_date} · Max marks: {a.maximum_marks}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <Button size="sm" variant="secondary" onClick={() => openView(a)}>View Submissions</Button>
                <Button size="sm" variant="outline" onClick={() => openGrade(a)}>Grade All</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `Submissions · ${viewing.title}` : 'Submissions'} size="lg">
        {viewing && (
          <div>
            {loadingSubmissions ? (
              <p className="text-sm text-slate-400 py-4 text-center">Loading…</p>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-3">{viewSubmissions.filter(s => s.status !== 'not_submitted').length} of {Object.keys(viewStudentMap).length} students have submitted</p>
                <div className="space-y-2">
                  {Object.values(viewStudentMap).map(s => {
                    const sub = viewSubmissions.find(x => x.student === s.id)
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${s.user.first_name} ${s.user.last_name}`} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{s.user.first_name} {s.user.last_name}</p>
                            <p className="text-xs text-slate-500">{s.roll_number || s.admission_number}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {sub && sub.status !== 'not_submitted' && sub.obtained_marks != null && (
                            <span className="text-xs text-slate-500">Marks: {sub.obtained_marks}/{viewing?.maximum_marks}</span>
                          )}
                          {sub?.submission_file && (
                            <a href={sub.submission_file} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-medium text-blue-600 hover:underline">View File</a>
                          )}
                          <Badge variant={sub && sub.status !== 'not_submitted' ? 'green' : 'red'}>{sub && sub.status !== 'not_submitted' ? (sub.status === 'late' ? 'Submitted (Late)' : 'Submitted') : 'Pending'}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!grading} onClose={() => setGrading(null)} title={grading ? `Grade All · ${grading.title}` : 'Grade All'} size="lg">
        {grading && (
          <div>
            {loadingSubmissions ? (
              <p className="text-sm text-slate-400 py-4 text-center">Loading…</p>
            ) : viewSubmissions.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No submissions yet for this assignment.</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {viewSubmissions.map(sub => {
                    const s = viewStudentMap[sub.student]
                    return (
                      <div key={sub.id} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={s ? `${s.user.first_name} ${s.user.last_name}` : sub.student} size="sm" />
                            <p className="text-sm font-medium text-slate-900 truncate">{s ? `${s.user.first_name} ${s.user.last_name}` : sub.student}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {sub.submission_file && (
                              <a href={sub.submission_file} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-medium text-blue-600 hover:underline">View File</a>
                            )}
                            <input type="number" min={0} max={Number(grading.maximum_marks)} placeholder={`/${grading.maximum_marks}`}
                              value={gradeInputs[sub.id]?.obtained_marks ?? ''}
                              onChange={e => setGradeInputs(prev => ({ ...prev, [sub.id]: { ...prev[sub.id], obtained_marks: e.target.value, feedback: prev[sub.id]?.feedback ?? '' } }))}
                              className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                        <textarea placeholder="Feedback (optional)" rows={1}
                          value={gradeInputs[sub.id]?.feedback ?? ''}
                          onChange={e => setGradeInputs(prev => ({ ...prev, [sub.id]: { obtained_marks: prev[sub.id]?.obtained_marks ?? '', feedback: e.target.value } }))}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" onClick={handleSaveGrades} disabled={savingGrades}>{savingGrades ? 'Saving…' : 'Save Grades'}</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setGrading(null)}>Cancel</Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Assignment">
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error">{formError}</Alert>}
          <Select label="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
            <option value="">Select subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </Select>
          <Select label="Semester" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
            <option value="">Select semester</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{semesterLabel(semesters, s.id)}</option>)}
          </Select>
          <Input label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Assignment title" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the assignment requirements for students" rows={3}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Assigned Date" type="date" value={form.assigned_date} onChange={e => setForm({ ...form, assigned_date: e.target.value })} />
            <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <Input label="Maximum Marks" type="number" min={1} value={form.maximum_marks} onChange={e => setForm({ ...form, maximum_marks: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleAddAssignment} disabled={saving}>{saving ? 'Creating…' : 'Create Assignment'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// =============================================================================
// Marks Entry — teacher selects one of their OWN Examinations, then enters
// InternalMark rows for the students in that examination's semester.
// =============================================================================

function MarksEntry({ notify }: { notify: (msg: string) => void }) {
  const { subjects, semesters } = useLookups()
  const [examinations, setExaminations] = useState<ApiExamination[]>([])
  const [selectedExam, setSelectedExam] = useState<string>('')
  const [students, setStudents] = useState<ApiStudent[]>([])
  const [marks, setMarks] = useState<Record<string, { id: string | null; value: string }>>({})
  const [loadingExams, setLoadingExams] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showNewExam, setShowNewExam] = useState(false)
  const [examForm, setExamForm] = useState({ subject: '', semester: '', exam_type: 'internal_1' as ApiExamination['exam_type'], title: '', exam_date: todayISO(), maximum_marks: '30', passing_marks: '12' })
  const [examFormError, setExamFormError] = useState<string | null>(null)
  const [savingExam, setSavingExam] = useState(false)

  function loadExams() {
    setLoadingExams(true)
    examinationApi.getExaminations({ page_size: 100, ordering: '-exam_date' })
      .then(res => { setExaminations(res.results); if (!selectedExam && res.results[0]) setSelectedExam(res.results[0].id) })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load examinations.'))
      .finally(() => setLoadingExams(false))
  }
  useEffect(loadExams, []) // eslint-disable-line react-hooks/exhaustive-deps

  const exam = examinations.find(e => e.id === selectedExam) ?? null

  useEffect(() => {
    if (!exam) { setStudents([]); setMarks({}); return }
    let cancelled = false
    setLoadingRoster(true)
    setError(null)
    Promise.all([
      studentApi.getMyStudents({ semester: exam.semester, page_size: 200 }),
      examinationApi.getInternalMarks({ examination: exam.id, page_size: 200 }),
    ]).then(([roster, existing]) => {
      if (cancelled) return
      setStudents(roster.results)
      const m: Record<string, { id: string | null; value: string }> = {}
      for (const s of roster.results) m[s.id] = { id: null, value: '' }
      for (const im of existing.results) m[im.student] = { id: im.id, value: im.marks_obtained }
      setMarks(m)
    }).catch(err => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load marks roster.') })
      .finally(() => { if (!cancelled) setLoadingRoster(false) })
    return () => { cancelled = true }
  }, [exam?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!exam) return
    setSaving(true)
    setError(null)
    try {
      await Promise.all(students.map(s => {
        const entry = marks[s.id]
        if (!entry || entry.value === '') return Promise.resolve()
        const marksValue = Number(entry.value)
        if (Number.isNaN(marksValue)) return Promise.resolve()
        if (entry.id) return examinationApi.updateInternalMark(entry.id, { marks_obtained: marksValue })
        return examinationApi.upsertInternalMark({ examination: exam.id, student: s.id, marks_obtained: marksValue })
      }))
      notify('Marks saved successfully')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save marks.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateExam() {
    if (!examForm.subject || !examForm.semester || !examForm.title.trim() || !examForm.exam_date) {
      setExamFormError('Please fill in subject, semester, title and exam date.')
      return
    }
    setSavingExam(true)
    setExamFormError(null)
    try {
      const created = await examinationApi.createExamination({
        subject: examForm.subject, semester: examForm.semester, exam_type: examForm.exam_type,
        title: examForm.title.trim(), exam_date: examForm.exam_date,
        maximum_marks: Number(examForm.maximum_marks) || 30, passing_marks: Number(examForm.passing_marks) || 0,
      })
      notify(`"${created.title}" created`)
      setShowNewExam(false)
      setExaminations(prev => [created, ...prev])
      setSelectedExam(created.id)
    } catch (err) {
      setExamFormError(err instanceof ApiError ? err.message : 'Failed to create examination.')
    } finally {
      setSavingExam(false)
    }
  }

  return (
    <div>
      <PageHeader title="Marks Entry" subtitle={exam ? `${exam.title} · ${subjectLabel(subjects, exam.subject)}` : 'Select an examination to enter marks'}
        actions={<Button size="sm" variant="outline" onClick={() => setShowNewExam(true)}>+ New Examination</Button>} />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <Card className="mb-5">
        <Select label="Examination" value={selectedExam} onChange={e => setSelectedExam(e.target.value)} disabled={loadingExams}>
          <option value="">{loadingExams ? 'Loading…' : 'Select an examination'}</option>
          {examinations.map(e => <option key={e.id} value={e.id}>{e.title} · {subjectLabel(subjects, e.subject)} · {e.exam_date}</option>)}
        </Select>
        {!loadingExams && examinations.length === 0 && <p className="text-sm text-slate-400 mt-3">You haven't created any examinations yet.</p>}
      </Card>

      {exam && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 font-display">{exam.title} — max {exam.maximum_marks}</h3>
            <Button size="sm" onClick={handleSave} disabled={saving || loadingRoster}>{saving ? 'Saving…' : 'Save Marks'}</Button>
          </div>
          {loadingRoster ? (
            <p className="text-sm text-slate-400 py-6 text-center">Loading roster…</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No students found for this examination's semester.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Roll No', 'Name', `Marks (/${exam.maximum_marks})`].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">{s.roll_number || s.admission_number}</td>
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><Avatar name={`${s.user.first_name} ${s.user.last_name}`} size="sm" />{s.user.first_name} {s.user.last_name}</div></td>
                      <td className="px-4 py-2.5">
                        <input type="number" min={0} max={Number(exam.maximum_marks)} value={marks[s.id]?.value ?? ''}
                          onChange={e => setMarks(prev => ({ ...prev, [s.id]: { id: prev[s.id]?.id ?? null, value: e.target.value } }))}
                          className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal open={showNewExam} onClose={() => setShowNewExam(false)} title="New Examination">
        <div className="flex flex-col gap-4">
          {examFormError && <Alert type="error">{examFormError}</Alert>}
          <Select label="Subject" value={examForm.subject} onChange={e => setExamForm({ ...examForm, subject: e.target.value })}>
            <option value="">Select subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </Select>
          <Select label="Semester" value={examForm.semester} onChange={e => setExamForm({ ...examForm, semester: e.target.value })}>
            <option value="">Select semester</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{semesterLabel(semesters, s.id)}</option>)}
          </Select>
          <Select label="Exam Type" value={examForm.exam_type} onChange={e => setExamForm({ ...examForm, exam_type: e.target.value as ApiExamination['exam_type'] })}>
            <option value="internal_1">Internal 1</option>
            <option value="internal_2">Internal 2</option>
            <option value="model">Model</option>
            <option value="practical">Practical</option>
            <option value="viva">Viva</option>
            <option value="semester">Semester</option>
          </Select>
          <Input label="Title" value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} placeholder="e.g. Internal Assessment 1" />
          <Input label="Exam Date" type="date" value={examForm.exam_date} onChange={e => setExamForm({ ...examForm, exam_date: e.target.value })} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Maximum Marks" type="number" min={1} value={examForm.maximum_marks} onChange={e => setExamForm({ ...examForm, maximum_marks: e.target.value })} />
            <Input label="Passing Marks" type="number" min={0} value={examForm.passing_marks} onChange={e => setExamForm({ ...examForm, passing_marks: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCreateExam} disabled={savingExam}>{savingExam ? 'Creating…' : 'Create Examination'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowNewExam(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// =============================================================================
// Feedback / Leave Approval / Notifications — no backend model exists yet for
// these, left as clearly UI-only mock sections per instructions rather than
// inventing new models.
// =============================================================================

function FeedbackPage() {
  const { feedback, loading, error, reload } = useTeacherFeedback()
  const avgRating = feedback.length > 0 ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1) : '—'
  return (
    <div>
      <PageHeader title="Feedback" subtitle="Student feedback across your subjects" />
      {error && <div className="mb-4"><Alert type="error">{error} <button className="underline font-semibold ml-1" onClick={reload}>Retry</button></Alert></div>}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <StatCard label="Total Responses" value={feedback.length} icon={<MessageCircle className="w-5 h-5" />} color="blue" />
        <StatCard label="Average Rating" value={`${avgRating} / 5`} icon={<MessageCircle className="w-5 h-5" />} color="green" />
      </div>
      <Card>
        <h3 className="font-semibold text-slate-900 mb-4 font-display">All Feedback</h3>
        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
        ) : feedback.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No feedback available</p>
        ) : (
          <div className="space-y-3">
            {feedback.map(f => (
              <div key={f.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <Avatar name={feedbackDisplayName(f)} size="sm" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-700">{feedbackDisplayName(f)}</span>
                    <span className="text-amber-400">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                  </div>
                  <p className="text-xs text-slate-600">{f.comment}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function leaveApplicantName(r: ApiLeaveRequest): string {
  if (r.applicant_type === 'student') return r.student_name?.trim() || 'Student'
  if (r.applicant_type === 'teacher') return r.teacher_name?.trim() || 'Teacher'
  return r.staff_name?.trim() || 'Staff'
}

function LeaveApproval({ notify }: { notify: (msg: string) => void }) {
  const [requests, setRequests] = useState<ApiLeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decidingId, setDecidingId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    leaveApi.getForReview({ page_size: 200, ordering: '-created_at' })
      .then(res => setRequests(res.results))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load leave requests.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function respond(id: string, decision: 'approved' | 'rejected') {
    setDecidingId(id)
    try {
      const updated = await leaveApi.decide(id, { status: decision })
      setRequests(prev => prev.map(r => r.id === id ? updated : r))
      notify(`Leave request ${decision}`)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update leave request.')
    } finally {
      setDecidingId(null)
    }
  }

  const pending = requests.filter(r => r.status === 'pending').length

  return (
    <div>
      <PageHeader title="Leave Approval" subtitle={`${pending} pending request${pending === 1 ? '' : 's'}`} />
      {error && <div className="mb-4"><Alert type="error">{error} <button className="underline font-semibold ml-1" onClick={load}>Retry</button></Alert></div>}
      {loading ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">Loading…</p></Card>
      ) : requests.length === 0 ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">No leave requests to review.</p></Card>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <Card key={r.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={leaveApplicantName(r)} size="sm" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{leaveApplicantName(r)}</p>
                  <p className="text-xs text-slate-500">{r.reason} · {r.start_date} – {r.end_date}</p>
                </div>
              </div>
              {r.status === 'pending' ? (
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" disabled={decidingId === r.id} onClick={() => respond(r.id, 'approved')}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={decidingId === r.id} onClick={() => respond(r.id, 'rejected')}>Reject</Button>
                </div>
              ) : (
                <Badge variant={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'slate'}>{r.status}</Badge>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationsPage() {
  const { notifications, loading, error, reload } = useTeacherNotifications()
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Recent updates for your account" />
      {error && <div className="mb-4"><Alert type="error">{error} <button className="underline font-semibold ml-1" onClick={reload}>Retry</button></Alert></div>}
      {loading ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">Loading…</p></Card>
      ) : notifications.length === 0 ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">No notifications yet.</p></Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <Card key={n.id} className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0"><Bell className="w-4 h-4" /></div>
              <div>
                <p className="font-medium text-slate-900 text-sm">{n.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-slate-400 mt-1">{notificationTime(n)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Timetable — real backend data, teacher-scoped server-side
// =============================================================================

function TimetablePage() {
  const { subjects, semesters } = useLookups()
  const [timetable, setTimetable] = useState<ApiTimetableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    timetableApi.getTimetables({ page_size: 200, ordering: 'day_of_week,period_number' })
      .then(res => setTimetable(res.results))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load your timetable.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const byDay = days.map(d => ({ day: d, slots: timetable.filter(t => t.day_of_week === d).sort((a, b) => a.period_number - b.period_number) })).filter(d => d.slots.length > 0)

  return (
    <div>
      <PageHeader title="Timetable" subtitle="Your teaching schedule" />
      {error && <div className="mb-4"><Alert type="error">{error} <button className="underline font-semibold ml-1" onClick={load}>Retry</button></Alert></div>}
      {loading ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">Loading…</p></Card>
      ) : byDay.length === 0 ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">No timetable slots assigned to you yet.</p></Card>
      ) : (
        <div className="space-y-4">
          {byDay.map(({ day, slots }) => (
            <Card key={day}>
              <h3 className="font-semibold text-slate-900 mb-4 font-display">{DAY_LABELS[day]}</h3>
              {slots.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
                  <div className="w-24 text-xs text-slate-500 font-mono flex-shrink-0">{t.start_time?.slice(0, 5)}–{t.end_time?.slice(0, 5)}</div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{subjectLabel(subjects, t.subject)}</p>
                    <p className="text-xs text-slate-500">{t.room_number} · {semesterLabel(semesters, t.semester)}</p>
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

const emptyNoteForm = { title: '', subject: '', semester: '', topic: '', description: '' }

// Backend StudyMaterial has no `topic` column (Notes UI is the only place
// that wants one). Rather than inventing a new field/migration for a single
// cosmetic badge, the topic is folded into the stored description behind a
// recognizable "Topic: ..." first line and parsed back out for display.
const TOPIC_PREFIX = 'Topic: '
function packDescription(topic: string, description: string): string {
  const desc = description.trim()
  if (!topic.trim()) return desc
  return `${TOPIC_PREFIX}${topic.trim()}${desc ? `\n${desc}` : ''}`
}
function unpackDescription(stored: string | null | undefined): { topic: string; description: string } {
  const raw = stored ?? ''
  if (raw.startsWith(TOPIC_PREFIX)) {
    const [firstLine, ...rest] = raw.split('\n')
    return { topic: firstLine.slice(TOPIC_PREFIX.length), description: rest.join('\n') }
  }
  return { topic: '', description: raw }
}

function inferMaterialType(file: File | null): ApiStudyMaterial['material_type'] {
  const ext = (file?.name.split('.').pop() || '').toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'ppt' || ext === 'pptx') return 'ppt'
  if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) return 'video'
  return 'notes'
}

function UploadNotes({ notify }: { notify: (msg: string) => void }) {
  const { subjects, semesters } = useLookups()
  const [materials, setMaterials] = useState<ApiStudyMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ApiStudyMaterial | null>(null)
  const [form, setForm] = useState(emptyNoteForm)
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    studyMaterialApi.getMaterials({ page_size: 100 })
      .then(res => setMaterials(res.results))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load notes.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  function openNew() {
    setEditing(null)
    setForm(emptyNoteForm)
    setFile(null)
    setErrors({})
    setShowForm(true)
  }

  function openEdit(n: ApiStudyMaterial) {
    const { topic, description } = unpackDescription(n.description)
    setEditing(n)
    setForm({ title: n.title, subject: n.subject, semester: n.semester, topic, description })
    setFile(null)
    setErrors({})
    setShowForm(true)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.subject) e.subject = 'Subject is required'
    if (!form.semester) e.semester = 'Semester is required'
    if (!editing && !file) e.file = 'Please select a file to upload'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const description = packDescription(form.topic, form.description)
      if (editing) {
        await studyMaterialApi.updateMaterial(editing.id, {
          title: form.title.trim(),
          description,
          material_type: file ? inferMaterialType(file) : editing.material_type,
        }, file)
        notify(`"${form.title}" updated`)
      } else {
        await studyMaterialApi.createMaterial({
          subject: form.subject,
          semester: form.semester,
          title: form.title.trim(),
          description,
          material_type: inferMaterialType(file),
          uploaded_at: new Date().toISOString(),
        }, file)
        notify(`"${form.title}" uploaded and shared with students`)
      }
      setShowForm(false)
      load()
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Failed to save note.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(n: ApiStudyMaterial) {
    try {
      await studyMaterialApi.deleteMaterial(n.id)
      notify(`"${n.title}" deleted`)
      load()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete note.')
    }
  }

  return (
    <div>
      <PageHeader title="Upload Notes" subtitle="Study materials you share are visible to students immediately"
        actions={<Button size="sm" onClick={openNew}>+ Upload Notes</Button>} />

      {error && <div className="mb-4"><Alert type="error">{error} <button className="underline font-semibold ml-1" onClick={load}>Retry</button></Alert></div>}

      {loading ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">Loading notes…</p></Card>
      ) : materials.length === 0 ? (
        <Card className="text-center py-10">
          <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No notes uploaded yet. Click "Upload Notes" to add your first study material.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {materials.map(n => {
            const { topic, description } = unpackDescription(n.description)
            return (
              <Card key={n.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="blue">{subjectLabel(subjects, n.subject)}</Badge>
                      {topic && <Badge variant="slate">{topic}</Badge>}
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{n.title}</h3>
                    {description && <p className="text-sm text-slate-500 mb-1">{description}</p>}
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> {n.file ? n.file.split('/').pop() : 'No file'} · Uploaded {new Date(n.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(n)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(n)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Note' : 'Upload Notes'}>
        <div className="flex flex-col gap-4">
          {errors.form && <Alert type="error">{errors.form}</Alert>}
          <Input label="Note / Material Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Unit 3 – Binary Trees" error={errors.title} />
          <Select label="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} disabled={!!editing}>
            <option value="">Select subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </Select>
          {errors.subject && <p className="text-xs text-red-500 -mt-3">{errors.subject}</p>}
          <Select label="Semester" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} disabled={!!editing}>
            <option value="">Select semester</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{semesterLabel(semesters, s.id)}</option>)}
          </Select>
          {errors.semester && <p className="text-xs text-red-500 -mt-3">{errors.semester}</p>}
          <Input label="Topic (optional)" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}
            placeholder="e.g. Binary Trees" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description for students" rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">File{editing ? ' (leave blank to keep existing file)' : ''}</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium" />
            {editing && !file && editing.file && <p className="text-xs text-slate-400">Current file: {editing.file.split('/').pop()}</p>}
            {errors.file && <p className="text-xs text-red-500">{errors.file}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Upload'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const emptyQuestionForm = { subject: '', topic: '', question: '', type: 'MCQ' as ApiQuestionType, options: ['', '', '', ''], correctAnswer: '', marks: '' }

function QuestionBank({ notify }: { notify: (msg: string) => void }) {
  const { subjects } = useLookups()
  const [questions, setQuestions] = useState<ApiQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ApiQuestion | null>(null)
  const [form, setForm] = useState(emptyQuestionForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    questionBankApi.getQuestions({ page_size: 100, ordering: '-created_at' })
      .then(res => setQuestions(res.results))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load questions.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  function openNew() {
    setEditing(null)
    setForm(emptyQuestionForm)
    setErrors({})
    setShowForm(true)
  }

  function openEdit(q: ApiQuestion) {
    setEditing(q)
    setForm({
      subject: q.subject, topic: q.topic ?? '', question: q.question_text, type: q.question_type,
      options: q.question_type === 'MCQ' ? [...q.options, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
      correctAnswer: q.correct_answer, marks: String(q.marks),
    })
    setErrors({})
    setShowForm(true)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.subject) e.subject = 'Subject is required'
    if (!form.question.trim()) e.question = 'Question text is required'
    if (!form.marks || Number(form.marks) <= 0) e.marks = 'Enter valid marks'
    if (form.type === 'MCQ') {
      const filledOptions = form.options.filter(o => o.trim())
      if (filledOptions.length < 2) e.options = 'Enter at least 2 options'
      if (!form.correctAnswer.trim()) e.correctAnswer = 'Select the correct answer'
    } else if (!form.correctAnswer.trim()) {
      e.correctAnswer = 'Enter the expected answer'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        subject: form.subject,
        topic: form.topic.trim(),
        question_text: form.question.trim(),
        question_type: form.type,
        options: form.type === 'MCQ' ? form.options.filter(o => o.trim()) : [],
        correct_answer: form.correctAnswer.trim(),
        marks: Number(form.marks),
      }
      if (editing) {
        await questionBankApi.updateQuestion(editing.id, payload)
        notify('Question updated')
      } else {
        await questionBankApi.createQuestion(payload)
        notify('Question added to Question Bank')
      }
      setShowForm(false)
      load()
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Failed to save question.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(q: ApiQuestion) {
    try {
      await questionBankApi.deleteQuestion(q.id)
      notify('Question deleted')
      load()
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to delete question.')
    }
  }

  return (
    <div>
      <PageHeader title="Question Bank" subtitle="Create and manage questions for assessments"
        actions={<Button size="sm" onClick={openNew}>+ Add Question</Button>} />

      {error && <div className="mb-4"><Alert type="error">{error} <button className="underline font-semibold ml-1" onClick={load}>Retry</button></Alert></div>}

      {loading ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">Loading questions…</p></Card>
      ) : questions.length === 0 ? (
        <Card className="text-center py-10">
          <Database className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No questions yet. Click "Add Question" to build your Question Bank.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map(q => (
            <Card key={q.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="blue">{subjectLabel(subjects, q.subject)}</Badge>
                    {q.topic && <Badge variant="slate">{q.topic}</Badge>}
                    <Badge variant="purple">{q.question_type}</Badge>
                    <Badge variant="green">{q.marks} marks</Badge>
                  </div>
                  <p className="font-medium text-slate-900 mb-1">{q.question_text}</p>
                  {q.question_type === 'MCQ' && q.options.length > 0 && (
                    <ul className="text-xs text-slate-500 space-y-0.5 mb-1">
                      {q.options.map((o, i) => (
                        <li key={i} className={o === q.correct_answer ? 'text-emerald-600 font-medium' : ''}>
                          {String.fromCharCode(65 + i)}. {o}{o === q.correct_answer ? ' ✓' : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.question_type !== 'MCQ' && <p className="text-xs text-emerald-600">Answer: {q.correct_answer}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openEdit(q)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(q)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Question' : 'Add Question'} size="lg">
        <div className="flex flex-col gap-4">
          {errors.form && <Alert type="error">{errors.form}</Alert>}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Select label="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </Select>
              {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
            </div>
            <Input label="Topic (optional)" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}
              placeholder="e.g. Binary Trees" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Question</label>
            <textarea value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
              placeholder="Enter the question text" rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" />
            {errors.question && <p className="text-xs text-red-500">{errors.question}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Question Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ApiQuestionType, correctAnswer: '' })}>
              <option value="MCQ">MCQ</option>
              <option value="Short Answer">Short Answer</option>
              <option value="Descriptive">Descriptive</option>
            </Select>
            <Input label="Marks" type="number" min={1} value={form.marks}
              onChange={e => setForm({ ...form, marks: e.target.value })} placeholder="e.g. 5" error={errors.marks} />
          </div>

          {form.type === 'MCQ' ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Options</label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-5">{String.fromCharCode(65 + i)}</span>
                  <input value={opt}
                    onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; setForm({ ...form, options: opts }) }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              {errors.options && <p className="text-xs text-red-500">{errors.options}</p>}
              <Select label="Correct Answer" value={form.correctAnswer} onChange={e => setForm({ ...form, correctAnswer: e.target.value })}>
                <option value="">Select correct option</option>
                {form.options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}
              </Select>
              {errors.correctAnswer && <p className="text-xs text-red-500">{errors.correctAnswer}</p>}
            </div>
          ) : (
            <Input label="Correct / Expected Answer" value={form.correctAnswer}
              onChange={e => setForm({ ...form, correctAnswer: e.target.value })}
              placeholder="Expected answer" error={errors.correctAnswer} />
          )}

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Save Question'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function TeacherDashboard({ page = '' }: { page?: string }) {
  const [toast, setToast] = useState<string | null>(null)
  const { teacher, department, loading: profileLoading, error: profileError } = useTeacherProfile()

  function notify(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2500)
  }

  const pageMap: Record<string, { title: string; component: React.ReactNode }> = {
    '': { title: 'Dashboard', component: <Dashboard teacher={teacher} department={department} /> },
    'attendance': { title: 'Attendance Entry', component: <AttendanceEntry notify={notify} /> },
    'students': { title: 'Student List', component: <StudentList /> },
    'assignments': { title: 'Assignment Management', component: <AssignmentMgmt notify={notify} /> },
    'marks': { title: 'Marks Entry', component: <MarksEntry notify={notify} /> },
    'feedback': { title: 'Feedback', component: <FeedbackPage /> },
    'leaves': { title: 'Leave Approval', component: <LeaveApproval notify={notify} /> },
    'timetable': { title: 'Timetable', component: <TimetablePage /> },
    'notifications': { title: 'Notifications', component: <NotificationsPage /> },
    'notes': { title: 'Upload Notes', component: <UploadNotes notify={notify} /> },
    'questions': { title: 'Question Bank', component: <QuestionBank notify={notify} /> },
  }

  const pageData = pageMap[page] ?? pageMap['']
  const userName = profileLoading ? 'Loading…' : teacherDisplayName(teacher)
  const userSub = profileLoading ? '' : (teacher ? `${department?.name ?? ''} · ${teacher.designation}` : 'Profile unavailable')

  return (
    <DashboardLayout sidebarItems={sidebarItems} role="Teacher" userName={userName} userSub={userSub} pageTitle={pageData.title}>
      {toast && (
        <div className="fixed top-4 right-4 z-[60] max-w-sm">
          <Alert type="success">{toast}</Alert>
        </div>
      )}
      {profileError && !profileLoading && (
        <div className="mb-4"><Alert type="error">{profileError}</Alert></div>
      )}
      {pageData.component}
    </DashboardLayout>
  )
}
