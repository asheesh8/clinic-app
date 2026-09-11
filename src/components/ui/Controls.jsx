import { useEffect } from 'react'

export function Toast({ message, onDone, duration = 3500 }) {
  useEffect(() => {
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [onDone, duration])
  const isError = /^(error|failed|could not|please)/i.test(message)
  return (
    <div className={`fixed z-50 bottom-24 left-4 right-4 md:left-auto md:right-6 md:bottom-6 flex items-center justify-center md:justify-start gap-2 text-white px-5 py-3 rounded-2xl shadow-lg ${isError ? 'bg-red-600' : 'bg-emerald-600'}`}>
      <span className="text-lg leading-none">{isError ? '⚠️' : '🎉'}</span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

const pill = (active, activeClass) =>
  `px-4 py-2 sm:py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
    active ? activeClass : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300'
  }`

/** Yes / No toggle. Tapping the selected option again clears it. */
export function YesNo({ value, onChange }) {
  return (
    <div className="flex gap-2 shrink-0">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(value === v ? null : v)}
          className={pill(value === v, v ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white')}
        >
          {v ? '👍 Yes' : '👎 No'}
        </button>
      ))}
    </div>
  )
}

/** Yes / No / Other with a free-text field when Other is chosen. */
export function YesNoOther({ value, onChange, otherLabel = 'Other' }) {
  const choice = value?.choice ?? null
  const set = (c) => onChange({ choice: choice === c ? null : c, other: value?.other ?? '' })
  return (
    <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
      <div className="flex gap-2">
        <button type="button" onClick={() => set('yes')}   className={pill(choice === 'yes', 'bg-blue-600 text-white')}>👍 Yes</button>
        <button type="button" onClick={() => set('no')}    className={pill(choice === 'no', 'bg-slate-600 text-white')}>👎 No</button>
        <button type="button" onClick={() => set('other')} className={pill(choice === 'other', 'bg-amber-500 text-white')}>✏️ Other</button>
      </div>
      {choice === 'other' && (
        <input
          type="text"
          value={value?.other ?? ''}
          onChange={(e) => onChange({ choice: 'other', other: e.target.value })}
          placeholder={otherLabel}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  )
}

export function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? '' : opt)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            value === opt
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export function MultiSelect({ options, value = [], onChange }) {
  const toggle = (opt) => onChange(value.includes(opt) ? value.filter((o) => o !== opt) : [...value, opt])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
            value.includes(opt)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/**
 * "Mark all Yes" shortcut for long yes/no lists (like select-all in Gmail).
 * `values` is the current { id: bool|null } map for the list.
 */
export function BulkYesBar({ values, onSetAll, label = 'Mark all Yes' }) {
  const vals    = Object.values(values)
  const allYes  = vals.length > 0 && vals.every((v) => v === true)
  const anySet  = vals.some((v) => v === true || v === false)
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 mb-2 rounded-xl bg-slate-50 border border-slate-100">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allYes}
          onChange={(e) => onSetAll(e.target.checked ? true : null)}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        ✅ {label}
      </label>
      {anySet && (
        <button
          type="button"
          onClick={() => onSetAll(null)}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  )
}

const inputClass = 'px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500'

/**
 * Renders one question from profileQuestions.js. `answers` is the flat map
 * of values; `onChange(id, value)` updates one key.
 */
export function QuestionField({ q, answers, onChange }) {
  const value = answers[q.id]
  if (q.type === 'yesno') {
    return (
      <div className="py-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          <span className="text-sm text-slate-700 leading-snug flex-1 pt-1">{q.label}</span>
          <YesNo value={value ?? null} onChange={(v) => onChange(q.id, v)} />
        </div>
        {q.whyWhenYes && value === true && (
          <input
            type="text"
            value={answers[`${q.id}_why`] ?? ''}
            onChange={(e) => onChange(`${q.id}_why`, e.target.value)}
            placeholder="If yes, why?"
            className={`${inputClass} mt-2 w-full`}
          />
        )}
      </div>
    )
  }
  return (
    <div className="py-3 space-y-2">
      <p className="text-sm text-slate-700 leading-snug">{q.label}</p>
      {q.type === 'choice' && (
        <RadioGroup options={q.options} value={value ?? ''} onChange={(v) => onChange(q.id, v)} />
      )}
      {q.type === 'multi' && (
        <MultiSelect options={q.options} value={value ?? []} onChange={(v) => onChange(q.id, v)} />
      )}
      {q.type === 'text' && (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(q.id, e.target.value)}
          className={`${inputClass} w-full`}
        />
      )}
      {(q.type === 'number' || q.type === 'percent') && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={q.type === 'percent' ? 100 : 99}
            value={value ?? ''}
            onChange={(e) => onChange(q.id, e.target.value === '' ? null : Number(e.target.value))}
            className={`${inputClass} w-24`}
          />
          {q.type === 'percent' && <span className="text-sm text-slate-500">%</span>}
        </div>
      )}
    </div>
  )
}
