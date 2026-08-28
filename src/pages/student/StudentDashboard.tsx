import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard, ClipboardList, BarChart2, BookMarked, FileText, FolderOpen,
  Calendar, CreditCard, FileCheck, Bell, BookOpen, Briefcase, CalendarDays, User, MessageSquare, Paperclip, Download,
  Upload, CheckCircle2, MapPin, Info, PartyPopper
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { StatCard, Card, Badge, Button, Table, PageHeader, Alert, Modal, Input, Select } from '../../components/ui'
import {
  ApiError, studentApi, timetableApi, attendanceApi, assignmentApi, examinationApi, studyMaterialApi,
  examResultApi, financeApi, scholarshipApi, leaveApi, lookupApi, eventApi, notificationApi, placementApi,
  questionBankApi, documentsApi,
  type ApiStudent, type ApiTimetableSlot, type ApiAttendanceSession, type ApiAttendanceRecord,
  type ApiAssignment, type ApiAssignmentSubmission, type ApiExamination, type ApiInternalMark,
  type ApiStudyMaterial, type ApiSemesterResult, type ApiSemesterResultSubject,
  type ApiFeePayment, type ApiScholarship, type ApiScholarshipApplication, type ApiLeaveRequest,
  type ApiSubject, type ApiNotification, type ApiPlacementDrive, type ApiPlacementApplication, type ApiQuestion,
  type ApiDocument, type ApiRequiredDocumentStatus, type RequiredDocumentStatusValue,
} from '../../services/api'

const sidebarItems = [
  { label: 'Dashboard', to: '/student', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Attendance', to: '/student/attendance', icon: <ClipboardList className="w-4 h-4" /> },
  { label: 'Internal Marks', to: '/student/marks', icon: <BarChart2 className="w-4 h-4" /> },
  { label: 'Semester Results', to: '/student/results', icon: <BookMarked className="w-4 h-4" /> },
  { label: 'Examinations', to: '/student/examinations', icon: <BookMarked className="w-4 h-4" /> },
  { label: 'Assignments', to: '/student/assignments', icon: <FileText className="w-4 h-4" /> },
  { label: 'Study Materials', to: '/student/materials', icon: <FolderOpen className="w-4 h-4" /> },
  { label: 'Question Bank', to: '/student/questions', icon: <BookMarked className="w-4 h-4" /> },
  { label: 'Timetable', to: '/student/timetable', icon: <Calendar className="w-4 h-4" /> },
  { label: 'Fee Details', to: '/student/fees', icon: <CreditCard className="w-4 h-4" /> },
  { label: 'Scholarships', to: '/student/scholarships', icon: <BookMarked className="w-4 h-4" /> },
  { label: 'Leave Application', to: '/student/leave', icon: <FileCheck className="w-4 h-4" /> },
  { label: 'Notifications', to: '/student/notifications', icon: <Bell className="w-4 h-4" /> },
  { label: 'Course Registration', to: '/student/courses', icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Placement', to: '/student/placement', icon: <Briefcase className="w-4 h-4" /> },
  { label: 'Academic Calendar', to: '/student/calendar', icon: <CalendarDays className="w-4 h-4" /> },
  { label: 'Profile', to: '/student/profile', icon: <User className="w-4 h-4" /> },
  { label: 'AI Student Assistant', to: '/student/ai', icon: <MessageSquare className="w-4 h-4" /> },
]

// ---------------------------------------------------------------------------
// Shared "me" cache — every section needs the logged-in Student's identity
// (for greetings, and to resolve course/semester context), so we fetch it
// once via studentApi.getMe() and share the in-flight/resolved promise
// instead of every section re-requesting it independently.
// ---------------------------------------------------------------------------
let meCache: Promise<ApiStudent> | null = null
function getMe(): Promise<ApiStudent> {
  if (!meCache) meCache = studentApi.getMe()
  return meCache
}

// ---------------------------------------------------------------------------
// Priority 14 — mandatory-document (required-status) shared cache. Same
// in-flight/resolved-promise sharing pattern as getMe() above, but must be
// invalidatable: the Dashboard banner and the Profile upload card both read
// it, and an upload/re-upload must make both refetch fresh backend state
// rather than show stale cached status.
// ---------------------------------------------------------------------------
let requiredStatusCache: Promise<ApiRequiredDocumentStatus> | null = null
function getRequiredStatus(): Promise<ApiRequiredDocumentStatus> {
  if (!requiredStatusCache) requiredStatusCache = documentsApi.getRequiredStatus()
  return requiredStatusCache
}
function invalidateRequiredStatus() {
  requiredStatusCache = null
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

function SectionLoading({ label = 'Loading…' }: { label?: string }) {
  return <Card className="text-center py-10 text-sm text-slate-500">{label}</Card>
}

function SectionEmpty({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Card className="text-center py-10">
      {icon}
      <p className="text-sm text-slate-500 mt-3">{label}</p>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Dashboard Overview
// ---------------------------------------------------------------------------
function Dashboard() {
  const [me, setMe] = useState<ApiStudent | null>(null)
  const [timetable, setTimetable] = useState<ApiTimetableSlot[]>([])
  const [assignments, setAssignments] = useState<ApiAssignment[]>([])
  const [submissions, setSubmissions] = useState<ApiAssignmentSubmission[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<ApiAttendanceRecord[]>([])
  const [internalMarks, setInternalMarks] = useState<ApiInternalMark[]>([])
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Priority 14 — pinned mandatory-document banner. Loaded independently of
  // the rest of the dashboard so a failure/slowness elsewhere never hides
  // it, and it is never dismissible: it only disappears once the backend
  // reports all three required documents Verified.
  const [required, setRequired] = useState<ApiRequiredDocumentStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      getMe(),
      timetableApi.getTimetables({ page_size: 50 }).catch(() => ({ results: [] as ApiTimetableSlot[] })),
      assignmentApi.getAssignments({ page_size: 50, ordering: 'due_date' }).catch(() => ({ results: [] as ApiAssignment[] })),
      assignmentApi.getSubmissions({ page_size: 200 }).catch(() => ({ results: [] as ApiAssignmentSubmission[] })),
      attendanceApi.getRecords({ page_size: 500 }).catch(() => ({ results: [] as ApiAttendanceRecord[] })),
      examinationApi.getInternalMarks({ page_size: 200 }).catch(() => ({ results: [] as ApiInternalMark[] })),
      lookupApi.getSubjects().catch(() => [] as ApiSubject[]),
    ])
      .then(([meRes, tt, asg, sub, att, marks, subs]) => {
        if (cancelled) return
        setMe(meRes)
        setTimetable(tt.results)
        setAssignments(asg.results)
        setSubmissions(sub.results)
        setAttendanceRecords(att.results)
        setInternalMarks(marks.results)
        setSubjects(subs)
      })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load your dashboard.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    getRequiredStatus().then(res => { if (!cancelled) setRequired(res) }).catch(() => { if (!cancelled) setRequired(null) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div><PageHeader title="Student Dashboard" /><SectionLoading label="Loading your dashboard…" /></div>
  if (error) return <div><PageHeader title="Student Dashboard" /><Alert type="error">{error}</Alert></div>
  if (!me) return <div><PageHeader title="Student Dashboard" /><Alert type="error">Could not load your profile.</Alert></div>

  const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]))

  const presentCount = attendanceRecords.filter(r => r.status === 'present').length
  const attendancePct = attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : null

  const submittedIds = new Set(submissions.map(s => s.assignment))
  const pendingAssignments = assignments.filter(a => !submittedIds.has(a.id))

  const avgMarks = internalMarks.length > 0
    ? Math.round(internalMarks.reduce((s, m) => s + Number(m.marks_obtained), 0) / internalMarks.length)
    : null

  return (
    <div>
      <PageHeader title="Student Dashboard" subtitle={`Welcome back, ${me.user.first_name} ${me.user.last_name} · ${me.student_id ?? me.admission_number} · Semester ${me.current_semester}`} />
      <RequiredDocumentsBanner required={required} />
      {pendingAssignments.length > 0 && (
        <Alert type="warning" className="mb-6">
          📌 {pendingAssignments.length} assignment{pendingAssignments.length === 1 ? '' : 's'} awaiting submission.
        </Alert>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Attendance" value={attendancePct !== null ? `${attendancePct}%` : '—'} icon={<ClipboardList className="w-5 h-5" />} color="green" />
        <StatCard label="Avg. Internal Marks" value={avgMarks !== null ? String(avgMarks) : '—'} icon={<BarChart2 className="w-5 h-5" />} color="blue" />
        <StatCard label="Department" value={me.department_detail?.name ?? '—'} icon={<BookMarked className="w-5 h-5" />} color="purple" />
        <StatCard label="Pending Assignments" value={String(pendingAssignments.length)} icon={<FileText className="w-5 h-5" />} color="yellow" />
      </div>
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Timetable ({timetable.length} classes/week)</h3>
          {timetable.length === 0 ? (
            <p className="text-sm text-slate-500">No timetable published yet for your course/semester.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {timetable.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700 capitalize">{s.day_of_week}, {s.start_time}–{s.end_time}</span>
                  <span className="text-slate-500">{subjectById[s.subject]?.name ?? s.subject}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Course &amp; Semester</h3>
          <div className="space-y-3 text-sm">
            <div><span className="text-slate-500">Course:</span> <span className="font-medium text-slate-900">{me.course_detail?.name ?? '—'}</span></div>
            <div><span className="text-slate-500">Department:</span> <span className="font-medium text-slate-900">{me.department_detail?.name ?? '—'}</span></div>
            <div><span className="text-slate-500">Semester:</span> <span className="font-medium text-slate-900">{me.current_semester}</span></div>
            <div><span className="text-slate-500">Roll No.:</span> <span className="font-medium text-slate-900">{me.roll_number || '—'}</span></div>
          </div>
        </Card>
      </div>
      <Card>
        <h3 className="font-semibold text-slate-900 mb-4 font-display">Pending Assignments</h3>
        {pendingAssignments.length === 0 ? (
          <p className="text-sm text-slate-500">No pending assignments — nice work.</p>
        ) : (
          <div className="space-y-3">
            {pendingAssignments.slice(0, 5).map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="yellow">Pending</Badge>
                  <span className="text-xs text-slate-400">Due {a.due_date}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">{a.title}</p>
                <p className="text-xs text-blue-600 mt-0.5">{subjectById[a.subject]?.name ?? a.subject}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Attendance (read-only)
// ---------------------------------------------------------------------------
function AttendancePage() {
  const [records, setRecords] = useState<ApiAttendanceRecord[]>([])
  const [sessions, setSessions] = useState<ApiAttendanceSession[]>([])
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [timetable, setTimetable] = useState<ApiTimetableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      attendanceApi.getRecords({ page_size: 1000 }),
      attendanceApi.getSessions({ page_size: 1000 }),
      lookupApi.getSubjects(),
      timetableApi.getTimetables({ page_size: 100 }),
    ])
      .then(([recRes, sessRes, subs, tt]) => {
        if (cancelled) return
        setRecords(recRes.results)
        setSessions(sessRes.results)
        setSubjects(subs)
        setTimetable(tt.results)
      })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load your attendance.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div><PageHeader title="Attendance" /><SectionLoading label="Loading your attendance…" /></div>
  if (error) return <div><PageHeader title="Attendance" /><Alert type="error">{error}</Alert></div>
  if (records.length === 0) return <div><PageHeader title="Attendance" /><SectionEmpty icon={<ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />} label="No attendance records yet." /></div>

  const sessionById = Object.fromEntries(sessions.map(s => [s.id, s]))
  const timetableById = Object.fromEntries(timetable.map(t => [t.id, t]))
  const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]))

  // Group per-subject via session -> timetable -> subject.
  const bySubject: Record<string, { name: string; code: string; present: number; total: number }> = {}
  for (const r of records) {
    const session = sessionById[r.attendance_session]
    const slot = session ? timetableById[session.timetable] : undefined
    const subj = slot ? subjectById[slot.subject] : undefined
    const key = subj?.id ?? slot?.subject ?? 'unknown'
    const name = subj?.name ?? 'Unknown subject'
    const code = subj?.code ?? '—'
    if (!bySubject[key]) bySubject[key] = { name, code, present: 0, total: 0 }
    bySubject[key].total += 1
    if (r.status === 'present') bySubject[key].present += 1
  }
  const subjectRows = Object.values(bySubject)
  const totalPresent = records.filter(r => r.status === 'present').length
  const overallPct = Math.round((totalPresent / records.length) * 100)

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Read-only · marked by your subject teachers" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="text-center"><div className="text-2xl font-bold text-blue-600 font-display">{overallPct}%</div><div className="text-xs text-slate-500 mt-0.5">Overall Attendance</div></Card>
        <Card className="text-center"><div className="text-2xl font-bold text-emerald-600 font-display">{totalPresent}</div><div className="text-xs text-slate-500 mt-0.5">Classes Attended</div></Card>
        <Card className="text-center"><div className="text-2xl font-bold text-red-500 font-display">{records.length - totalPresent}</div><div className="text-xs text-slate-500 mt-0.5">Absences</div></Card>
      </div>
      {subjectRows.map(s => {
        const pct = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
        return (
          <Card key={s.name + s.code} className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-semibold text-slate-900 text-sm">{s.name}</span>
                <span className="ml-2 text-xs text-slate-400">{s.code}</span>
              </div>
              <Badge variant={pct >= 85 ? 'green' : pct >= 75 ? 'yellow' : 'red'}>{pct}%</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${pct >= 85 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-slate-500 whitespace-nowrap">{s.present}/{s.total} classes</span>
            </div>
            {pct < 75 && <p className="text-xs text-red-500 mt-1.5">⚠ Below minimum 75% — attend all remaining classes</p>}
          </Card>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internal Marks (read-only)
// ---------------------------------------------------------------------------
function InternalMarksPage() {
  const [marks, setMarks] = useState<ApiInternalMark[]>([])
  const [exams, setExams] = useState<ApiExamination[]>([])
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      examinationApi.getInternalMarks({ page_size: 500 }),
      examinationApi.getExaminations({ page_size: 200 }),
      lookupApi.getSubjects(),
    ])
      .then(([marksRes, examsRes, subs]) => {
        if (cancelled) return
        setMarks(marksRes.results)
        setExams(examsRes.results)
        setSubjects(subs)
      })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load your internal marks.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div><PageHeader title="Internal Marks" /><SectionLoading label="Loading your marks…" /></div>
  if (error) return <div><PageHeader title="Internal Marks" /><Alert type="error">{error}</Alert></div>
  if (marks.length === 0) return <div><PageHeader title="Internal Marks" /><SectionEmpty icon={<BarChart2 className="w-8 h-8 text-slate-300 mx-auto" />} label="No internal marks published yet." /></div>

  const examById = Object.fromEntries(exams.map(e => [e.id, e]))
  const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]))
  const rows = marks.map(m => {
    const exam = examById[m.examination]
    const subj = exam ? subjectById[exam.subject] : undefined
    return {
      id: m.id,
      subject: subj?.name ?? '—',
      exam: exam?.title ?? m.examination,
      marks: m.marks_obtained,
      max: exam?.maximum_marks ?? '—',
      remarks: m.remarks ?? '—',
    }
  })

  return (
    <div>
      <PageHeader title="Internal Marks" subtitle="Read-only · entered by your subject teachers" />
      <Card padding={false}>
        <Table
          columns={[
            { key: 'subject', header: 'Subject' },
            { key: 'exam', header: 'Examination' },
            { key: 'marks', header: 'Marks Obtained', render: r => <span className="font-semibold text-slate-900">{String(r.marks)}</span> },
            { key: 'max', header: 'Maximum Marks' },
            { key: 'remarks', header: 'Remarks' },
          ]}
          data={rows as unknown as Record<string, unknown>[]}
        />
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Semester Results (read-only)
// ---------------------------------------------------------------------------
function SemesterResultsPage() {
  const [results, setResults] = useState<ApiSemesterResult[]>([])
  const [subjectResults, setSubjectResults] = useState<ApiSemesterResultSubject[]>([])
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      examResultApi.getResults({ page_size: 50 }),
      examResultApi.getResultSubjects({ page_size: 500 }),
      lookupApi.getSubjects(),
    ])
      .then(([resRes, subRes, subs]) => {
        if (cancelled) return
        setResults(resRes.results)
        setSubjectResults(subRes.results)
        setSubjects(subs)
      })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load your semester results.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div><PageHeader title="Semester Results" /><SectionLoading label="Loading your results…" /></div>
  if (error) return <div><PageHeader title="Semester Results" /><Alert type="error">{error}</Alert></div>
  if (results.length === 0) return <div><PageHeader title="Semester Results" /><SectionEmpty icon={<BookMarked className="w-8 h-8 text-slate-300 mx-auto" />} label="No semester results published yet." /></div>

  const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]))

  return (
    <div>
      <PageHeader title="Semester Results" />
      {results.map(res => {
        const subs = subjectResults.filter(sr => sr.semester_result === res.id)
        return (
          <Card key={res.id} className="mb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900 font-display">Result</h3>
                <p className="text-xs text-slate-400">{res.published_date ? `Published ${res.published_date}` : 'Not yet published'}</p>
              </div>
              <Badge variant={res.result_status === 'pass' ? 'green' : res.result_status === 'fail' ? 'red' : 'slate'}>{res.result_status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="text-slate-500">SGPA:</span> <span className="font-bold text-slate-900">{res.sgpa ?? '—'}</span></div>
              <div><span className="text-slate-500">CGPA:</span> <span className="font-bold text-slate-900">{res.cgpa ?? '—'}</span></div>
            </div>
            {subs.length > 0 && (
              <Table
                columns={[
                  { key: 'subject', header: 'Subject', render: r => subjectById[String((r as unknown as ApiSemesterResultSubject).subject)]?.name ?? String((r as unknown as ApiSemesterResultSubject).subject) },
                  { key: 'total_marks', header: 'Total Marks' },
                  { key: 'grade', header: 'Grade', render: r => r.grade ? <Badge variant="blue">{String(r.grade)}</Badge> : '—' },
                  { key: 'credits_earned', header: 'Credits Earned' },
                ]}
                data={subs as unknown as Record<string, unknown>[]}
              />
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Assignments + Submissions
// ---------------------------------------------------------------------------
function AssignmentsPage() {
  const [assignments, setAssignments] = useState<ApiAssignment[]>([])
  const [submissions, setSubmissions] = useState<ApiAssignmentSubmission[]>([])
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitId, setSubmitId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const modalFileInput = useRef<HTMLInputElement | null>(null)

  function load() {
    setLoading(true)
    setError('')
    Promise.all([
      assignmentApi.getAssignments({ page_size: 200, ordering: 'due_date' }),
      assignmentApi.getSubmissions({ page_size: 500 }),
      lookupApi.getSubjects(),
    ])
      .then(([asg, sub, subs]) => {
        setAssignments(asg.results)
        setSubmissions(sub.results)
        setSubjects(subs)
      })
      .catch(err => setError(errorMessage(err, 'Failed to load your assignments.')))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 4000)
  }

  if (loading) return <div><PageHeader title="Assignments" /><SectionLoading label="Loading your assignments…" /></div>
  if (error) return <div><PageHeader title="Assignments" /><Alert type="error">{error}</Alert></div>

  const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]))
  const submissionByAssignment = Object.fromEntries(submissions.map(s => [s.assignment, s]))
  const pending = assignments.filter(a => !submissionByAssignment[a.id])

  async function confirmSubmit() {
    if (!submitId) return
    setSubmitting(true)
    try {
      const file = modalFileInput.current?.files?.[0] ?? null
      const existing = submissionByAssignment[submitId]
      if (existing) {
        // Resubmission — replace the file on the existing row (a file is
        // required here since there is nothing else to change).
        if (!file) { showToast('Please choose a file to resubmit.'); return }
        await assignmentApi.resubmit(existing.id, file)
      } else {
        // Actually creates the AssignmentSubmission row via POST — this is
        // the real persistence step the Teacher's "0 of N submitted" and
        // "Grade All" screens depend on.
        await assignmentApi.createSubmission(submitId, file)
      }
      showToast('Submission recorded.')
      setSubmitOpen(false)
      if (modalFileInput.current) modalFileInput.current.value = ''
      load()
    } catch (err) {
      showToast(errorMessage(err, 'Failed to submit assignment.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (assignments.length === 0) {
    return <div><PageHeader title="Assignments" /><SectionEmpty icon={<FileText className="w-8 h-8 text-slate-300 mx-auto" />} label="No assignments posted for your semester yet." /></div>
  }

  return (
    <div>
      <PageHeader title="Assignments" subtitle="Assignments for your course & semester"
        actions={<Button size="sm" onClick={() => { setSubmitId(pending[0]?.id ?? ''); setSubmitOpen(true) }} disabled={pending.length === 0}>Submit Assignment</Button>} />

      {toast && (
        <Alert type="success" className="mb-4">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {toast}
        </Alert>
      )}

      <div className="space-y-3">
        {assignments.map(a => {
          const submission = submissionByAssignment[a.id]
          const status = submission ? (submission.obtained_marks != null ? 'Graded' : 'Submitted') : 'Pending'
          return (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="blue">{subjectById[a.subject]?.name ?? a.subject}</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900">{a.title}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{a.description}</p>
                  <p className="text-sm text-slate-500 mt-0.5">Due: {a.due_date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge variant={status === 'Submitted' ? 'blue' : status === 'Graded' ? 'green' : 'yellow'}>{status}</Badge>
                  {submission?.obtained_marks != null && <p className="text-sm font-bold text-slate-900 mt-1">{submission.obtained_marks}/{a.maximum_marks}</p>}
                  {submission?.feedback && <p className="text-xs text-slate-400 mt-1 max-w-[160px]">{submission.feedback}</p>}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit Assignment">
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">No pending assignments left to submit.</p>
        ) : (
          <div className="space-y-4">
            <Select label="Assignment" value={submitId} onChange={e => setSubmitId(e.target.value)}>
              {pending.map(a => <option key={a.id} value={a.id}>{a.title} ({subjectById[a.subject]?.name ?? a.subject})</option>)}
            </Select>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">File</label>
              <input ref={modalFileInput} type="file" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm" />
            </div>
            <Button className="w-full" onClick={confirmSubmit} disabled={submitting}>
              <Upload className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Confirm Submission'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Study Materials
// ---------------------------------------------------------------------------
function StudyMaterialsPage() {
  const [materials, setMaterials] = useState<ApiStudyMaterial[]>([])
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([studyMaterialApi.getMaterials({ page_size: 200 }), lookupApi.getSubjects()])
      .then(([res, subs]) => { if (!cancelled) { setMaterials(res.results); setSubjects(subs) } })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load study materials.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div><PageHeader title="Study Materials" /><SectionLoading label="Loading study materials…" /></div>
  if (error) return <div><PageHeader title="Study Materials" /><Alert type="error">{error}</Alert></div>
  if (materials.length === 0) {
    return (
      <div>
        <PageHeader title="Study Materials" subtitle="Notes and resources shared by your teachers" />
        <SectionEmpty icon={<Paperclip className="w-8 h-8 text-slate-300 mx-auto" />} label="No study materials available yet." />
      </div>
    )
  }

  const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]))

  return (
    <div>
      <PageHeader title="Study Materials" subtitle="Notes and resources shared by your teachers" />
      <div className="space-y-3">
        {materials.map(n => (
          <Card key={n.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="blue">{subjectById[n.subject]?.name ?? n.subject}</Badge>
                  <Badge variant="slate">{n.material_type}</Badge>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{n.title}</h3>
                {n.description && <p className="text-sm text-slate-500 mb-1">{n.description}</p>}
                <p className="text-xs text-slate-400">Uploaded {n.uploaded_at}</p>
              </div>
              {(n.file || n.external_url) && (
                <a href={n.file ?? n.external_url ?? '#'} target="_blank" rel="noreferrer" className="flex-shrink-0 text-blue-500 hover:text-blue-700">
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Question Bank — real, read-only, scoped server-side to the Student's own
// course + semester (Problem 2). Never exposes correct_answer over the
// wire (backend strips it for the student role); no create/edit/delete UI.
// ---------------------------------------------------------------------------
function QuestionBankPage() {
  const [questions, setQuestions] = useState<ApiQuestion[]>([])
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('All')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([questionBankApi.getQuestions({ page_size: 300 }), lookupApi.getSubjects()])
      .then(([res, subs]) => { if (!cancelled) { setQuestions(res.results); setSubjects(subs) } })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load the question bank.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div><PageHeader title="Question Bank" /><SectionLoading label="Loading questions…" /></div>
  if (error) return <div><PageHeader title="Question Bank" /><Alert type="error">{error}</Alert></div>

  const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]))
  const visible = subjectFilter === 'All' ? questions : questions.filter(q => q.subject === subjectFilter)
  const usedSubjectIds = Array.from(new Set(questions.map(q => q.subject)))

  if (questions.length === 0) {
    return (
      <div>
        <PageHeader title="Question Bank" subtitle="Practice questions shared by your teachers" />
        <SectionEmpty icon={<BookMarked className="w-8 h-8 text-slate-300 mx-auto" />} label="No questions available for your course & semester yet." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Question Bank" subtitle={`${visible.length} of ${questions.length} questions · your course & semester`}
        actions={
          <Select className="w-48" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
            <option value="All">All Subjects</option>
            {usedSubjectIds.map(id => <option key={id} value={id}>{subjectById[id]?.name ?? id}</option>)}
          </Select>
        } />
      <div className="space-y-3">
        {visible.map(q => (
          <Card key={q.id}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="blue">{subjectById[q.subject]?.name ?? q.subject}</Badge>
              <Badge variant="slate">{q.question_type}</Badge>
              {q.topic && <Badge variant="slate">{q.topic}</Badge>}
              <span className="text-xs text-slate-400 ml-auto">{q.marks} marks</span>
            </div>
            <p className="text-sm font-medium text-slate-900">{q.question_text}</p>
            {q.question_type === 'MCQ' && q.options?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {q.options.map((opt, i) => (
                  <li key={i} className="text-sm text-slate-600 pl-3 border-l-2 border-slate-100">{opt}</li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timetable
// ---------------------------------------------------------------------------
function TimetablePage() {
  const [timetable, setTimetable] = useState<ApiTimetableSlot[]>([])
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([timetableApi.getTimetables({ page_size: 200 }), lookupApi.getSubjects()])
      .then(([res, subs]) => { if (!cancelled) { setTimetable(res.results); setSubjects(subs) } })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load your timetable.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div><PageHeader title="Timetable" /><SectionLoading label="Loading your timetable…" /></div>
  if (error) return <div><PageHeader title="Timetable" /><Alert type="error">{error}</Alert></div>
  if (timetable.length === 0) return <div><PageHeader title="Timetable" /><SectionEmpty icon={<Calendar className="w-8 h-8 text-slate-300 mx-auto" />} label="No timetable published yet for your course/semester." /></div>

  const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]))
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return (
    <div>
      <PageHeader title="Timetable" />
      {days.map(day => {
        const slots = timetable.filter(s => s.day_of_week === day).sort((a, b) => a.period_number - b.period_number)
        if (slots.length === 0) return null
        return (
          <Card key={day} className="mb-3">
            <h3 className="font-semibold text-slate-900 mb-3 font-display capitalize">{day}</h3>
            <div className="space-y-2">
              {slots.map(s => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-28 text-xs text-slate-500 font-mono flex-shrink-0">{s.start_time}–{s.end_time}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{subjectById[s.subject]?.name ?? s.subject}</p>
                  </div>
                  {s.room_number && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                      <MapPin className="w-3 h-3" /> {s.room_number}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fee Details (read-only)
// ---------------------------------------------------------------------------
function FeeDetailsPage() {
  const [payments, setPayments] = useState<ApiFeePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    financeApi.getMyPayments({ page_size: 200 })
      .then(res => { if (!cancelled) setPayments(res.results) })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load your fee records.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div><PageHeader title="Fee Details" /><SectionLoading label="Loading your fee records…" /></div>
  if (error) return <div><PageHeader title="Fee Details" /><Alert type="error">{error}</Alert></div>
  if (payments.length === 0) return <div><PageHeader title="Fee Details" /><SectionEmpty icon={<CreditCard className="w-8 h-8 text-slate-300 mx-auto" />} label="No fee payment records yet." /></div>

  const totalPaid = payments.filter(p => p.payment_status === 'paid').reduce((s, p) => s + Number(p.amount_paid), 0)
  const totalPending = payments.reduce((s, p) => s + Math.max(Number(p.amount_due ?? p.amount_paid) - Number(p.amount_paid), 0), 0)

  return (
    <div>
      <PageHeader title="Fee Details" subtitle="Read-only · payment records maintained by Accounts" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="text-center"><div className="text-2xl font-bold text-emerald-600 font-display">₹{totalPaid.toLocaleString()}</div><div className="text-xs text-slate-500 mt-0.5">Total Paid</div></Card>
        <Card className="text-center"><div className="text-2xl font-bold text-red-500 font-display">₹{totalPending.toLocaleString()}</div><div className="text-xs text-slate-500 mt-0.5">Total Pending</div></Card>
        <Card className="text-center"><div className="text-2xl font-bold text-slate-900 font-display">{payments.length}</div><div className="text-xs text-slate-500 mt-0.5">Fee Records</div></Card>
      </div>
      <Card padding={false}>
        <Table
          columns={[
            { key: 'fee_type_display', header: 'Fee Type', render: r => String(r.fee_type_display ?? '—') },
            { key: 'amount_due', header: 'Amount Due', render: r => r.amount_due != null ? `₹${Number(r.amount_due).toLocaleString()}` : '—' },
            { key: 'amount_paid', header: 'Amount Paid', render: r => `₹${Number(r.amount_paid).toLocaleString()}` },
            { key: 'pending', header: 'Pending', render: r => {
                const due = Number(r.amount_due ?? r.amount_paid); const paid = Number(r.amount_paid)
                const pending = Math.max(due - paid, 0)
                return pending > 0 ? <span className="text-red-500 font-medium">₹{pending.toLocaleString()}</span> : <span className="text-emerald-600">—</span>
              } },
            { key: 'payment_date', header: 'Date' },
            { key: 'payment_status', header: 'Status', render: r => <Badge variant={r.payment_status === 'paid' ? 'green' : r.payment_status === 'partial' ? 'yellow' : 'red'}>{String(r.payment_status)}</Badge> },
            { key: 'remarks', header: 'Remarks', render: r => String(r.remarks ?? '—') },
          ]}
          data={payments as unknown as Record<string, unknown>[]}
        />
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scholarships
// ---------------------------------------------------------------------------
function ScholarshipsPage() {
  const [scholarships, setScholarships] = useState<ApiScholarship[]>([])
  const [applications, setApplications] = useState<ApiScholarshipApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function load() {
    setLoading(true)
    setError('')
    Promise.all([
      scholarshipApi.getScholarships({ is_active: true, page_size: 100 }),
      scholarshipApi.getMyApplications({ page_size: 100 }),
    ])
      .then(([sch, apps]) => { setScholarships(sch.results); setApplications(apps.results) })
      .catch(err => setError(errorMessage(err, 'Failed to load scholarships.')))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function apply(id: string) {
    setApplying(id)
    try {
      await scholarshipApi.apply({ scholarship: id })
      setToast('Application submitted.')
      load()
    } catch (err) {
      setToast(errorMessage(err, 'Failed to submit application.'))
    } finally {
      setApplying(null)
      window.setTimeout(() => setToast(''), 4000)
    }
  }

  if (loading) return <div><PageHeader title="Scholarships" /><SectionLoading label="Loading scholarships…" /></div>
  if (error) return <div><PageHeader title="Scholarships" /><Alert type="error">{error}</Alert></div>

  const appliedIds = new Set(applications.map(a => a.scholarship))

  return (
    <div>
      <PageHeader title="Scholarships" />
      {toast && <Alert type="success" className="mb-4"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {toast}</Alert>}
      {scholarships.length === 0 ? (
        <SectionEmpty icon={<BookMarked className="w-8 h-8 text-slate-300 mx-auto" />} label="No scholarships currently open." />
      ) : (
        <div className="space-y-3 mb-6">
          {scholarships.map(s => {
            const application = applications.find(a => a.scholarship === s.id)
            return (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">{s.name}</h3>
                    <p className="text-sm text-slate-500">{s.provider} · ₹{Number(s.amount).toLocaleString()}</p>
                    {s.description && <p className="text-xs text-slate-400 mt-1">{s.description}</p>}
                  </div>
                  {application ? (
                    <Badge variant={application.status === 'approved' ? 'green' : application.status === 'rejected' ? 'red' : 'yellow'}>{application.status}</Badge>
                  ) : (
                    <Button size="sm" onClick={() => apply(s.id)} disabled={applying === s.id || appliedIds.has(s.id)}>
                      {applying === s.id ? 'Applying…' : 'Apply'}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leave Application
// ---------------------------------------------------------------------------
function LeaveApplicationPage() {
  const [applications, setApplications] = useState<ApiLeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ from: '', to: '', reason: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function load() {
    setLoading(true)
    leaveApi.getMyLeaveRequests({ page_size: 100 })
      .then(res => setApplications(res.results))
      .catch(err => setError(errorMessage(err, 'Failed to load your leave applications.')))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function submit() {
    if (!form.from || !form.to || !form.reason.trim()) {
      setError('Please fill in From date, To date, and a reason before submitting.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await leaveApi.apply({ start_date: form.from, end_date: form.to, reason: form.reason.trim() })
      setForm({ from: '', to: '', reason: '' })
      setSuccess('Leave application submitted for review.')
      window.setTimeout(() => setSuccess(''), 5000)
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to submit leave application.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div><PageHeader title="Leave Application" /><SectionLoading label="Loading your leave applications…" /></div>

  return (
    <div>
      <PageHeader title="Leave Application" subtitle="Apply for leave and track approval status" />
      {success && <Alert type="success" className="mb-5"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}</Alert>}
      <Card className="mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 font-display">New Leave Application</h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Input label="From Date" type="date" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} />
          <Input label="To Date" type="date" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
        </div>
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Reason / Description</label>
          <textarea
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            rows={3}
            placeholder="Briefly describe the reason for your leave"
            value={form.reason}
            onChange={e => setForm({ ...form, reason: e.target.value })}
          />
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <Button onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Application'}</Button>
      </Card>

      <h3 className="font-semibold text-slate-900 mb-3 font-display">Submitted Applications</h3>
      {applications.length === 0 ? (
        <SectionEmpty icon={<FileCheck className="w-8 h-8 text-slate-300 mx-auto" />} label="No leave applications submitted yet." />
      ) : (
        <div className="space-y-3">
          {applications.map(a => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400">{a.start_date} → {a.end_date}</span>
                  </div>
                  <p className="text-sm text-slate-700">{a.reason}</p>
                </div>
                <Badge variant={a.status === 'approved' ? 'green' : a.status === 'rejected' ? 'red' : 'yellow'}>{a.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Examinations
// ---------------------------------------------------------------------------
function ExaminationsPage() {
  const [exams, setExams] = useState<ApiExamination[]>([])
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([examinationApi.getExaminations({ page_size: 200, ordering: 'exam_date' }), lookupApi.getSubjects()])
      .then(([res, subs]) => { if (!cancelled) { setExams(res.results); setSubjects(subs) } })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load examinations.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div><PageHeader title="Examinations" /><SectionLoading label="Loading examinations…" /></div>
  if (error) return <div><PageHeader title="Examinations" /><Alert type="error">{error}</Alert></div>
  if (exams.length === 0) return <div><PageHeader title="Examinations" /><SectionEmpty icon={<BookMarked className="w-8 h-8 text-slate-300 mx-auto" />} label="No examinations scheduled yet." /></div>

  const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]))
  const rows = exams.map(e => ({ id: e.id, subject: subjectById[e.subject]?.name ?? e.subject, title: e.title, exam_type: e.exam_type, exam_date: e.exam_date, maximum_marks: e.maximum_marks }))

  return (
    <div>
      <PageHeader title="Examinations" subtitle="Examinations for your course & semester" />
      <Card padding={false}>
        <Table
          columns={[
            { key: 'subject', header: 'Subject' },
            { key: 'title', header: 'Title' },
            { key: 'exam_type', header: 'Type' },
            { key: 'exam_date', header: 'Date' },
            { key: 'maximum_marks', header: 'Max Marks' },
          ]}
          data={rows as unknown as Record<string, unknown>[]}
        />
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
function ProfilePage() {
  const [me, setMe] = useState<ApiStudent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [docs, setDocs] = useState<ApiDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [docType, setDocType] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Priority 14 — the three mandatory documents, backend-verified status.
  const [required, setRequired] = useState<ApiRequiredDocumentStatus | null>(null)
  const [requiredLoading, setRequiredLoading] = useState(true)
  const [requiredFiles, setRequiredFiles] = useState<Record<string, File | null>>({})
  const [requiredUploadingType, setRequiredUploadingType] = useState<string | null>(null)
  const [requiredMsg, setRequiredMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function loadDocs() {
    setDocsLoading(true)
    try {
      const res = await documentsApi.getMyDocuments({ page_size: 100, ordering: '-requested_at' })
      setDocs(res.results)
    } catch {
      setDocs([])
    } finally {
      setDocsLoading(false)
    }
  }

  async function loadRequired(fresh = false) {
    setRequiredLoading(true)
    try {
      if (fresh) invalidateRequiredStatus()
      const res = await getRequiredStatus()
      setRequired(res)
    } catch {
      setRequired(null)
    } finally {
      setRequiredLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMe()
      .then(res => { if (!cancelled) setMe(res) })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load your profile.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    loadDocs()
    loadRequired()
    return () => { cancelled = true }
  }, [])

  async function handleUpload() {
    if (!docType.trim()) { setUploadMsg({ type: 'error', text: 'Please enter a document type.' }); return }
    if (!docFile) { setUploadMsg({ type: 'error', text: 'Please select a file.' }); return }
    setUploading(true)
    setUploadMsg(null)
    try {
      await documentsApi.uploadDocument(docType.trim(), docFile)
      setUploadMsg({ type: 'success', text: 'Document uploaded successfully.' })
      setDocType('')
      setDocFile(null)
      await loadDocs()
      // A free-text upload could coincidentally match one of the three
      // required names, so refresh the mandatory-status panel too.
      await loadRequired(true)
    } catch (err) {
      setUploadMsg({ type: 'error', text: errorMessage(err, 'Failed to upload document.') })
    } finally {
      setUploading(false)
    }
  }

  async function handleRequiredUpload(documentType: string) {
    const file = requiredFiles[documentType]
    if (!file) { setRequiredMsg({ type: 'error', text: `Please select a file for ${documentType}.` }); return }
    setRequiredUploadingType(documentType)
    setRequiredMsg(null)
    try {
      // Reuses the exact same upload endpoint/mechanism as the general
      // document upload above -- just with a fixed, required document_type
      // so it lines up exactly with the backend's REQUIRED_DOCUMENT_TYPES.
      await documentsApi.uploadDocument(documentType, file)
      setRequiredMsg({ type: 'success', text: `${documentType} uploaded — pending Staff verification.` })
      setRequiredFiles(prev => ({ ...prev, [documentType]: null }))
      await loadDocs()
      await loadRequired(true)
    } catch (err) {
      setRequiredMsg({ type: 'error', text: errorMessage(err, `Failed to upload ${documentType}.`) })
    } finally {
      setRequiredUploadingType(null)
    }
  }

  if (loading) return <div><PageHeader title="My Profile" /><SectionLoading label="Loading your profile…" /></div>
  if (error) return <div><PageHeader title="My Profile" /><Alert type="error">{error}</Alert></div>
  if (!me) return <div><PageHeader title="My Profile" /><Alert type="error">Could not load your profile.</Alert></div>

  const fullName = `${me.user.first_name} ${me.user.last_name}`.trim()
  const initials = (me.user.first_name?.[0] ?? '') + (me.user.last_name?.[0] ?? '')

  const infoRows: [string, string][] = [
    ['Full Name', fullName],
    ['Student ID', me.student_id ?? '—'],
    ['Roll Number', me.roll_number || '—'],
    ['Registration Number', me.registration_number || '—'],
    ['Date of Birth', me.date_of_birth || '—'],
    ['Gender', me.gender],
    ['Email', me.email || me.user.email || '—'],
    ['Phone', me.phone || '—'],
    ['Guardian Name', me.guardian_name || '—'],
    ['Guardian Phone', me.guardian_phone || '—'],
    ['Address', me.address || '—'],
    ['Department', me.department_detail?.name ?? '—'],
    ['Course', me.course_detail?.name ?? '—'],
    ['Current Semester', String(me.current_semester)],
  ]

  return (
    <div>
      <PageHeader title="My Profile" />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="text-center">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">{initials || 'S'}</div>
          <h3 className="font-bold text-slate-900 text-lg font-display">{fullName}</h3>
          <p className="text-sm text-blue-600 font-medium mb-1">{me.student_id ?? me.admission_number}</p>
          <Badge variant="blue">{me.department_detail?.name ?? '—'}</Badge>
          <p className="text-sm text-slate-500 mt-2">Semester {me.current_semester}</p>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Student Information</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {infoRows.map(([k, v]) => (
              <div key={k}>
                <div className="text-slate-500 text-xs mb-0.5">{k}</div>
                <div className="font-medium text-slate-900">{v}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">Profile fields are administrative and managed by Staff/Admin — contact your department office for corrections.</p>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-900 font-display">Mandatory Documents</h3>
          {!requiredLoading && required && (
            <span className="text-sm font-medium text-slate-500">{required.completed_count} / {required.total_required} complete</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4">These three documents are required for onboarding. Each must be uploaded AND verified by Staff.</p>
        {requiredMsg && <div className="mb-3"><Alert type={requiredMsg.type === 'success' ? 'success' : 'error'}>{requiredMsg.text}</Alert></div>}
        {requiredLoading ? (
          <p className="text-sm text-slate-500 py-4">Loading mandatory document status…</p>
        ) : !required ? (
          <p className="text-sm text-red-500 py-4">Could not load mandatory document status.</p>
        ) : (
          <div className="space-y-3">
            {required.documents.map(item => {
              const canUpload = item.status === 'missing' || item.status === 'rejected'
              return (
                <div key={item.document_type} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.document_type}</p>
                    <div className="mt-1">{requiredStatusBadge(item.status)}</div>
                    {item.file && (
                      <a href={item.file} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">View uploaded file</a>
                    )}
                  </div>
                  {canUpload && (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        onChange={e => setRequiredFiles(prev => ({ ...prev, [item.document_type]: e.target.files?.[0] ?? null }))}
                        className="text-xs w-40"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleRequiredUpload(item.document_type)}
                        disabled={requiredUploadingType === item.document_type}
                      >
                        {requiredUploadingType === item.document_type ? 'Uploading…' : item.status === 'rejected' ? 'Re-upload' : 'Upload'}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 font-display">Upload Document</h3>
          {uploadMsg && <div className="mb-3"><Alert type={uploadMsg.type === 'success' ? 'success' : 'error'}>{uploadMsg.text}</Alert></div>}
          <div className="space-y-3">
            <Input label="Document Type" placeholder="e.g. Aadhar Card, Transfer Certificate" value={docType} onChange={e => setDocType(e.target.value)} />
            <div>
              <label className="block text-xs text-slate-500 mb-1">File</label>
              <input type="file" onChange={e => setDocFile(e.target.files?.[0] ?? null)} className="text-sm w-full" />
            </div>
            <Button onClick={handleUpload} disabled={uploading} className="w-full">{uploading ? 'Uploading…' : 'Upload Document'}</Button>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4 font-display">My Documents</h3>
          {docsLoading ? (
            <p className="text-sm text-slate-500 py-4">Loading documents…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No documents uploaded yet.</p>
          ) : (
            <Table
              columns={[
                { key: 'document_type', header: 'Document' },
                { key: 'requested_at', header: 'Uploaded On', render: r => new Date((r as unknown as ApiDocument).requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                { key: 'status', header: 'Status', render: r => {
                  const s = (r as unknown as ApiDocument).status
                  return <Badge variant={s === 'verified' ? 'green' : s === 'rejected' ? 'red' : 'yellow'}>{s === 'verified' ? 'Verified' : s === 'rejected' ? 'Rejected' : 'Pending'}</Badge>
                } },
                { key: 'file', header: 'File', render: r => {
                  const url = (r as unknown as ApiDocument).file
                  return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">View</a> : <span className="text-slate-400 text-sm">—</span>
                } },
              ]}
              data={docs as unknown as Record<string, unknown>[]}
            />
          )}
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Priority 14: mandatory-document status shared helpers (Profile + Dashboard)
// ---------------------------------------------------------------------------
/**
 * Priority 14 — pinned, non-dismissible mandatory-document banner. Always
 * computed live from backend `is_complete` -- there is no "mark as read"
 * state, so it cannot be bypassed by dismissing a notification. Renders
 * nothing once `required.is_complete` is true.
 */
function RequiredDocumentsBanner({ required }: { required: ApiRequiredDocumentStatus | null }) {
  if (!required) return null
  if (required.is_complete) {
    return (
      <Alert type="success" className="mb-6">
        ✅ All mandatory documents verified — onboarding document requirements complete.
      </Alert>
    )
  }
  const incomplete = required.documents.filter(d => d.status !== 'verified')
  return (
    <div className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="font-semibold text-amber-900">📌 Mandatory Documents Required</p>
        <span className="text-sm font-medium text-amber-800">{required.completed_count} / {required.total_required} complete</span>
      </div>
      <p className="text-sm text-amber-800 mt-1">You must upload and get Staff verification for all required documents.</p>
      <ul className="mt-3 space-y-1.5">
        {incomplete.map(d => (
          <li key={d.document_type} className="flex items-center justify-between text-sm bg-white/70 rounded-lg px-3 py-1.5 border border-amber-100">
            <span className="text-slate-800">{d.document_type}</span>
            {requiredStatusBadge(d.status)}
          </li>
        ))}
      </ul>
      <p className="text-xs text-amber-700 mt-3">Go to <span className="font-medium">Profile</span> to upload or re-upload documents.</p>
    </div>
  )
}

function requiredStatusBadge(status: RequiredDocumentStatusValue) {
  switch (status) {
    case 'verified': return <Badge variant="green">Verified</Badge>
    case 'pending': return <Badge variant="yellow">Pending Verification</Badge>
    case 'rejected': return <Badge variant="red">Rejected — Re-upload Required</Badge>
    default: return <Badge variant="slate">Required — Not Uploaded</Badge>
  }
}

function notificationTime(n: ApiNotification): string {
  const raw = n.published_at || n.created_at
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    setError('')
    notificationApi.getNotifications({ page_size: 50, ordering: '-published_at' })
      .then(res => setNotifications(res.results))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load notifications.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div>
      <PageHeader title="Notifications" />
      {error && <div className="mb-4"><Alert type="error">{error} <button className="underline font-semibold ml-1" onClick={load}>Retry</button></Alert></div>}
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

function CourseRegistrationPage() {
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [me, setMe] = useState<ApiStudent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([lookupApi.getSubjects(), getMe()])
      .then(([subs, meRes]) => {
        if (cancelled) return
        setSubjects(subs.filter(s => s.course === meRes.course))
        setMe(meRes)
      })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load your subjects.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div><PageHeader title="Course Registration" /><SectionLoading label="Loading your subjects…" /></div>
  if (error) return <div><PageHeader title="Course Registration" /><Alert type="error">{error}</Alert></div>

  return (
    <div>
      <PageHeader title="Course Registration" subtitle={me ? `Semester ${me.current_semester}` : undefined} />
      <Alert type="info" className="mb-5">
        <Info className="w-4 h-4 flex-shrink-0" /> There is no separate course-registration workflow in the backend yet — this lists the subjects already defined for your course.
      </Alert>
      {subjects.length === 0 ? (
        <SectionEmpty icon={<BookOpen className="w-8 h-8 text-slate-300 mx-auto" />} label="No subjects found for your course." />
      ) : (
        <Card padding={false}>
          <Table
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Subject' },
              { key: 'credits', header: 'Credits' },
            ]}
            data={subjects as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}
    </div>
  )
}

const PLACEMENT_STATUS_BADGE: Record<string, 'green' | 'red' | 'yellow'> = {
  selected: 'green',
  shortlisted: 'yellow',
  interview: 'yellow',
  applied: 'yellow',
  rejected: 'red',
}

function PlacementPage() {
  const [drives, setDrives] = useState<ApiPlacementDrive[]>([])
  const [applications, setApplications] = useState<ApiPlacementApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function load() {
    setLoading(true)
    setError('')
    Promise.all([
      placementApi.getDrives({ is_active: true, page_size: 100 }),
      placementApi.getMyApplications({ page_size: 100 }),
    ])
      .then(([d, apps]) => { setDrives(d.results); setApplications(apps.results) })
      .catch(err => setError(errorMessage(err, 'Failed to load placement drives.')))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function apply(driveId: string) {
    setApplying(driveId)
    try {
      await placementApi.apply({ placement_drive: driveId })
      setToast('Application submitted.')
      load()
    } catch (err) {
      setToast(err instanceof ApiError && err.status === 400 ? 'You have already applied to this drive.' : errorMessage(err, 'Failed to submit application.'))
    } finally {
      setApplying(null)
      window.setTimeout(() => setToast(''), 4000)
    }
  }

  if (loading) return <div><PageHeader title="Placement" /><SectionLoading label="Loading placement drives…" /></div>
  if (error) return <div><PageHeader title="Placement" /><Alert type="error">{error}</Alert></div>

  const applicationByDrive = new Map(applications.map(a => [a.placement_drive, a]))

  return (
    <div>
      <PageHeader title="Placement" />
      {toast && <Alert type="success" className="mb-4"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {toast}</Alert>}
      {drives.length === 0 ? (
        <SectionEmpty icon={<Briefcase className="w-8 h-8 text-slate-300 mx-auto" />} label="No placement drives are currently open." />
      ) : (
        <div className="space-y-3">
          {drives.map(d => {
            const application = applicationByDrive.get(d.id)
            return (
              <Card key={d.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">{d.company_name} — {d.job_title}</h3>
                    <p className="text-sm text-slate-500">
                      {d.employment_type.replace('_', ' ')} · ₹{Number(d.package_lpa).toLocaleString()} LPA · {d.location}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Apply by {new Date(d.application_deadline).toLocaleDateString()} · Drive on {new Date(d.drive_date).toLocaleDateString()}</p>
                    {d.description && <p className="text-xs text-slate-400 mt-1">{d.description}</p>}
                    <p className="text-xs text-slate-500 mt-2"><span className="font-medium">Eligibility:</span> {d.eligibility_criteria}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {application ? (
                      <Badge variant={PLACEMENT_STATUS_BADGE[application.status] ?? 'yellow'}>{application.status}</Badge>
                    ) : (
                      <Button size="sm" onClick={() => apply(d.id)} disabled={applying === d.id}>
                        {applying === d.id ? 'Applying…' : 'Apply'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Academic Calendar — combines the two existing real sources the current UI
// implies: institution-wide Events (real event_date/time from the DB) and
// the student's own weekly Timetable (recurring class slots, projected onto
// their real calendar dates for the current week). No new model — both
// already exist and are student-readable.
// ---------------------------------------------------------------------------

interface CalendarEntry {
  id: string
  date: string // ISO yyyy-mm-dd
  time: string
  title: string
  subtitle: string
  kind: 'event' | 'class'
}

const DAY_INDEX: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }

function currentWeekDateFor(dayOfWeek: string): string {
  const now = new Date()
  const targetIdx = DAY_INDEX[dayOfWeek.toLowerCase()] ?? 0
  const diff = targetIdx - now.getDay()
  const d = new Date(now)
  d.setDate(now.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function AcademicCalendarPage() {
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      eventApi.getEvents({ is_active: true, page_size: 100, ordering: 'event_date' }),
      timetableApi.getTimetables({ page_size: 200 }),
      lookupApi.getSubjects(),
    ])
      .then(([eventsRes, timetableRes, subjects]) => {
        if (cancelled) return
        const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]))
        const eventEntries: CalendarEntry[] = eventsRes.results.map(e => ({
          id: `event-${e.id}`, date: e.event_date, time: e.start_time,
          title: e.title, subtitle: `${e.venue} · ${e.organizer}`, kind: 'event',
        }))
        const classEntries: CalendarEntry[] = timetableRes.results.map(s => ({
          id: `class-${s.id}`, date: currentWeekDateFor(s.day_of_week), time: s.start_time,
          title: subjectById[s.subject]?.name ?? s.subject, subtitle: s.room_number ? `Room ${s.room_number}` : 'This week', kind: 'class',
        }))
        setEntries([...eventEntries, ...classEntries].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)))
      })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to load your academic calendar.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div><PageHeader title="Academic Calendar" /><SectionLoading label="Loading your academic calendar…" /></div>
  if (error) return <div><PageHeader title="Academic Calendar" /><Alert type="error">{error}</Alert></div>
  if (entries.length === 0) return <div><PageHeader title="Academic Calendar" /><SectionEmpty icon={<CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />} label="No upcoming events or classes on your calendar yet." /></div>

  return (
    <div>
      <PageHeader title="Academic Calendar" subtitle="Institution events and your class schedule for the week" />
      <div className="space-y-3">
        {entries.map(entry => (
          <Card key={entry.id}>
            <div className="flex items-center gap-4">
              <div className="w-20 flex-shrink-0 text-center">
                <p className="text-xs text-slate-400">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                <p className="text-xs font-mono text-slate-500">{entry.time}</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant={entry.kind === 'event' ? 'blue' : 'slate'}>{entry.kind === 'event' ? 'Event' : 'Class'}</Badge>
                </div>
                <p className="text-sm font-medium text-slate-900 truncate">{entry.title}</p>
                <p className="text-xs text-slate-500 truncate">{entry.subtitle}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

const pageMap: Record<string, { title: string; component: React.ReactNode }> = {
  "": { title: "Dashboard", component: <Dashboard /> },
  "attendance": { title: "Attendance", component: <AttendancePage /> },
  "marks": { title: "Internal Marks", component: <InternalMarksPage /> },
  "results": { title: "Semester Results", component: <SemesterResultsPage /> },
  "assignments": { title: "Assignments", component: <AssignmentsPage /> },
  "examinations": { title: "Examinations", component: <ExaminationsPage /> },
  "materials": { title: "Study Materials", component: <StudyMaterialsPage /> },
  "questions": { title: "Question Bank", component: <QuestionBankPage /> },
  "timetable": { title: "Timetable", component: <TimetablePage /> },
  "fees": { title: "Fee Details", component: <FeeDetailsPage /> },
  "scholarships": { title: "Scholarships", component: <ScholarshipsPage /> },
  "leave": { title: "Leave Application", component: <LeaveApplicationPage /> },
  "notifications": { title: "Notifications", component: <NotificationsPage /> },
  "courses": { title: "Course Registration", component: <CourseRegistrationPage /> },
  "placement": { title: "Placement", component: <PlacementPage /> },
  "calendar": { title: "Academic Calendar", component: <AcademicCalendarPage /> },
  "profile": { title: "My Profile", component: <ProfilePage /> },
  "ai": {
    title: "AI Student Assistant",
    component: (
      <div className="p-6 text-center text-slate-500">
        <PartyPopper className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        AI Student Assistant Page - Coming Soon
      </div>
    ),
  },
}

function useStudentIdentity() {
  const [name, setName] = useState('')
  const [sub, setSub] = useState('')
  useEffect(() => {
    let cancelled = false
    getMe()
      .then(me => {
        if (cancelled) return
        setName(`${me.user.first_name} ${me.user.last_name}`.trim())
        setSub(`${me.student_id ?? me.admission_number} · ${me.department_detail?.code ?? ''} Sem ${me.current_semester}`)
      })
      .catch(() => { if (!cancelled) { setName('Student'); setSub('') } })
    return () => { cancelled = true }
  }, [])
  return { name, sub }
}

export default function StudentDashboard({ page = "" }: { page?: string }) {
  const pageData = pageMap[page] ?? pageMap[""]
  const identity = useStudentIdentity()

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      role="Student"
      userName={identity.name || 'Student'}
      userSub={identity.sub}
      pageTitle={pageData.title}
    >
      {pageData.component}
    </DashboardLayout>
  )
}
