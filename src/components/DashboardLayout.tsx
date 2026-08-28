import { type ReactNode } from 'react'
import Sidebar, { DashboardTopBar } from './Sidebar'
import ChatBot from './ChatBot'

interface DashboardLayoutProps {
  children: ReactNode
  sidebarItems: Array<{ label: string; to: string; icon: ReactNode; badge?: string | number }>
  role: string
  userName: string
  userSub: string
  pageTitle: string
}

export default function DashboardLayout({ children, sidebarItems, role, userName, userSub, pageTitle }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar items={sidebarItems} role={role} userName={userName} userSub={userSub} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardTopBar title={pageTitle} userName={userName} />
        <main className="flex-1 overflow-y-auto p-6 sidebar-scroll">
          {children}
        </main>
      </div>
      <ChatBot />
    </div>
  )
}
