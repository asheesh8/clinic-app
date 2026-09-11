import { useState, useEffect } from 'react'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { X, Search, Send, Check } from 'lucide-react'
import { db } from '../lib/firebase'
import { loadConnections, displayName, initials, avatarBg } from '../lib/people'
import { ensureConversation, sendMessage } from '../lib/messaging'

/**
 * Send a copy of a custom workflow template to people. They get access to
 * the template and a message asking them to fill it out so you can compare.
 */
export default function ShareTemplateModal({ template, myUid, myProfile, onClose, onShared }) {
  const [people, setPeople]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [picked, setPicked]   = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    loadConnections(myUid, myProfile)
      .then(setPeople)
      .catch((err) => { console.error(err); setError('Could not load your teammates.') })
      .finally(() => setLoading(false))
  }, [myUid, myProfile])

  const already  = new Set(template.shared_with ?? [])
  const filtered = people.filter((p) => displayName(p).toLowerCase().includes(search.toLowerCase()))
  const toggle   = (id) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  async function share() {
    if (picked.length === 0) return
    setSending(true)
    setError('')
    try {
      await updateDoc(doc(db, 'custom_workflows', template.id), { shared_with: arrayUnion(...picked) })
      const text = `📋 I shared my workflow template "${template.name}" with you. Open Workflows and fill it out so we can see our similarity score.`
      await Promise.all(picked.map(async (id) => {
        const p = people.find((x) => x.uid === id)
        const convId = await ensureConversation(myUid, myProfile, { uid: id, name: displayName(p), role: p?.role })
        await sendMessage(convId, myUid, myProfile, id, text)
      }))
      onShared?.(picked)
      onClose()
    } catch (err) {
      console.error(err)
      setError('Sharing failed — please try again.')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border border-slate-200 w-full sm:max-w-md flex flex-col max-h-[85vh] safe-bottom">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">Share template</h3>
            <p className="text-xs text-slate-400 truncate">{template.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people…"
              autoFocus
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              {people.length === 0 ? 'Follow people or join an organization to share with them.' : 'No results.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const name = displayName(p)
                const on   = picked.includes(p.uid)
                const done = already.has(p.uid)
                return (
                  <button
                    key={p.uid}
                    onClick={() => !done && toggle(p.uid)}
                    disabled={done}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left disabled:opacity-60"
                  >
                    <div className={`w-9 h-9 rounded-full ${avatarBg(p.role)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{done ? 'Already shared' : (p.role ?? '')}</p>
                    </div>
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {on && <Check size={13} className="text-white" />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-xs text-red-500">{error}</p>
          <button
            onClick={share}
            disabled={picked.length === 0 || sending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} /> {sending ? 'Sharing…' : `Share${picked.length ? ` with ${picked.length}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
