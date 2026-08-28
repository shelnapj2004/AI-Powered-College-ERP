import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Phone, Mail, Clock, ChevronDown, ChevronUp, BookOpen, Microscope, Building, Wifi, Bus, Home, Dumbbell, Coffee } from 'lucide-react'
import { Badge, Button, Input, Select, Card } from '../../components/ui'
import { cmsApi, researchApi, contactApi, admissionApi, lookupApi, ApiError, type ApiContentPage, type ApiPublicResearchProject, type ApiDepartment, type ApiCourse } from '../../services/api'

// Static fallback copy -- used until the CMS-backed fetch resolves, and
// permanently for any of the three page_types below with no published
// ContentPage row yet (Priority 7 Phase B: connect Admin CMS -> Public
// Website without forcing every section into the CMS).
const ABOUT_FALLBACK = [
  "EduVerse College was founded in 1985 by Dr. K. V. Rao with a vision to bridge the gap between academic learning and industry requirements. From a small campus of 200 students, we have grown into a premier institution with 12,000+ students across 12 departments.",
  'Accredited with NAAC A++ grade, ranked #5 in India by NIRF 2025, and a recipient of the National Excellence in Education Award, our institution stands as a beacon of quality education.',
  'Our alumni network spans 60,000+ professionals in 45 countries, holding leadership positions in Fortune 500 companies, government bodies, and academic institutions worldwide.',
]
const VISION_FALLBACK = 'To be a globally recognized institution of excellence that nurtures innovative leaders, contributes to knowledge creation, and drives societal transformation through education, research, and industry engagement.'
const MISSION_FALLBACK = 'To provide high-quality, affordable education that develops technical expertise, critical thinking, ethical values, and entrepreneurial spirit in students, empowering them to excel in a dynamic global environment.'

/** Fetches the single published ContentPage for a page_type, or null if
 * none exists/is published. Used by public pages that have a matching
 * CMS page_type (about/vision/mission/...) -- never invents a mapping
 * for page_types the CMS model doesn't define. */
function useCmsPage(pageType: string): { page: ApiContentPage | null; loading: boolean } {
  const [page, setPage] = useState<ApiContentPage | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    cmsApi.getPages({ page_type: pageType, page_size: 1 })
      .then(res => { if (!cancelled) setPage(res.results[0] ?? null) })
      .catch(() => { if (!cancelled) setPage(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pageType])
  return { page, loading }
}

// =================== ABOUT PAGE ===================
export function AboutPage() {
  const { page: aboutPage } = useCmsPage('about')
  const { page: visionPage } = useCmsPage('vision')
  const { page: missionPage } = useCmsPage('mission')

  const aboutParagraphs = aboutPage?.content
    ? aboutPage.content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    : ABOUT_FALLBACK
  const visionText = visionPage?.content || VISION_FALLBACK
  const missionText = missionPage?.content || MISSION_FALLBACK

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-blue-600 text-white border-blue-500">About Us</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Our Story of Excellence</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">Established in 1985 with a mission to empower India's youth through quality education</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-14 items-center mb-16">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 font-display mb-5">Four Decades of Academic Excellence</h2>
            {aboutParagraphs.map((p, i) => (
              <p key={i} className={`text-slate-600 leading-relaxed ${i < aboutParagraphs.length - 1 ? 'mb-4' : ''}`}>{p}</p>
            ))}
          </div>
          <div>
            <img src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&h=450&fit=crop&auto=format" alt="Campus" className="rounded-2xl shadow-xl w-full object-cover h-80 bg-blue-100" />
          </div>
        </div>

        {/* Vision Mission — CMS-backed (page_type='vision'/'mission') with static fallback */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {[
            { title: '🎯 Our Vision', text: visionText },
            { title: '🚀 Our Mission', text: missionText },
          ].map(item => (
            <Card key={item.title}>
              <h3 className="text-xl font-bold text-slate-900 font-display mb-3">{item.title}</h3>
              <p className="text-slate-600 leading-relaxed">{item.text}</p>
            </Card>
          ))}
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-16">
          {[['1985', 'Year Founded'], ['12,000+', 'Students'], ['850+', 'Faculty'], ['60,000+', 'Alumni']].map(([v, l]) => (
            <Card key={l} className="text-center">
              <div className="text-3xl font-bold text-blue-600 font-display mb-1">{v}</div>
              <div className="text-sm text-slate-500">{l}</div>
            </Card>
          ))}
        </div>

        {/* Accreditations */}
        <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100">
          <h2 className="text-2xl font-bold text-slate-900 font-display mb-6 text-center">Accreditations & Rankings</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[['NAAC A++', 'Grade Accreditation'], ['NIRF #5', 'Engineering Rank India'], ['NBA Accredited', '8 Programs'], ['QS Ranked', 'Top 500 Asia']].map(([v, l]) => (
              <div key={v} className="bg-white rounded-xl p-4 text-center border border-blue-100 shadow-sm">
                <div className="text-blue-600 font-bold text-lg font-display">{v}</div>
                <div className="text-xs text-slate-500 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// =================== DEPARTMENTS PAGE ===================
const depts = [
  { name: 'Computer Science & Engineering', icon: '💻', hod: 'Dr. Priya Sharma', students: 2400, faculty: 65, labs: 12, established: 1985, desc: 'Cutting-edge programs in software engineering, AI/ML, cloud computing, and cybersecurity.' },
  { name: 'Electronics & Communication', icon: '📡', hod: 'Prof. Rajesh Kumar', students: 1800, faculty: 52, labs: 10, established: 1985, desc: 'VLSI design, embedded systems, signal processing, and IoT research.' },
  { name: 'Mechanical Engineering', icon: '⚙️', hod: 'Prof. Vikram Singh', students: 1600, faculty: 48, labs: 14, established: 1985, desc: 'Manufacturing, thermal engineering, robotics, and CAD/CAM training.' },
  { name: 'Civil Engineering', icon: '🏗️', hod: 'Dr. Deepa Nair', students: 1200, faculty: 38, labs: 8, established: 1990, desc: 'Structural engineering, environmental engineering, and smart infrastructure.' },
  { name: 'Chemical Engineering', icon: '🧪', hod: 'Dr. Ravi Teja', students: 800, faculty: 28, labs: 9, established: 1992, desc: 'Process engineering, polymer science, and pharmaceutical technology.' },
  { name: 'Business Administration', icon: '📊', hod: 'Dr. Ananya Patel', students: 1100, faculty: 35, labs: 5, established: 1995, desc: 'Marketing, finance, HR, business analytics, and entrepreneurship.' },
  { name: 'Data Science & AI', icon: '🤖', hod: 'Dr. Suresh Babu', students: 900, faculty: 30, labs: 8, established: 2018, desc: 'Machine learning, deep learning, NLP, computer vision, and big data.' },
  { name: 'Information Technology', icon: '🌐', hod: 'Prof. Kavitha R', students: 1400, faculty: 42, labs: 10, established: 2000, desc: 'Web technologies, database management, cybersecurity, and cloud computing.' },
  { name: 'Electrical Engineering', icon: '⚡', hod: 'Dr. Mohan Rao', students: 1000, faculty: 34, labs: 11, established: 1985, desc: 'Power systems, control systems, renewable energy, and smart grids.' },
  { name: 'Physics', icon: '🔭', hod: 'Dr. Lakshmi S', students: 400, faculty: 18, labs: 6, established: 1985, desc: 'Quantum mechanics, condensed matter, astrophysics, and optics research.' },
  { name: 'Mathematics', icon: '📐', hod: 'Prof. Ganesh K', students: 300, faculty: 15, labs: 2, established: 1985, desc: 'Pure and applied mathematics, statistics, and computational mathematics.' },
  { name: 'Humanities & Social Sciences', icon: '📖', hod: 'Dr. Meena Iyer', students: 600, faculty: 25, labs: 3, established: 1995, desc: 'English, economics, sociology, psychology, and communication skills.' },
]

export function DepartmentsPage() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Our 12 Departments</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">Each department is equipped with cutting-edge labs, experienced faculty, and strong industry connections</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {depts.map(d => (
            <Card key={d.name} className="hover:shadow-md transition-all group">
              <div className="text-4xl mb-3">{d.icon}</div>
              <h3 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{d.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{d.desc}</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[['Students', d.students], ['Faculty', d.faculty], ['Labs', d.labs]].map(([k, v]) => (
                  <div key={String(k)} className="bg-slate-50 rounded-xl p-2">
                    <div className="font-bold text-slate-900 text-sm">{v}</div>
                    <div className="text-xs text-slate-500">{k}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>HOD: <span className="font-medium text-slate-700">{d.hod}</span></span>
                <span>Est. {d.established}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// =================== COURSES PAGE ===================
const allCourses = [
  { name: 'B.Tech Computer Science', dept: 'CSE', level: 'UG', duration: '4 Years', seats: 240, fee: '₹1,20,000/yr', eligibility: '10+2 with PCM, 60%+', badge: 'Popular' },
  { name: 'B.Tech Electronics & Comm', dept: 'ECE', level: 'UG', duration: '4 Years', seats: 180, fee: '₹1,10,000/yr', eligibility: '10+2 with PCM, 60%+', badge: '' },
  { name: 'B.Tech Mechanical', dept: 'Mech', level: 'UG', duration: '4 Years', seats: 160, fee: '₹1,00,000/yr', eligibility: '10+2 with PCM, 60%+', badge: '' },
  { name: 'B.Tech Civil', dept: 'Civil', level: 'UG', duration: '4 Years', seats: 120, fee: '₹95,000/yr', eligibility: '10+2 with PCM, 60%+', badge: '' },
  { name: 'B.Sc Data Science', dept: 'DS & AI', level: 'UG', duration: '3 Years', seats: 90, fee: '₹80,000/yr', eligibility: '10+2 with Maths, 55%+', badge: 'Trending' },
  { name: 'BCA', dept: 'IT', level: 'UG', duration: '3 Years', seats: 120, fee: '₹75,000/yr', eligibility: '10+2, 50%+', badge: '' },
  { name: 'MBA Business Analytics', dept: 'MBA', level: 'PG', duration: '2 Years', seats: 120, fee: '₹1,50,000/yr', eligibility: 'Any UG, CAT/MAT score', badge: 'New' },
  { name: 'M.Tech AI & ML', dept: 'CSE', level: 'PG', duration: '2 Years', seats: 60, fee: '₹1,30,000/yr', eligibility: 'B.Tech/BE, 60%+', badge: '' },
  { name: 'M.Tech VLSI Design', dept: 'ECE', level: 'PG', duration: '2 Years', seats: 30, fee: '₹1,20,000/yr', eligibility: 'B.Tech ECE/EE, 60%+', badge: '' },
  { name: 'MCA', dept: 'IT', level: 'PG', duration: '2 Years', seats: 60, fee: '₹1,10,000/yr', eligibility: 'BCA/B.Sc Maths, 55%+', badge: '' },
  { name: 'M.Sc Data Science', dept: 'DS & AI', level: 'PG', duration: '2 Years', seats: 45, fee: '₹1,00,000/yr', eligibility: 'B.Sc/B.Tech, 55%+', badge: 'Trending' },
  { name: 'Ph.D (All Departments)', dept: 'Research', level: 'PhD', duration: '3-5 Years', seats: 80, fee: '₹50,000/yr', eligibility: 'PG with 55%+, NET/GATE', badge: '' },
]

export function CoursesPage() {
  const [filter, setFilter] = useState('All')
  const filtered = filter === 'All' ? allCourses : allCourses.filter(c => c.level === filter)
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Programs & Courses</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">Industry-aligned programs at undergraduate, postgraduate, and doctoral levels</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex gap-2 mb-8 flex-wrap">
          {['All', 'UG', 'PG', 'PhD'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c => (
            <Card key={c.name} className="hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <Badge variant={c.level === 'UG' ? 'blue' : c.level === 'PG' ? 'purple' : 'green'}>{c.level}</Badge>
                {c.badge && <Badge variant={c.badge === 'Popular' ? 'blue' : c.badge === 'New' ? 'green' : 'yellow'}>{c.badge}</Badge>}
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{c.name}</h3>
              <p className="text-xs text-blue-600 font-medium mb-3">{c.dept}</p>
              <div className="space-y-2 text-sm">
                {[['Duration', c.duration], ['Seats', c.seats], ['Fee', c.fee], ['Eligibility', c.eligibility]].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between gap-2">
                    <span className="text-slate-500 flex-shrink-0">{k}</span>
                    <span className="font-medium text-slate-800 text-right">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <Link to="/admissions" className="text-sm text-blue-600 font-semibold hover:underline flex items-center gap-1">
                  Apply Now <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// =================== FACULTY PAGE ===================
const facultyList = [
  { name: 'Dr. Priya Sharma', dept: 'CSE', designation: 'Professor & HOD', exp: '18 yrs', pub: 42, qual: 'PhD IIT Delhi', img: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&h=300&fit=crop' },
  { name: 'Prof. Rajesh Kumar', dept: 'ECE', designation: 'Professor & HOD', exp: '22 yrs', pub: 67, qual: 'PhD IIT Bombay', img: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&h=300&fit=crop' },
  { name: 'Dr. Ananya Patel', dept: 'MBA', designation: 'Associate Professor', exp: '15 yrs', pub: 31, qual: 'PhD IIM Ahmedabad', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop' },
  { name: 'Prof. Vikram Singh', dept: 'Mech', designation: 'Professor & HOD', exp: '25 yrs', pub: 89, qual: 'PhD IIT Madras', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop' },
  { name: 'Dr. Deepa Nair', dept: 'Civil', designation: 'Professor & HOD', exp: '20 yrs', pub: 54, qual: 'PhD NIT Trichy', img: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=300&h=300&fit=crop' },
  { name: 'Dr. Suresh Babu', dept: 'DS & AI', designation: 'Associate Professor', exp: '12 yrs', pub: 38, qual: 'PhD IISc Bangalore', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop' },
  { name: 'Prof. Kavitha R', dept: 'IT', designation: 'Professor & HOD', exp: '19 yrs', pub: 45, qual: 'PhD Anna University', img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=300&fit=crop' },
  { name: 'Dr. Ravi Teja', dept: 'Chemical', designation: 'Associate Professor', exp: '14 yrs', pub: 29, qual: 'PhD IIT Kharagpur', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop' },
]

export function FacultyPage() {
  const [search, setSearch] = useState('')
  const filtered = facultyList.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.dept.toLowerCase().includes(search.toLowerCase()))
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Our Distinguished Faculty</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">850+ faculty members with expertise from IITs, IIMs, and world-renowned universities</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto mb-8">
          <input type="search" placeholder="Search faculty by name or department..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map(f => (
            <Card key={f.name} className="text-center hover:shadow-md transition-all">
              <img src={f.img} alt={f.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4 bg-slate-100" />
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">{f.name}</h3>
              <p className="text-xs text-blue-600 font-medium mb-0.5">{f.designation}</p>
              <Badge variant="slate" className="mb-3">{f.dept}</Badge>
              <div className="space-y-1.5 text-xs text-slate-500">
                <div>{f.qual}</div>
                <div className="flex justify-center gap-4">
                  <span>{f.exp} exp</span>
                  <span>{f.pub} papers</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// =================== INFRASTRUCTURE PAGE ===================
export function InfrastructurePage() {
  const facilities = [
    { icon: BookOpen, title: 'Central Library', desc: '1 lakh+ books, 500+ e-journals, digital catalogs, study halls, and 24/7 reading room.', stat: '1L+ Books', img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500&h=300&fit=crop' },
    { icon: Microscope, title: 'Research Labs', desc: '120+ specialized labs including AI/ML lab, IoT lab, VLSI design center, and nanotechnology lab.', stat: '120+ Labs', img: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&h=300&fit=crop' },
    { icon: Dumbbell, title: 'Sports Complex', desc: 'Olympic swimming pool, cricket ground, football field, tennis courts, badminton courts, and fully equipped gym.', stat: '15 Courts', img: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=500&h=300&fit=crop' },
    { icon: Home, title: 'Student Hostels', desc: '5 separate hostels for boys and girls with 2000+ capacity. Wi-Fi, mess, laundry, and 24/7 security.', stat: '2000+ Rooms', img: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=500&h=300&fit=crop' },
    { icon: Wifi, title: 'Smart Campus', desc: 'High-speed 1 Gbps Wi-Fi across campus, smart classrooms, CCTV surveillance, and solar power.', stat: '1 Gbps Wi-Fi', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&h=300&fit=crop' },
    { icon: Bus, title: 'Transport', desc: '80+ college buses covering 40+ routes across the city with GPS tracking and safety features.', stat: '80+ Buses', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&h=300&fit=crop' },
    { icon: Coffee, title: 'Food Court', desc: '3 canteens, 1 food court with 15+ stalls serving diverse cuisines at subsidized rates.', stat: '3 Canteens', img: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=500&h=300&fit=crop' },
    { icon: Building, title: 'Auditorium', desc: '3000-seat air-conditioned auditorium with advanced audio-visual systems for events and convocations.', stat: '3000 Seats', img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&h=300&fit=crop' },
  ]
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">World-Class Infrastructure</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">50-acre campus with state-of-the-art facilities designed for holistic student development</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map(f => (
            <Card key={f.title} padding={false} className="overflow-hidden hover:shadow-md transition-all">
              <img src={f.img} alt={f.title} className="w-full h-44 object-cover bg-slate-100" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <f.icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{f.title}</h3>
                  </div>
                  <Badge variant="blue">{f.stat}</Badge>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// =================== PLACEMENTS PAGE ===================
export function PlacementsPage() {
  const topRecruiters = ['TCS', 'Infosys', 'Wipro', 'Amazon', 'Microsoft', 'Google', 'Deloitte', 'Accenture', 'IBM', 'Cognizant', 'HCL', 'Tech Mahindra', 'Capgemini', 'Oracle', 'Salesforce']
  const placementData = [
    { dept: 'CSE', placed: 228, total: 240, avgPkg: '₹12.4 LPA', highPkg: '₹45 LPA' },
    { dept: 'ECE', placed: 162, total: 180, avgPkg: '₹9.8 LPA', highPkg: '₹32 LPA' },
    { dept: 'MBA', placed: 108, total: 120, avgPkg: '₹11.2 LPA', highPkg: '₹38 LPA' },
    { dept: 'Mechanical', placed: 136, total: 160, avgPkg: '₹7.4 LPA', highPkg: '₹22 LPA' },
    { dept: 'Civil', placed: 96, total: 120, avgPkg: '₹6.8 LPA', highPkg: '₹18 LPA' },
    { dept: 'IT', placed: 126, total: 140, avgPkg: '₹10.6 LPA', highPkg: '₹36 LPA' },
  ]
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Placement Excellence</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">Class of 2025 — 94% placement rate with 200+ recruiting companies</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
          {[['94%', 'Placement Rate', 'green'], ['₹8.4 LPA', 'Average Package', 'blue'], ['₹45 LPA', 'Highest Package', 'purple'], ['200+', 'Recruiting Companies', 'yellow']].map(([v, l, c]) => (
            <Card key={l} className="text-center">
              <div className={`text-3xl font-bold font-display mb-1 text-${c === 'green' ? 'emerald' : c === 'blue' ? 'blue' : c === 'purple' ? 'purple' : 'amber'}-600`}>{v}</div>
              <div className="text-sm text-slate-500">{l}</div>
            </Card>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-slate-900 font-display mb-5">Department-wise Placements 2025</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 mb-12">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['Department', 'Placed', 'Total', 'Placement %', 'Avg Package', 'Highest Package'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {placementData.map(r => (
                <tr key={r.dept} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.dept}</td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">{r.placed}</td>
                  <td className="px-4 py-3 text-slate-600">{r.total}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-16">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.round(r.placed/r.total*100)}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-700">{Math.round(r.placed/r.total*100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{r.avgPkg}</td>
                  <td className="px-4 py-3 font-bold text-purple-600">{r.highPkg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 font-display mb-5">Top Recruiting Companies</h2>
        <div className="flex flex-wrap gap-3">
          {topRecruiters.map(r => (
            <span key={r} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors">{r}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// =================== RESEARCH PAGE ===================
export function ResearchPage() {
  // Real, database-backed, approved-only projects (Problem 1) -- no mock
  // array. Pending/rejected projects are never returned by this endpoint.
  const [projects, setProjects] = useState<ApiPublicResearchProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    researchApi.getPublicProjects()
      .then(res => { if (!cancelled) setProjects(res) })
      .catch(() => { if (!cancelled) setProjects([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Research & Innovation</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">Faculty-led research projects, reviewed and approved by the institution</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-slate-900 font-display mb-6">Approved Research Projects</h2>
        {loading ? (
          <p className="text-sm text-slate-500 text-center py-10">Loading research projects…</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-10">No approved research projects published yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map(p => (
              <Card key={p.id} className="hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={p.status === 'ongoing' ? 'green' : 'slate'}>{p.status}</Badge>
                  {p.department_name && <Badge variant="blue">{p.department_name}</Badge>}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{p.title}</h3>
                <p className="text-sm text-slate-500 mb-3">PI: <span className="font-medium text-slate-700">{p.principal_investigator_name || 'Unassigned'}</span></p>
                <div className="flex justify-between text-sm">
                  {p.funding_agency && <div><span className="text-slate-500">Agency: </span><span className="font-medium text-slate-700">{p.funding_agency}</span></div>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =================== EVENTS PAGE ===================
export function EventsPage() {
  const events = [
    { title: 'National Symposium on AI & ML', date: 'Aug 15, 2025', location: 'Main Auditorium', type: 'Academic', desc: 'A national-level symposium featuring keynotes from AI researchers and industry leaders.' },
    { title: 'Annual Cultural Fest – Utsav 2025', date: 'Sep 5–7, 2025', location: 'Open Ground', type: 'Cultural', desc: 'Three-day cultural extravaganza with music, dance, drama, and art competitions.' },
    { title: 'Industry Connect Job Fair', date: 'Sep 20, 2025', location: 'Sports Complex', type: 'Placement', desc: '200+ companies participating in on-campus recruitment for final year students.' },
    { title: 'Hackathon 2025: Code for India', date: 'Oct 10–12, 2025', location: 'CSE Block', type: 'Technical', desc: '36-hour coding hackathon with ₹5 lakh prize pool and industry mentors.' },
    { title: 'International Research Conference', date: 'Nov 3, 2025', location: 'Conference Hall', type: 'Academic', desc: 'Annual conference with researchers from 15 countries presenting latest innovations.' },
    { title: 'Sports Meet 2025', date: 'Dec 1–5, 2025', location: 'Sports Complex', type: 'Sports', desc: 'Inter-department and inter-college sports tournament across 20+ disciplines.' },
  ]
  const typeColors: Record<string, 'blue' | 'purple' | 'green' | 'yellow' | 'red' | 'slate'> = {
    Academic: 'blue', Cultural: 'purple', Placement: 'green', Technical: 'yellow', Sports: 'red'
  }
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Events & Activities</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">Stay updated with academic, cultural, and technical events at EduVerse</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(e => (
            <Card key={e.title} className="hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={typeColors[e.type] ?? 'blue'}>{e.type}</Badge>
                <span className="text-xs text-slate-500">{e.date}</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-1.5">{e.title}</h3>
              <p className="text-sm text-blue-600 font-medium mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" />{e.location}
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">{e.desc}</p>
              <Button variant="secondary" size="sm" className="mt-4 w-full">Register</Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// =================== GALLERY PAGE ===================
export function GalleryPage() {
  const photos = [
    { id: 'photo-1562774053-701939374585', caption: 'Main Campus Gate', cat: 'Campus' },
    { id: 'photo-1523050854058-8df90110c9f1', caption: 'Convocation Ceremony', cat: 'Events' },
    { id: 'photo-1541339907198-e08756dedf3f', caption: 'Academic Block', cat: 'Campus' },
    { id: 'photo-1581092918056-0c4c3acd3789', caption: 'Research Laboratory', cat: 'Academics' },
    { id: 'photo-1524178232363-1fb2b075b655', caption: 'Central Library', cat: 'Academics' },
    { id: 'photo-1571902943202-507ec2618e8f', caption: 'Sports Complex', cat: 'Sports' },
    { id: 'photo-1497486751825-1233686d5d80', caption: 'Cultural Fest', cat: 'Events' },
    { id: 'photo-1607013251379-e6eecfffe234', caption: 'Student Activities', cat: 'Student Life' },
    { id: 'photo-1540575467063-178a50c2df87', caption: 'Auditorium', cat: 'Campus' },
    { id: 'photo-1567521464027-f127ff144326', caption: 'Food Court', cat: 'Campus' },
    { id: 'photo-1555854877-bab0e564b8d5', caption: 'Student Hostel', cat: 'Campus' },
    { id: 'photo-1544620347-c4fd4a3d5957', caption: 'College Bus Fleet', cat: 'Campus' },
  ]
  const [filter, setFilter] = useState('All')
  const cats = ['All', 'Campus', 'Academics', 'Events', 'Sports', 'Student Life']
  const filtered = filter === 'All' ? photos : photos.filter(p => p.cat === filter)
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Campus Gallery</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">A visual tour of EduVerse's vibrant campus life</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex gap-2 flex-wrap mb-8 justify-center">
          {cats.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === c ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="group relative overflow-hidden rounded-2xl bg-slate-100">
              <img src={`https://images.unsplash.com/${p.id}?w=400&h=280&fit=crop&auto=format`}
                alt={p.caption} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs font-medium">{p.caption}</p>
                <Badge variant="blue" className="mt-1">{p.cat}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// =================== NEWS PAGE ===================
export function NewsPage() {
  const news = [
    { title: 'EduVerse ranked #5 among Top Engineering Colleges 2025', date: 'Jul 1, 2025', cat: 'Achievement', img: 'photo-1523050854058-8df90110c9f1', excerpt: 'NIRF 2025 rankings released — EduVerse continues to strengthen its position as one of India\'s premier technical institutions.' },
    { title: 'New AI Research Center inaugurated by Union Minister', date: 'Jun 28, 2025', cat: 'Research', img: 'photo-1581092918056-0c4c3acd3789', excerpt: 'A state-of-the-art AI Research Center equipped with GPU clusters and dedicated research staff was inaugurated.' },
    { title: '98 students placed in Google and Microsoft campus drive', date: 'Jun 22, 2025', cat: 'Placements', img: 'photo-1562774053-701939374585', excerpt: 'In a record-breaking campus drive, Google and Microsoft together offered packages ranging from ₹18–45 LPA.' },
    { title: 'EduVerse signs MoU with IIT Bangalore for joint research', date: 'Jun 15, 2025', cat: 'Partnership', img: 'photo-1541339907198-e08756dedf3f', excerpt: 'The MoU covers joint PhD programs, faculty exchange, and collaborative research in AI and sustainable energy.' },
  ]
  const catColors: Record<string, 'blue' | 'green' | 'purple' | 'yellow'> = {
    Achievement: 'yellow', Research: 'blue', Placements: 'green', Partnership: 'purple'
  }
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">News & Updates</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">Stay informed about the latest developments at EduVerse College</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-6">
          {news.map(n => (
            <Card key={n.title} padding={false} className="flex flex-col sm:flex-row overflow-hidden hover:shadow-md transition-all">
              <img src={`https://images.unsplash.com/${n.img}?w=300&h=220&fit=crop&auto=format`}
                alt={n.title} className="w-full sm:w-56 h-44 sm:h-auto object-cover bg-slate-100 flex-shrink-0" />
              <div className="p-6 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant={catColors[n.cat] ?? 'blue'}>{n.cat}</Badge>
                  <span className="text-xs text-slate-400">{n.date}</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-lg leading-snug">{n.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{n.excerpt}</p>
                <button className="mt-4 text-sm text-blue-600 font-semibold hover:underline text-left flex items-center gap-1">
                  Read More <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// =================== SCHOLARSHIPS PAGE ===================
export function ScholarshipsPage() {
  const scholarships = [
    { name: 'Chancellor\'s Merit Scholarship', amount: '100% Tuition Waiver', eligibility: 'Top 3 rank in Board Exam', deadline: 'Aug 31, 2025', seats: 10 },
    { name: 'Principal\'s Excellence Award', amount: '50% Tuition Waiver', eligibility: '95%+ in Board Exams', deadline: 'Sep 15, 2025', seats: 30 },
    { name: 'Need-Based Financial Aid', amount: 'Up to ₹60,000/yr', eligibility: 'Family income < ₹3 LPA', deadline: 'Ongoing', seats: 200 },
    { name: 'Sports Scholarship', amount: 'Up to ₹40,000/yr', eligibility: 'National/State level athlete', deadline: 'Aug 15, 2025', seats: 20 },
    { name: 'SC/ST Special Scholarship', amount: 'Full Tuition + Stipend', eligibility: 'SC/ST category students', deadline: 'Ongoing', seats: 150 },
    { name: 'Girl Child Education Scheme', amount: '25% Tuition Waiver', eligibility: 'Female students only', deadline: 'Sep 30, 2025', seats: 100 },
    { name: 'Alumni Endowment Fund', amount: 'Up to ₹50,000/yr', eligibility: 'Based on merit + need', deadline: 'Oct 1, 2025', seats: 50 },
    { name: 'Research Excellence Fellowship', amount: '₹25,000/month stipend', eligibility: 'PhD students with publications', deadline: 'Nov 30, 2025', seats: 25 },
  ]
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Scholarships & Financial Aid</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">EduVerse invests ₹12 crore annually in student scholarships and financial support</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {scholarships.map(s => (
            <Card key={s.name} className="hover:shadow-md transition-all border-l-4 border-l-blue-500">
              <h3 className="font-bold text-slate-900 mb-2">{s.name}</h3>
              <div className="text-xl font-bold text-blue-600 font-display mb-3">{s.amount}</div>
              <div className="space-y-1.5 text-sm text-slate-600 mb-4">
                <div><span className="text-slate-400">Eligibility: </span>{s.eligibility}</div>
                <div><span className="text-slate-400">Deadline: </span><span className={s.deadline === 'Ongoing' ? 'text-green-600 font-medium' : ''}>{s.deadline}</span></div>
                <div><span className="text-slate-400">Available seats: </span><span className="font-semibold">{s.seats}</span></div>
              </div>
              <Button variant="secondary" size="sm" className="w-full">Apply Now</Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// =================== CONTACT PAGE ===================
export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'Admissions Inquiry', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email, and message.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await contactApi.submit({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: form.subject,
        message: form.message.trim(),
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send your message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Get in Touch</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">We're here to help. Reach out to us through any of the channels below</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Info */}
          <div className="space-y-5">
            {[
              { icon: MapPin, title: 'Address', text: '42 University Road, Knowledge City, Karnataka - 560001' },
              { icon: Phone, title: 'Phone', text: '+91 80123 45678\n+91 80123 45679 (Admissions)' },
              { icon: Mail, title: 'Email', text: 'info@eduverse.edu.in\nadmissions@eduverse.edu.in' },
              { icon: Clock, title: 'Office Hours', text: 'Mon–Fri: 9:00 AM – 5:00 PM\nSat: 9:00 AM – 1:00 PM' },
            ].map(item => (
              <Card key={item.title}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">{item.title}</h4>
                    <p className="text-sm text-slate-500 whitespace-pre-line">{item.text}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-xl font-bold text-slate-900 font-display mb-6">Send us a Message</h2>
              {submitted ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                  <p className="text-slate-500 text-sm">Thank you, {form.name}! We've received your message and will get back to you soon.</p>
                  <Button className="mt-6" onClick={() => { setForm({ name: '', email: '', phone: '', subject: 'Admissions Inquiry', message: '' }); setSubmitted(false) }}>Send Another Message</Button>
                </div>
              ) : (
                <>
                  {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <Input label="Full Name" placeholder="Your full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <Input label="Email Address" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    <Input label="Phone Number" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    <Select label="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                      <option>Admissions Inquiry</option>
                      <option>Course Information</option>
                      <option>Fee Details</option>
                      <option>Scholarships</option>
                      <option>Other</option>
                    </Select>
                  </div>
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                    <textarea rows={5} placeholder="Write your message here..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                  </div>
                  <Button size="lg" className="w-full sm:w-auto" disabled={submitting} onClick={handleSend}>{submitting ? 'Sending…' : 'Send Message'}</Button>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// =================== FAQ PAGE ===================
export function FAQPage() {
  const [open, setOpen] = useState<number | null>(null)
  const faqs = [
    { q: 'When does the admission process start?', a: 'Admissions typically open in June each year. The application window is June 1 to August 15. Entrance exams are held in July and results are announced in August.' },
    { q: 'What is the minimum eligibility for B.Tech admission?', a: 'You need 10+2 (or equivalent) with Physics, Chemistry, and Mathematics, securing a minimum of 60% aggregate marks. SC/ST students get a 5% relaxation.' },
    { q: 'Is there an entrance exam?', a: 'Yes. EduVerse accepts JEE Main scores for B.Tech admissions. For management programs, we accept CAT/MAT/XAT scores. The college also conducts its own entrance test for certain programs.' },
    { q: 'What scholarships are available?', a: 'We offer merit scholarships (up to 100% tuition waiver), need-based financial aid, sports scholarships, and government schemes for SC/ST/OBC students. Over ₹12 crore is distributed annually.' },
    { q: 'Are hostels available for all students?', a: 'Yes. We have separate hostels for boys and girls with a combined capacity of 2000+ students. Allocation is on a first-come, first-served basis for outstation students. Hostel fee is ₹45,000–₹65,000/year.' },
    { q: 'What is the college bus facility?', a: 'EduVerse operates 80+ buses covering 40+ routes across the city. A monthly bus pass costs ₹1,200. GPS tracking is available on all buses. Special routes for outlying areas are available.' },
    { q: 'What is the placement record?', a: 'Our Class of 2025 achieved a 94% placement rate with an average package of ₹8.4 LPA and highest package of ₹45 LPA. Over 200 companies visit for campus recruitment including TCS, Infosys, Amazon, Google, and Microsoft.' },
    { q: 'How do I apply for admission?', a: 'Visit the Admissions page on our website, fill out the online application form, upload required documents (10+2 marksheet, ID proof, photos), pay the application fee of ₹500, and submit. You will receive a confirmation email within 24 hours.' },
  ]
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Frequently Asked Questions</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">Find answers to the most common questions about EduVerse College</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <button className="w-full flex items-center justify-between px-6 py-4 text-left gap-4" onClick={() => setOpen(open === i ? null : i)}>
                <span className="font-semibold text-slate-900 text-sm">{f.q}</span>
                {open === i ? <ChevronUp className="w-4 h-4 text-blue-600 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>
              {open === i && (
                <div className="px-6 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// =================== ADMISSIONS PAGE ===================
export function AdmissionsPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', department: '', course: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [loadingLookups, setLoadingLookups] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([lookupApi.getDepartments(), lookupApi.getCourses()])
      .then(([depts, crs]) => { if (!cancelled) { setDepartments(depts); setCourses(crs) } })
      .catch(() => { if (!cancelled) { setDepartments([]); setCourses([]) } })
      .finally(() => { if (!cancelled) setLoadingLookups(false) })
    return () => { cancelled = true }
  }, [])

  const coursesForDepartment = form.department ? courses.filter(c => c.department === form.department) : courses

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.department || !form.course) {
      setError('Please fill in your name, email, phone, department, and course.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const [first_name, ...rest] = form.name.trim().split(' ')
      await admissionApi.submitPublicApplication({
        first_name,
        last_name: rest.join(' '),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        department: form.department,
        course: form.course,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit your application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display mb-4">Admissions 2025–26</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">Apply now for a transformative education at EduVerse College</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Info */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display mb-6">Admission Information</h2>
            <div className="space-y-5 mb-8">
              {[
                { step: '01', title: 'Check Eligibility', desc: '10+2 with PCM (B.Tech), Any UG (MBA), B.Tech (M.Tech). Minimum 60% marks.' },
                { step: '02', title: 'Appear for Entrance Exam', desc: 'JEE Main for B.Tech | CAT/MAT for MBA | GATE for M.Tech | College\'s own test.' },
                { step: '03', title: 'Fill Application Form', desc: 'Complete online registration with all required documents and pay ₹500 fee.' },
                { step: '04', title: 'Attend Counselling', desc: 'Selected candidates will be called for in-person counselling and document verification.' },
                { step: '05', title: 'Confirm Admission', desc: 'Pay first semester fee and complete enrollment formalities to confirm your seat.' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{s.step}</div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-0.5">{s.title}</h4>
                    <p className="text-sm text-slate-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <h4 className="font-semibold text-amber-900 mb-2">📅 Important Dates</h4>
              <div className="space-y-1.5 text-sm text-amber-800">
                {[['Application Opens', 'Jun 1, 2025'], ['Application Closes', 'Aug 15, 2025'], ['Entrance Exam', 'Jul 20, 2025'], ['Results', 'Aug 5, 2025'], ['Counselling', 'Aug 20–25, 2025'], ['Classes Begin', 'Sep 1, 2025']].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span>{k}</span><span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            <Card>
              <h2 className="text-xl font-bold text-slate-900 font-display mb-6">Registration Form</h2>
              {submitted ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Application Submitted!</h3>
                  <p className="text-slate-500 text-sm">Thank you, {form.name}! Your application has been received. Check {form.email} for a confirmation email.</p>
                  <Button className="mt-6" onClick={() => { setForm({ name: '', email: '', phone: '', address: '', department: '', course: '' }); setSubmitted(false) }}>Submit Another</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}
                  <Input label="Full Name *" placeholder="Enter your full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  <Input label="Email Address *" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  <Input label="Phone Number *" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Address</label>
                    <textarea rows={3} placeholder="Enter your address"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <Select label="Department *" value={form.department} onChange={e => setForm({ ...form, department: e.target.value, course: '' })} disabled={loadingLookups}>
                    <option value="">{loadingLookups ? 'Loading departments…' : 'Select Department'}</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                  <Select label="Course *" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} disabled={loadingLookups || !form.department}>
                    <option value="">{!form.department ? 'Select a department first' : 'Select Course'}</option>
                    {coursesForDepartment.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  <Button size="lg" className="w-full" disabled={submitting} onClick={handleSubmit}>
                    {submitting ? 'Submitting…' : 'Submit Application'}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
