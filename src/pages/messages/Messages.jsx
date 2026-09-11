import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth, db } from '../../lib/firebase'
import {
  collection, doc, updateDoc, query, where, orderBy, onSnapshot,
} from 'firebase/firestore'
import { useAuthStore } from '../../stores/authStore'
import { loadConnections, displayName, initials, avatarBg } from '../../lib/people'
import { ensureConversation, sendMessage } from '../../lib/messaging'
import {
  MessageSquare, Search, Edit3, ArrowLeft, Send, X
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatConversationTime(ts) {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`

  // Same week — show day name
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  if (date >= startOfWeek) return days[date.getDay()]

  // Older — show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMessageTime(ts) {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDateDivider(ts) {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (msgDay.getTime() === today.getTime()) return 'Today'
  if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

function isSameDay(ts1, ts2) {
  if (!ts1 || !ts2) return false
  const d1 = ts1.toDate ? ts1.toDate() : new Date(ts1)
  const d2 = ts2.toDate ? ts2.toDate() : new Date(ts2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

// ─── New Message Modal ────────────────────────────────────────────────────────

function NewMessageModal({ myUid, myProfile, onClose, onSelectConversation }) {
  const [search, setSearch] = useState('')
  const [teammates, setTeammates] = useState([])
  const [loading, setLoading] = useState(true)

  // Org members plus anyone connected by an approved follow
  useEffect(() => {
    loadConnections(myUid, myProfile)
      .then(setTeammates)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [myUid, myProfile])

  const filtered = teammates.filter((t) => {
    const name = (t.preferred_name ?? t.full_name ?? '').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  async function handleSelect(teammate) {
    const convId = await ensureConversation(myUid, myProfile, {
      uid: teammate.uid, name: displayName(teammate), role: teammate.role,
    })
    onSelectConversation(convId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border border-slate-200 w-full sm:max-w-md flex flex-col max-h-[85vh] safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">New Message</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teammates…"
              autoFocus
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Loading teammates…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              {teammates.length === 0 ? 'No teammates yet — follow people in Network to message them.' : 'No results.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((t) => {
                const name = t.preferred_name ?? t.full_name ?? 'Unknown'
                return (
                  <button
                    key={t.uid}
                    onClick={() => handleSelect(t)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-full ${avatarBg(t.role)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{t.role ?? ''}{t.organization ? ` · ${t.organization}` : ''}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Messages Page ───────────────────────────────────────────────────────

export default function Messages() {
  const { profile } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const myUid = auth.currentUser?.uid

  const [conversations, setConversations] = useState([])
  const [selectedConvId, setSelectedConvId] = useState(null)
  const [thread, setThread] = useState({ convId: null, list: [] })
  const [inputText, setInputText] = useState('')
  const [convSearch, setConvSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showChatOnMobile, setShowChatOnMobile] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const navStateHandled = useRef(false)

  // Derived: selected conversation object + its messages
  const selectedConv = conversations.find((c) => c.id === selectedConvId) ?? null
  const messages = thread.convId === selectedConvId ? thread.list : []

  // Other person in the conversation
  function otherParticipant(conv) {
    if (!conv || !myUid) return null
    const otherId = conv.participants.find((p) => p !== myUid)
    return {
      uid: otherId,
      name: conv.participant_names?.[otherId] ?? 'Unknown',
      role: conv.participant_roles?.[otherId] ?? '',
    }
  }

  // ── Subscribe to conversations ─────────────────────────────────────────────
  useEffect(() => {
    if (!myUid) return
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', myUid),
      orderBy('last_message_time', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setConversations(list)
    })
    return () => unsub()
  }, [myUid])

  // ── Subscribe to messages for selected conversation ────────────────────────
  useEffect(() => {
    if (!selectedConvId) return
    const q = query(
      collection(db, 'conversations', selectedConvId, 'messages'),
      orderBy('created_at', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setThread({ convId: selectedConvId, list })
    })
    return () => unsub()
  }, [selectedConvId])

  // ── Reset unread count when conversation is opened ─────────────────────────
  useEffect(() => {
    if (!selectedConvId || !myUid) return
    const conv = conversations.find((c) => c.id === selectedConvId)
    if (conv && (conv.unread_count?.[myUid] ?? 0) > 0) {
      updateDoc(doc(db, 'conversations', selectedConvId), {
        [`unread_count.${myUid}`]: 0,
      }).catch(console.error)
    }
  }, [selectedConvId, myUid, conversations])

  // ── Auto-scroll to bottom on new messages ─────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  // ── Handle navigation state (from Network/Compatibility pages) ─────────────
  useEffect(() => {
    if (navStateHandled.current) return
    const state = location.state
    if (state?.startConversationWith && myUid) {
      navStateHandled.current = true
      const { startConversationWith, teammateName, teammateRole } = state
      // Clear nav state
      navigate('/messages', { replace: true, state: {} })

      ensureConversation(myUid, profile, { uid: startConversationWith, name: teammateName, role: teammateRole })
        .then((convId) => {
          setSelectedConvId(convId)
          setShowChatOnMobile(true)
        })
        .catch(console.error)
    }
  }, [location.state, myUid, profile, navigate])

  // ── Select conversation ────────────────────────────────────────────────────
  function handleSelectConversation(convId) {
    setSelectedConvId(convId)
    setShowChatOnMobile(true)
    inputRef.current?.focus()
  }

  // ── Send message ───────────────────────────────────────────────────────────
  async function handleSend() {
    const text = inputText.trim()
    if (!text || !selectedConvId || !myUid) return

    const conv = conversations.find((c) => c.id === selectedConvId)
    const other = otherParticipant(conv)

    setInputText('')

    try {
      await sendMessage(selectedConvId, myUid, profile, other?.uid, text)
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Filtered conversations ─────────────────────────────────────────────────
  const filteredConvs = conversations.filter((conv) => {
    const other = otherParticipant(conv)
    const name = (other?.name ?? '').toLowerCase()
    return name.includes(convSearch.toLowerCase())
  })

  // ─── Render ────────────────────────────────────────────────────────────────

  const selectedOther = selectedConv ? otherParticipant(selectedConv) : null

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── Left Panel: Conversation List ──────────────────────────────────── */}
      <div className={`
        w-full md:w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col
        ${showChatOnMobile ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Messages 💬</h2>
          <button
            onClick={() => setShowModal(true)}
            title="New message"
            className="p-2 rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            <Edit3 size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <MessageSquare size={32} className="text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">
                {conversations.length === 0
                  ? 'No conversations yet. Message a teammate to get started.'
                  : 'No conversations match your search.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredConvs.map((conv) => {
                const other = otherParticipant(conv)
                const isActive = conv.id === selectedConvId
                const unread = conv.unread_count?.[myUid] ?? 0
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${
                      isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full ${avatarBg(other?.role)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                      {initials(other?.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-700' : 'text-slate-900'}`}>
                          {other?.name ?? 'Unknown'}
                        </p>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {formatConversationTime(conv.last_message_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400 truncate flex-1">
                          {conv.last_message
                            ? (conv.last_sender_id === myUid ? `You: ${conv.last_message}` : conv.last_message)
                            : <span className="italic">No messages yet</span>
                          }
                        </p>
                        {unread > 0 && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                      {other?.role && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{other.role}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Chat View ─────────────────────────────────────────── */}
      <div className={`
        flex-1 flex flex-col h-full overflow-hidden bg-slate-50
        ${showChatOnMobile ? 'flex' : 'hidden md:flex'}
      `}>
        {!selectedConv ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-slate-300" />
            </div>
            <p className="font-semibold text-slate-700 mb-1">No conversation selected</p>
            <p className="text-sm text-slate-400">Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3.5 bg-white border-b border-slate-200 shadow-sm">
              {/* Back button (mobile) */}
              <button
                onClick={() => setShowChatOnMobile(false)}
                className="md:hidden p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              {/* Avatar */}
              <div className={`w-9 h-9 rounded-full ${avatarBg(selectedOther?.role)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                {initials(selectedOther?.name)}
              </div>

              {/* Name / Role */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {selectedOther?.name ?? 'Unknown'}
                </p>
                {selectedOther?.role && (
                  <p className="text-xs text-slate-400 truncate">{selectedOther.role}</p>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-4">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-slate-400">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === myUid
                    const prevMsg = idx > 0 ? messages[idx - 1] : null
                    const showDivider = !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at)

                    return (
                      <div key={msg.id}>
                        {/* Date divider */}
                        {showDivider && msg.created_at && (
                          <div className="flex items-center gap-3 my-3">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-xs text-slate-400 font-medium shrink-0">
                              {formatDateDivider(msg.created_at)}
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>
                        )}

                        {/* Message bubble */}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className="flex flex-col gap-1 max-w-xs">
                            <div className={
                              isMe
                                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5'
                                : 'bg-white border border-slate-200 text-slate-900 rounded-2xl rounded-tl-sm px-4 py-2.5'
                            }>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                            </div>
                            <p className={`text-xs text-slate-400 ${isMe ? 'text-right' : 'text-left'}`}>
                              {formatMessageTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input bar */}
            <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message…"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-medium transition-colors shrink-0 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── New Message Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <NewMessageModal
          myUid={myUid}
          myProfile={profile}
          onClose={() => setShowModal(false)}
          onSelectConversation={(convId) => {
            setSelectedConvId(convId)
            setShowChatOnMobile(true)
          }}
        />
      )}
    </div>
  )
}
