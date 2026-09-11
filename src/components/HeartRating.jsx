import { useState } from 'react'

/** 1–5 hearts. Read-only when `onRate` is omitted. */
export default function HeartRating({ value = 0, onRate, size = 20 }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(shown)
        const icon = (
          <span style={{ fontSize: size }} className="leading-none">{filled ? '❤️' : '🤍'}</span>
        )
        return onRate ? (
          <button
            key={n}
            type="button"
            onClick={() => onRate(n)}
            onMouseEnter={() => setHover(n)}
            className="p-0.5 rounded-md hover:scale-110 transition-transform"
            aria-label={`${n} heart${n > 1 ? 's' : ''}`}
          >
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        )
      })}
    </div>
  )
}
