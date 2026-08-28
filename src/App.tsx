import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/public/HomePage'
import {
  AboutPage, DepartmentsPage, CoursesPage, FacultyPage, InfrastructurePage,
  PlacementsPage, ResearchPage, EventsPage, GalleryPage, NewsPage,
  ScholarshipsPage, ContactPage, FAQPage, AdmissionsPage
} from './pages/public/PublicPages'
import LoginPage from './pages/LoginPage'
import StudentDashboard from './pages/student/StudentDashboard'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import StaffDashboard from './pages/staff/StaffDashboard'
import HODDashboard from './pages/hod/HODDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'

function PublicPage({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicPage><HomePage /></PublicPage>} />
        <Route path="/about" element={<PublicPage><AboutPage /></PublicPage>} />
        <Route path="/departments" element={<PublicPage><DepartmentsPage /></PublicPage>} />
        <Route path="/courses" element={<PublicPage><CoursesPage /></PublicPage>} />
        <Route path="/faculty" element={<PublicPage><FacultyPage /></PublicPage>} />
        <Route path="/infrastructure" element={<PublicPage><InfrastructurePage /></PublicPage>} />
        <Route path="/placements" element={<PublicPage><PlacementsPage /></PublicPage>} />
        <Route path="/research" element={<PublicPage><ResearchPage /></PublicPage>} />
        <Route path="/events" element={<PublicPage><EventsPage /></PublicPage>} />
        <Route path="/gallery" element={<PublicPage><GalleryPage /></PublicPage>} />
        <Route path="/news" element={<PublicPage><NewsPage /></PublicPage>} />
        <Route path="/scholarships" element={<PublicPage><ScholarshipsPage /></PublicPage>} />
        <Route path="/contact" element={<PublicPage><ContactPage /></PublicPage>} />
        <Route path="/faq" element={<PublicPage><FAQPage /></PublicPage>} />
        <Route path="/admissions" element={<PublicPage><AdmissionsPage /></PublicPage>} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Student Dashboard */}
<Route path="/student" element={<StudentDashboard page="" />} />

<Route
  path="/student/attendance"
  element={<StudentDashboard page="attendance" />}
/>

<Route
  path="/student/marks"
  element={<StudentDashboard page="marks" />}
/>

<Route
  path="/student/results"
  element={<StudentDashboard page="results" />}
/>

<Route
  path="/student/assignments"
  element={<StudentDashboard page="assignments" />}
/>

<Route
  path="/student/materials"
  element={<StudentDashboard page="materials" />}
/>

<Route
  path="/student/questions"
  element={<StudentDashboard page="questions" />}
/>

<Route
  path="/student/examinations"
  element={<StudentDashboard page="examinations" />}
/>

<Route
  path="/student/scholarships"
  element={<StudentDashboard page="scholarships" />}
/>

<Route
  path="/student/timetable"
  element={<StudentDashboard page="timetable" />}
/>

<Route
  path="/student/fees"
  element={<StudentDashboard page="fees" />}
/>

<Route
  path="/student/leave"
  element={<StudentDashboard page="leave" />}
/>

<Route
  path="/student/notifications"
  element={<StudentDashboard page="notifications" />}
/>

<Route
  path="/student/courses"
  element={<StudentDashboard page="courses" />}
/>

<Route
  path="/student/placement"
  element={<StudentDashboard page="placement" />}
/>

<Route
  path="/student/calendar"
  element={<StudentDashboard page="calendar" />}
/>

<Route
  path="/student/profile"
  element={<StudentDashboard page="profile" />}
/>

<Route
  path="/student/ai"
  element={<StudentDashboard page="ai" />}
/>

<Route
  path="/student/*"
  element={<StudentDashboard page="" />}
/>

        {/* Teacher Dashboard */}
        <Route path="/teacher" element={<TeacherDashboard page="" />} />
        <Route path="/teacher/attendance" element={<TeacherDashboard page="attendance" />} />
        <Route path="/teacher/students" element={<TeacherDashboard page="students" />} />
        <Route path="/teacher/assignments" element={<TeacherDashboard page="assignments" />} />
        <Route path="/teacher/marks" element={<TeacherDashboard page="marks" />} />
        <Route path="/teacher/feedback" element={<TeacherDashboard page="feedback" />} />
        <Route path="/teacher/leaves" element={<TeacherDashboard page="leaves" />} />
        <Route path="/teacher/timetable" element={<TeacherDashboard page="timetable" />} />
        <Route path="/teacher/notifications" element={<TeacherDashboard page="notifications" />} />
        <Route path="/teacher/notes" element={<TeacherDashboard page="notes" />} />
        <Route path="/teacher/questions" element={<TeacherDashboard page="questions" />} />
        <Route path="/teacher/*" element={<TeacherDashboard page="" />} />

        {/* Staff Dashboard */}
        <Route path="/staff" element={<StaffDashboard page="" />} />
        <Route path="/staff/students" element={<StaffDashboard page="students" />} />
        <Route path="/staff/teachers" element={<StaffDashboard page="teachers" />} />
        <Route path="/staff/hods" element={<StaffDashboard page="hods" />} />
        <Route path="/staff/admissions" element={<StaffDashboard page="admissions" />} />
        <Route path="/staff/fees" element={<StaffDashboard page="fees" />} />
        <Route path="/staff/certificates" element={<StaffDashboard page="certificates" />} />
        <Route path="/staff/scholarships" element={<StaffDashboard page="scholarships" />} />
        <Route path="/staff/documents" element={<StaffDashboard page="documents" />} />
        <Route path="/staff/contact" element={<StaffDashboard page="contact" />} />
        <Route path="/staff/notifications" element={<StaffDashboard page="notifications" />} />
        <Route path="/staff/events" element={<StaffDashboard page="events" />} />
        <Route path="/staff/reports" element={<StaffDashboard page="reports" />} />
        <Route path="/staff/*" element={<StaffDashboard page="" />} />

        {/* HOD Dashboard */}
        <Route path="/hod" element={<HODDashboard page="" />} />
        <Route path="/hod/faculty" element={<HODDashboard page="faculty" />} />
        <Route path="/hod/students" element={<HODDashboard page="students" />} />
        <Route path="/hod/courses" element={<HODDashboard page="courses" />} />
        <Route path="/hod/subjects" element={<HODDashboard page="subjects" />} />
        <Route path="/hod/timetable" element={<HODDashboard page="timetable" />} />
        <Route path="/hod/attendance" element={<HODDashboard page="attendance" />} />
        <Route path="/hod/results" element={<HODDashboard page="results" />} />
        <Route path="/hod/research" element={<HODDashboard page="research" />} />
        <Route path="/hod/placements" element={<HODDashboard page="placements" />} />
        <Route path="/hod/analytics" element={<HODDashboard page="analytics" />} />
        <Route path="/hod/reports" element={<HODDashboard page="reports" />} />
        <Route path="/hod/ai" element={<HODDashboard page="ai" />} />
        <Route path="/hod/*" element={<HODDashboard page="" />} />

        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminDashboard page="" />} />
        <Route path="/admin/students" element={<AdminDashboard page="students" />} />
        <Route path="/admin/teachers" element={<AdminDashboard page="teachers" />} />
        <Route path="/admin/staff" element={<AdminDashboard page="staff" />} />
        <Route path="/admin/departments" element={<AdminDashboard page="departments" />} />
        <Route path="/admin/courses" element={<AdminDashboard page="courses" />} />
        <Route path="/admin/academic-years" element={<AdminDashboard page="academic-years" />} />
        <Route path="/admin/semesters" element={<AdminDashboard page="semesters" />} />
        <Route path="/admin/admissions" element={<AdminDashboard page="admissions" />} />
        <Route path="/admin/fees" element={<AdminDashboard page="fees" />} />
        <Route path="/admin/certificates" element={<AdminDashboard page="certificates" />} />
        <Route path="/admin/placements" element={<AdminDashboard page="placements" />} />
        <Route path="/admin/results" element={<AdminDashboard page="results" />} />
        <Route path="/admin/research" element={<AdminDashboard page="research" />} />
        <Route path="/admin/infrastructure" element={<AdminDashboard page="infrastructure" />} />
        <Route path="/admin/cms" element={<AdminDashboard page="cms" />} />
        <Route path="/admin/users" element={<AdminDashboard page="users" />} />
        <Route path="/admin/logs" element={<AdminDashboard page="logs" />} />
        <Route path="/admin/roles" element={<AdminDashboard page="roles" />} />
        <Route path="/admin/analytics" element={<AdminDashboard page="analytics" />} />
        <Route path="/admin/*" element={<AdminDashboard page="" />} />
      </Routes>
    </BrowserRouter>
  )
}
