import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, ChevronLeft, LogOut, Bell } from 'lucide-react'
import { Avatar } from './ui'
import { authApi } from '../services/api'

interface SidebarItem {
  label: string
  to: string
  icon: React.ReactNode
  badge?: string | number
}

interface SidebarProps {
  items: SidebarItem[]
  role: string
  userName: string
  userSub: string
}

export default function Sidebar({ items, role, userName, userSub }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/')

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await authApi.logout()
    } finally {
      // authApi.logout() clears the stored access/refresh tokens and user
      // record regardless of whether the backend revoke call succeeded --
      // navigate only after that local session state is actually gone.
      setLoggingOut(false)
      navigate('/', { replace: true })
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <div className={`flex items-center gap-2.5 overflow-hidden transition-all ${collapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 font-display truncate">EduVerse</div>
            <div className="text-xs text-slate-500 truncate">{role} Portal</div>
          </div>
        </div>
        <button onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-7 h-7 rounded-lg hover:bg-slate-100 items-center justify-center text-slate-400 flex-shrink-0 transition-all">
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto sidebar-scroll space-y-0.5">
        {items.map(item => (
          <Link key={item.to} to={item.to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${isActive(item.to) ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <span className={`flex-shrink-0 ${isActive(item.to) ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'}`}>
              {item.icon}
            </span>
            <span className={`flex-1 whitespace-nowrap overflow-hidden transition-all ${collapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>
              {item.label}
            </span>
            {!collapsed && item.badge && (
              <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-100 p-3 space-y-2">
        <div className={`flex items-center gap-3 px-2 py-1.5 overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
          <Avatar name={userName} size="sm" />
          <div className={`min-w-0 overflow-hidden transition-all ${collapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>
            <div className="text-sm font-semibold text-slate-900 truncate">{userName}</div>
            <div className="text-xs text-slate-500 truncate">{userSub}</div>
          </div>
        </div>
        <button type="button" onClick={handleLogout} disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all group disabled:opacity-60">
          <LogOut className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-red-500" />
          <span className={`whitespace-nowrap transition-all ${collapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>{loggingOut ? 'Logging out…' : 'Logout'}</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm"
      >
        <div className="space-y-1">
          <div className="w-4 h-0.5 bg-slate-600" />
          <div className="w-4 h-0.5 bg-slate-600" />
          <div className="w-3 h-0.5 bg-slate-600" />
        </div>
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-white h-full shadow-xl z-10">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-slate-100 h-screen sticky top-0 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
      </aside>
    </>
  )
}

// Dashboard Top Bar
interface DashboardTopBarProps {
  title: string
  userName: string
}

export function DashboardTopBar({ title, userName }: DashboardTopBarProps) {
  return (
    <div className="h-14 border-b border-slate-100 bg-white px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
      <h2 className="font-semibold text-slate-900 text-base font-display">{title}</h2>
      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <Avatar name={userName} size="sm" />
      </div>
    </div>
  )
}
