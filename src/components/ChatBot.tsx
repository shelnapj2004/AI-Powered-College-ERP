import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User } from 'lucide-react'

interface Message {
  id: number
  from: 'bot' | 'user'
  text: string
  time: string
}

const topics = [
  'Admission Guidance',
  'Scholarship Information',
  'Course Details',
  'Department Details',
  'Placement Information',
  'Hostel Information',
  'Transport Information',
  'FAQs',
]

const botResponses: Record<string, string> = {
  'admission guidance': 'To apply for admission, visit our Admissions page. Applications open from June 1st each year. You will need 10+2 with minimum 60% marks. Our entrance exam is conducted in July. Would you like more details?',
  'scholarship': 'EduVerse offers merit scholarships (up to 100% tuition waiver), need-based aid, sports scholarships, and government schemes like SC/ST/OBC scholarships. Apply via the Scholarships page.',
  'course details': 'We offer B.Tech, M.Tech, MBA, BCA, MCA, B.Sc, M.Sc across 12 departments. Programs range from 3 to 4 years. Visit our Courses page for the full catalog.',
  'department': 'We have 12 departments including CSE, ECE, Mechanical, Civil, Chemical, MBA, and Sciences. Each has dedicated labs, industry partnerships, and research centers.',
  'placement': 'Our placement rate is 94% with an average package of ₹8.4 LPA. Top recruiters include TCS, Infosys, Wipro, Amazon, Microsoft, and 200+ other companies.',
  'hostel': 'Separate hostels for boys and girls with 2000+ capacity. Amenities include Wi-Fi, mess, gym, laundry, and 24/7 security. Fees: ₹45,000–₹65,000 per year.',
  'transport': 'College buses cover 40+ routes across the city. Monthly pass: ₹1,200. Special routes for outlying areas. GPS tracking available on all buses.',
  'faq': 'Common queries: Admissions open June–August, Fees range ₹80,000–₹1,50,000/year, Campus has 50+ acres, Library has 1 lakh+ books. Ask me anything specific!',
}

const fmt = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

const welcome: Message = {
  id: 0,
  from: 'bot',
  text: "Hi! I'm EduBot, your AI assistant. How can I help you today? You can ask about admissions, courses, scholarships, placements, hostel, transport, or general FAQs.",
  time: fmt(),
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([welcome])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg) return
    const userMsg: Message = { id: Date.now(), from: 'user', text: msg, time: fmt() }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    setTimeout(() => {
      const lower = msg.toLowerCase()
      let reply = "I'm not sure about that. Please contact our support at info@eduverse.edu.in or call +91 80123 45678."
      for (const [key, val] of Object.entries(botResponses)) {
        if (lower.includes(key.split(' ')[0])) { reply = val; break }
      }
      setMessages(prev => [...prev, { id: Date.now() + 1, from: 'bot', text: reply, time: fmt() }])
    }, 800)
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 ${open ? 'bg-slate-700 rotate-0' : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'}`}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">!</span>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden" style={{ height: '520px' }}>
          {/* Header */}
          <div className="bg-blue-600 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">EduBot AI</div>
              <div className="text-blue-200 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                Online · Typically replies instantly
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-blue-200 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Topic Chips */}
          <div className="px-3 py-2 border-b border-slate-100 flex gap-2 overflow-x-auto scrollbar-hide">
            {topics.map(t => (
              <button key={t} onClick={() => send(t)}
                className="flex-shrink-0 px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors border border-blue-100">
                {t}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 sidebar-scroll">
            {messages.map(m => (
              <div key={m.id} className={`flex items-end gap-2 ${m.from === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.from === 'bot' ? 'bg-blue-100' : 'bg-slate-200'}`}>
                  {m.from === 'bot' ? <Bot className="w-4 h-4 text-blue-600" /> : <User className="w-4 h-4 text-slate-600" />}
                </div>
                <div className={`max-w-[75%] ${m.from === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${m.from === 'bot' ? 'bg-slate-100 text-slate-800 rounded-bl-sm' : 'bg-blue-600 text-white rounded-br-sm'}`}>
                    {m.text}
                  </div>
                  <span className="text-xs text-slate-400">{m.time}</span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Type your message..."
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => send()}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
