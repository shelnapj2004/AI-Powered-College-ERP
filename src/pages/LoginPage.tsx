import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff, Lock, User } from 'lucide-react'
import { Input, Button, Alert } from '../components/ui'
import { authApi, ApiError } from '../services/api'

const roleOptions = [
  { label: 'Student', value: 'student', to: '/student', icon: '🎓', devUsername: 'student1', devPassword: 'Student@123' },
  { label: 'Teacher', value: 'teacher', to: '/teacher', icon: '📚', devUsername: 'teacher1', devPassword: 'Teacher@123' },
  { label: 'Staff', value: 'staff', to: '/staff', icon: '🏢', devUsername: 'staff1', devPassword: 'Staff@123' },
  { label: 'HOD', value: 'hod', to: '/hod', icon: '🎯', devUsername: 'hod1', devPassword: 'Hod@123' },
  { label: 'Admin', value: 'admin', to: '/admin', icon: '⚙️', devUsername: 'admin1', devPassword: 'Admin@123' },
]

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false)
  const [role, setRole] = useState('student')
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleLogin() {
    if (!form.username.trim() || !form.password) {
      setError('Please enter both username and password.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const user = await authApi.login(form.username.trim(), form.password)
      // Route by the account's REAL backend role, not the selector — the
      // selector is just a UX shortcut, the backend role is authoritative.
      const dest = roleOptions.find(o => o.value === user.role)
      navigate(dest ? dest.to : '/')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? 'Incorrect username or password.' : err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 bg-gradient-to-br from-blue-700 to-blue-900 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white font-display mb-4">EduVerse ERP</h1>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">
            The complete AI-powered management system for students, faculty, staff, and administrators.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[['12,000+', 'Students'], ['850+', 'Faculty'], ['94%', 'Placement'], ['A++', 'NAAC Grade']].map(([v, l]) => (
              <div key={l} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-white font-display">{v}</div>
                <div className="text-blue-200 text-sm">{l}</div>
              </div>
            ))}
          </div>
          <img src="https://images.unsplash.com/photo-1562774053-701939374585?w=500&h=250&fit=crop&auto=format"
            alt="Campus" className="w-full h-44 object-cover rounded-2xl mt-8 opacity-60 bg-blue-800" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:max-w-md">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 justify-center lg:justify-start">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 font-display">EduVerse</div>
              <div className="text-xs text-slate-500">College ERP Portal</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 font-display mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-7">Sign in to access your portal</p>

          {/* Role Selector */}
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Login as</label>
            <div className="grid grid-cols-5 gap-1.5">
              {roleOptions.map(r => (
                <button key={r.value} onClick={() => setRole(r.value)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-medium border transition-all ${role === r.value ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <span className="text-base">{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          {error && (
            <div className="mb-4">
              <Alert type="error">{error}</Alert>
            </div>
          )}
          <div className="space-y-4 mb-6">
            <Input
              label="Username / Employee ID"
              placeholder={role === 'student' ? 'e.g. 22CS001' : 'e.g. EMP001'}
              icon={<User className="w-4 h-4" />}
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
              <span className="text-sm text-slate-600">Remember me</span>
            </label>
            <button className="text-sm text-blue-600 font-medium hover:underline">Forgot password?</button>
          </div>

          <Button size="lg" className="w-full mb-4" onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing in…' : `Sign In to ${roleOptions.find(r => r.value === role)?.label} Portal`}
          </Button>

          <div className="text-center">
            <Link to="/" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
              ← Back to Website
            </Link>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700 font-medium mb-2">Dev Credentials ({roleOptions.find(r => r.value === role)?.label})</p>
            <p className="text-xs text-blue-600">
              Username: <span className="font-mono font-semibold">{roleOptions.find(r => r.value === role)?.devUsername}</span>
              {' '}| Password: <span className="font-mono font-semibold">{roleOptions.find(r => r.value === role)?.devPassword}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
