import type React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Award, BookOpen, Building, Briefcase, Star, ChevronRight, Play, TrendingUp, Globe, Microscope } from 'lucide-react'
import { Badge } from '../../components/ui'

const stats = [
  { value: '12,000+', label: 'Students Enrolled' },
  { value: '850+', label: 'Faculty Members' },
  { value: '94%', label: 'Placement Rate' },
  { value: '40+', label: 'Years of Excellence' },
]

const departments = [
  { name: 'Computer Science & Engineering', icon: '💻', students: 2400, color: 'bg-blue-50 border-blue-100' },
  { name: 'Electronics & Communication', icon: '📡', students: 1800, color: 'bg-purple-50 border-purple-100' },
  { name: 'Mechanical Engineering', icon: '⚙️', students: 1600, color: 'bg-orange-50 border-orange-100' },
  { name: 'Civil Engineering', icon: '🏗️', students: 1200, color: 'bg-green-50 border-green-100' },
  { name: 'Business Administration', icon: '📊', students: 1100, color: 'bg-yellow-50 border-yellow-100' },
  { name: 'Data Science & AI', icon: '🤖', students: 900, color: 'bg-red-50 border-red-100' },
]

const courses = [
  { name: 'B.Tech Computer Science', duration: '4 Years', seats: 240, fee: '₹1,20,000/yr', badge: 'Popular' },
  { name: 'MBA Business Analytics', duration: '2 Years', seats: 120, fee: '₹1,50,000/yr', badge: 'New' },
  { name: 'B.Sc Data Science', duration: '3 Years', seats: 90, fee: '₹80,000/yr', badge: 'Trending' },
  { name: 'M.Tech AI & ML', duration: '2 Years', seats: 60, fee: '₹1,30,000/yr', badge: '' },
]

const faculty = [
  { name: 'Dr. Priya Sharma', dept: 'CSE', exp: '18 years', pub: 42, img: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&auto=format' },
  { name: 'Prof. Rajesh Kumar', dept: 'ECE', exp: '22 years', pub: 67, img: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop&auto=format' },
  { name: 'Dr. Ananya Patel', dept: 'MBA', exp: '15 years', pub: 31, img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&auto=format' },
  { name: 'Prof. Vikram Singh', dept: 'Mech', exp: '25 years', pub: 89, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format' },
]

const events = [
  { title: 'National Symposium on AI & ML', date: 'Aug 15, 2025', type: 'Academic', color: 'blue' as const },
  { title: 'Annual Cultural Fest – Utsav 2025', date: 'Sep 5, 2025', type: 'Cultural', color: 'purple' as const },
  { title: 'Industry Connect Job Fair', date: 'Sep 20, 2025', type: 'Placement', color: 'green' as const },
  { title: 'Hackathon 2025: Code for India', date: 'Oct 10, 2025', type: 'Technical', color: 'yellow' as const },
]

const news = [
  { title: 'EduVerse ranked #5 among Top Engineering Colleges 2025', date: 'Jul 1, 2025', category: 'Achievement' },
  { title: 'New AI Research Center inaugurated by Union Minister', date: 'Jun 28, 2025', category: 'Research' },
  { title: '98 students placed in Google, Microsoft campus drive', date: 'Jun 22, 2025', category: 'Placements' },
  { title: 'EduVerse signs MoU with IIT Bangalore for joint research', date: 'Jun 15, 2025', category: 'Partnership' },
]

const recruiters = ['TCS', 'Infosys', 'Wipro', 'Amazon', 'Microsoft', 'Google', 'Deloitte', 'Accenture', 'IBM', 'Cognizant']

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1562774053-701939374585?w=1600&h=900&fit=crop&auto=format"
            alt="Campus" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-2xl">
            <Badge variant="blue" className="mb-5 px-3 py-1 text-sm">🎓 Admissions Open 2025–26</Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight font-display mb-6">
              Shape Your Future at <span className="text-blue-400">EduVerse</span> College
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              A premier institution delivering world-class education, cutting-edge research, and industry-ready graduates since 1985. Your journey to excellence starts here.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/admissions" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/40">
                Apply Now <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/courses" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl backdrop-blur-sm transition-all border border-white/20">
                <Play className="w-4 h-4" /> Explore Courses
              </Link>
            </div>
          </div>
        </div>
        {/* Stats Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white font-display">{s.value}</div>
                <div className="text-xs sm:text-sm text-slate-300 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <Badge variant="blue" className="mb-4">About Us</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-5 leading-tight">
                Four Decades of Academic Excellence
              </h2>
              <p className="text-slate-600 leading-relaxed mb-5">
                EduVerse College was established in 1985 with a vision to provide quality education that bridges the gap between theory and practice. Spread across a lush 50-acre campus, we house state-of-the-art labs, innovation centers, and a vibrant student community.
              </p>
              <p className="text-slate-600 leading-relaxed mb-7">
                NAAC A++ accredited and ranked among India's top 10 technical institutions, we are committed to nurturing leaders, innovators, and changemakers.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-7">
                {([['NAAC A++ Accredited', Award], ['50 Acre Campus', Building], ['1 Lakh+ Library Books', BookOpen], ['200+ Recruiters', Briefcase]] as [string, React.ComponentType<{className?: string}>][]).map(([label, Icon]) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    {label}
                  </div>
                ))}
              </div>
              <Link to="/about" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:gap-3 transition-all">
                Learn More About Us <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="relative">
              <img src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=700&h=500&fit=crop&auto=format"
                alt="Campus" className="rounded-2xl shadow-xl w-full object-cover h-80 lg:h-96 bg-blue-100" />
              <div className="absolute -bottom-6 -left-6 bg-blue-600 rounded-2xl p-5 shadow-xl">
                <div className="text-white font-bold text-2xl font-display">94%</div>
                <div className="text-blue-100 text-xs">Placement Rate</div>
              </div>
              <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-4 shadow-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Rank #5</div>
                    <div className="text-xs text-slate-500">In India 2025</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="blue" className="mb-4">Departments</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-3">12 Specialized Departments</h2>
            <p className="text-slate-500 max-w-xl mx-auto">World-class departments equipped with cutting-edge labs and industry partnerships</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments.map(d => (
              <Link to="/departments" key={d.name}
                className={`group p-6 rounded-2xl border ${d.color} hover:shadow-md transition-all bg-white`}>
                <div className="text-3xl mb-3">{d.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{d.name}</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{d.students.toLocaleString()} students</p>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/departments" className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all bg-white">
              View All 12 Departments <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="blue" className="mb-4">Courses</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-3">Programs Designed for Tomorrow</h2>
            <p className="text-slate-500 max-w-xl mx-auto">From undergraduate to postgraduate, find the perfect program to launch your career</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {courses.map(c => (
              <div key={c.name} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:border-blue-100 transition-all group">
                {c.badge && <Badge variant={c.badge === 'Popular' ? 'blue' : c.badge === 'New' ? 'green' : 'yellow'} className="mb-3">{c.badge}</Badge>}
                <h3 className="font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{c.name}</h3>
                <div className="space-y-1.5 text-sm text-slate-500">
                  <div className="flex justify-between"><span>Duration</span><span className="font-medium text-slate-700">{c.duration}</span></div>
                  <div className="flex justify-between"><span>Seats</span><span className="font-medium text-slate-700">{c.seats}</span></div>
                  <div className="flex justify-between"><span>Fee</span><span className="font-semibold text-blue-600">{c.fee}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/courses" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm">
              Explore All Programs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Faculty */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="blue" className="mb-4">Faculty</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-3">Learn from the Best</h2>
            <p className="text-slate-500 max-w-xl mx-auto">850+ distinguished faculty members with PhDs from IITs, IIMs, and global universities</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {faculty.map(f => (
              <div key={f.name} className="bg-white rounded-2xl border border-slate-100 p-5 text-center hover:shadow-md transition-all">
                <img src={f.img} alt={f.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-4 bg-slate-100" />
                <h4 className="font-semibold text-slate-900 text-sm mb-0.5">{f.name}</h4>
                <p className="text-xs text-blue-600 font-medium mb-2">{f.dept}</p>
                <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
                  <span>{f.exp}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span>{f.pub} papers</span>
                </div>
                <div className="mt-2 flex justify-center gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="grid grid-cols-2 gap-4">
              <img src="https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop&auto=format"
                alt="Library" className="rounded-2xl object-cover h-44 w-full bg-slate-100" />
              <img src="https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=300&fit=crop&auto=format"
                alt="Lab" className="rounded-2xl object-cover h-44 w-full bg-slate-100 mt-8" />
              <img src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=300&fit=crop&auto=format"
                alt="Sports" className="rounded-2xl object-cover h-44 w-full bg-slate-100 -mt-8" />
              <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop&auto=format"
                alt="Campus" className="rounded-2xl object-cover h-44 w-full bg-slate-100" />
            </div>
            <div>
              <Badge variant="blue" className="mb-4">Infrastructure</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-5">World-Class Campus Facilities</h2>
              <div className="space-y-4">
                {[
                  { icon: '📚', title: 'Central Library', desc: '1 lakh+ books, e-journals, 24/7 digital access' },
                  { icon: '🔬', title: 'Research Labs', desc: '120+ advanced labs with latest equipment' },
                  { icon: '🏋️', title: 'Sports Complex', desc: 'Olympic pool, courts, gym, athletics track' },
                  { icon: '🏠', title: 'Hostels', desc: '5 hostels with capacity for 2000+ students' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">{item.icon}</div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{item.title}</h4>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/infrastructure" className="mt-7 inline-flex items-center gap-2 text-blue-600 font-semibold">
                Explore Campus <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Placements */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-500 text-white border-blue-400">Placements</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-display mb-3">Our Placement Record Speaks</h2>
            <p className="text-blue-100 max-w-xl mx-auto">Class of 2025 — 94% placement rate, highest package ₹45 LPA</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[['94%', 'Placement Rate'], ['₹8.4 LPA', 'Average Package'], ['₹45 LPA', 'Highest Package'], ['200+', 'Recruiting Companies']].map(([val, lbl]) => (
              <div key={lbl} className="text-center">
                <div className="text-3xl font-bold text-white font-display mb-1">{val}</div>
                <div className="text-blue-200 text-sm">{lbl}</div>
              </div>
            ))}
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <p className="text-blue-100 text-sm font-medium mb-4 text-center">Top Recruiting Companies</p>
            <div className="flex flex-wrap justify-center gap-3">
              {recruiters.map(r => (
                <span key={r} className="px-4 py-2 bg-white/15 border border-white/20 rounded-xl text-white font-semibold text-sm hover:bg-white/25 transition-colors">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Research */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="blue" className="mb-4">Research</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-3">Pushing the Frontiers of Knowledge</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Microscope, title: 'AI & Machine Learning', papers: 156, funding: '₹8.2 Cr', color: 'bg-blue-50 text-blue-600' },
              { icon: Globe, title: 'Sustainable Energy', papers: 98, funding: '₹5.4 Cr', color: 'bg-green-50 text-green-600' },
              { icon: TrendingUp, title: 'Biomedical Engineering', papers: 74, funding: '₹6.1 Cr', color: 'bg-purple-50 text-purple-600' },
            ].map(r => (
              <div key={r.title} className="p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-all">
                <div className={`w-11 h-11 ${r.color} rounded-xl flex items-center justify-center mb-4`}>
                  <r.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-3">{r.title}</h3>
                <div className="flex gap-6 text-sm">
                  <div><div className="font-bold text-slate-900">{r.papers}</div><div className="text-slate-500">Papers</div></div>
                  <div><div className="font-bold text-slate-900">{r.funding}</div><div className="text-slate-500">Funding</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events & News */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Events */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 font-display">Upcoming Events</h2>
                <Link to="/events" className="text-sm text-blue-600 font-medium hover:underline">View all</Link>
              </div>
              <div className="space-y-3">
                {events.map(e => (
                  <div key={e.title} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-4 hover:shadow-sm transition-all">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 text-center leading-tight p-1">
                      {e.date.split(' ').slice(0, 2).join('\n')}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900 text-sm mb-1 truncate">{e.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={e.color}>{e.type}</Badge>
                        <span className="text-xs text-slate-500">{e.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* News */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 font-display">Latest News</h2>
                <Link to="/news" className="text-sm text-blue-600 font-medium hover:underline">View all</Link>
              </div>
              <div className="space-y-3">
                {news.map(n => (
                  <div key={n.title} className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="blue">{n.category}</Badge>
                      <span className="text-xs text-slate-400">{n.date}</span>
                    </div>
                    <h4 className="font-medium text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{n.title}</h4>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge variant="blue" className="mb-4">Gallery</Badge>
            <h2 className="text-3xl font-bold text-slate-900 font-display mb-3">Campus Life in Pictures</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              'photo-1562774053-701939374585', 'photo-1523050854058-8df90110c9f1',
              'photo-1541339907198-e08756dedf3f', 'photo-1571902943202-507ec2618e8f',
              'photo-1581092918056-0c4c3acd3789', 'photo-1524178232363-1fb2b075b655',
              'photo-1497486751825-1233686d5d80', 'photo-1607013251379-e6eecfffe234',
            ].map((id, i) => (
              <div key={id} className={`overflow-hidden rounded-2xl bg-slate-100 ${i === 0 || i === 7 ? 'col-span-2' : ''}`}>
                <img src={`https://images.unsplash.com/photo-${id}?w=400&h=250&fit=crop&auto=format`}
                  alt={`Campus ${i + 1}`} className="w-full h-36 md:h-44 object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/gallery" className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
              View Full Gallery <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Scholarships */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="blue" className="mb-4">Scholarships</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-4">Financial Aid for Every Student</h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-10">Don't let finances hold back your dreams. EduVerse offers extensive scholarship and aid programs to deserving students.</p>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
            {[['Merit Scholarship', 'Up to 100% tuition waiver for top rankers'], ['Need-Based Aid', 'For economically weaker sections'], ['Sports Scholarship', 'For national/state level athletes']].map(([t, d]) => (
              <div key={t} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-2 text-sm">{t}</h4>
                <p className="text-xs text-slate-500">{d}</p>
              </div>
            ))}
          </div>
          <Link to="/scholarships" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all">
            Explore Scholarships <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white font-display mb-3">Ready to Begin Your Journey?</h2>
          <p className="text-slate-400 mb-8">Contact our admissions team or use our AI chatbot for instant assistance</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/admissions" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all">
              Apply for Admission
            </Link>
            <Link to="/contact" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
