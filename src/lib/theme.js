// User-selectable accent colors ("colorways"). The app is styled with
// Tailwind's blue-* classes; index.css re-derives every blue shade from
// --accent whenever <html data-accent> is set, so one hex recolors everything.

export const DEFAULT_ACCENT = '#2563eb'

export const COLORWAYS = [
  { id: 'blue',     name: 'Ocean Blue',      emoji: '🌊', hex: '#2563eb' },
  { id: 'orange',   name: 'Sunset Orange',   emoji: '🍊', hex: '#ea580c' },
  { id: 'green',    name: 'Forest Green',    emoji: '🌲', hex: '#16a34a' },
  { id: 'yellow',   name: 'Sunshine Yellow', emoji: '🌻', hex: '#ca8a04' },
  { id: 'purple',   name: 'Grape Purple',    emoji: '🍇', hex: '#7c3aed' },
  { id: 'pink',     name: 'Bubblegum Pink',  emoji: '🌸', hex: '#db2777' },
  { id: 'red',      name: 'Cherry Red',      emoji: '🍒', hex: '#dc2626' },
  { id: 'teal',     name: 'Lagoon Teal',     emoji: '🐬', hex: '#0d9488' },
  { id: 'indigo',   name: 'Midnight Indigo', emoji: '🌌', hex: '#4f46e5' },
  { id: 'brown',    name: 'Coffee Brown',    emoji: '☕', hex: '#92400e' },
  { id: 'graphite', name: 'Graphite',        emoji: '🖤', hex: '#334155' },
]

const STORAGE_KEY = 'flowsync_accent'
const HEX_RE = /^#[0-9a-f]{6}$/i

export function isValidHex(hex) {
  return typeof hex === 'string' && HEX_RE.test(hex)
}

/** Apply an accent color to the whole app right now. */
export function applyAccent(hex) {
  const root = document.documentElement
  if (!isValidHex(hex) || hex.toLowerCase() === DEFAULT_ACCENT) {
    root.removeAttribute('data-accent')
    root.style.removeProperty('--accent')
  } else {
    root.setAttribute('data-accent', '')
    root.style.setProperty('--accent', hex)
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isValidHex(hex) ? hex : DEFAULT_ACCENT)
}

export function savedAccent() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return isValidHex(v) ? v : null
  } catch {
    return null
  }
}

export function rememberAccent(hex) {
  try {
    localStorage.setItem(STORAGE_KEY, hex)
  } catch {
    // Private mode etc. — the Firestore copy still syncs it.
  }
}
