import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GraduationCap, Menu, X, ChevronDown } from 'lucide-react'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Departments', to: '/departments' },
  { label: 'Courses', to: '/courses' },
  { label: 'Faculty', to: '/faculty' },
  {
    label: 'More', to: '#',
    children: [
      { label: 'Infrastructure', to: '/infrastructure' },
      { label: 'Placements', to: '/placements' },
      { label: 'Research', to: '/research' },
      { label: 'Events', to: '/events' },
      { label: 'Gallery', to: '/gallery' },
      { label: 'News', to: '/news' },
      { label: 'Scholarships', to: '/scholarships' },
    ],
  },
  { label: 'Contact', to: '/contact' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Admissions', to: '/admissions' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const location = useLocation()

  const isActive = (to: string) => location.pathname === to

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-slate-900 font-display leading-tight">EduVerse</div>
              <div className="text-xs text-slate-500 leading-tight">College ERP</div>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map(link => (
              link.children ? (
                <div key={link.label} className="relative"
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all">
                    {link.label} <ChevronDown className="w-3 h-3" />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-50">
                      {link.children.map(child => (
                        <Link key={child.to} to={child.to}
                          className={`block px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors ${isActive(child.to) ? 'text-blue-600 bg-blue-50' : 'text-slate-700'}`}>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link key={link.to} to={link.to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive(link.to) ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`}>
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/login"
              className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all">
              Login
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden bg-white border-t border-slate-100 px-4 pb-4 pt-2 max-h-[80vh] overflow-y-auto">
          {navLinks.map(link => (
            link.children ? (
              <div key={link.label}>
                <div className="px-3 py-2 text-sm font-semibold text-slate-400 uppercase tracking-wider text-xs mt-3">{link.label}</div>
                {link.children.map(child => (
                  <Link key={child.to} to={child.to} onClick={() => setOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link key={link.to} to={link.to} onClick={() => setOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive(link.to) ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'}`}>
                {link.label}
              </Link>
            )
          ))}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Link to="/login" onClick={() => setOpen(false)}
              className="block w-full text-center px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600">
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
