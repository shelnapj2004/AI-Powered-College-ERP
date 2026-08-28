import { type ReactNode } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import ChatBot from './ChatBot'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
      <ChatBot />
    </div>
  )
}
