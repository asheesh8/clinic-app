import { useState, useRef, useEffect } from 'react'
import { Building2, ChevronDown } from 'lucide-react'
import { searchOrganizations } from '../lib/vermontOrganizations'

const TYPE_COLORS = {
  'Hospital':               'bg-blue-100 text-blue-700',
  'Community Health Center':'bg-teal-100 text-teal-700',
  'Primary Care':           'bg-violet-100 text-violet-700',
  'Urgent Care':            'bg-orange-100 text-orange-700',
  'Home Health / VNA':      'bg-cyan-100 text-cyan-700',
  'Skilled Nursing':        'bg-slate-100 text-slate-600',
}

/** Organization search box with suggestions; free text is always allowed. */
export default function OrgCombobox({ value, onChange, placeholder = 'Search clinics or type any team name…' }) {
  const [query, setQuery]             = useState(value || '')
  const [prevValue, setPrevValue]     = useState(value)
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen]               = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const wrapperRef                    = useRef(null)
  const inputRef                      = useRef(null)

  // Keep query in sync if parent resets value
  if (value !== prevValue) {
    setPrevValue(value)
    setQuery(value || '')
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = (e) => {
    const q = e.target.value
    setQuery(q)
    onChange(q) // keep free-text in sync
    const results = searchOrganizations(q, 8)
    setSuggestions(results)
    setOpen(results.length > 0)
    setHighlighted(-1)
  }

  const selectSuggestion = (org) => {
    const label = `${org.name} — ${org.city}`
    setQuery(label)
    onChange(label)
    setSuggestions([])
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, -1))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Building2
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2) {
              const results = searchOrganizations(query, 8)
              setSuggestions(results)
              setOpen(results.length > 0)
            }
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition"
          placeholder={placeholder}
          autoComplete="off"
        />
        {query && (
          <ChevronDown
            size={15}
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
      </div>

      {open && (
        <ul className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((org, i) => (
            <li
              key={`${org.name}-${org.city}`}
              onMouseDown={() => selectSuggestion(org)}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                highlighted === i ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <Building2 size={14} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{org.name}</p>
                <p className="text-xs text-slate-500">{org.city}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[org.type] ?? 'bg-slate-100 text-slate-500'}`}>
                {org.type}
              </span>
            </li>
          ))}
          {/* Always allow free-text "not listed" option */}
          <li
            onMouseDown={() => {
              setOpen(false)
              // keep whatever the user typed
            }}
            className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500 hover:bg-slate-50 cursor-pointer"
          >
            <span className="text-slate-400">✎</span>
            Use "<span className="font-medium text-slate-700">{query}</span>" as-is
          </li>
        </ul>
      )}
    </div>
  )
}
