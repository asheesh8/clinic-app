// Emotional read-out for a similarity score:
//   < 50%  → two arguing pandas
//   50–79% → a friendly handshake
//   ≥ 80%  → a smiley face with hearts floating overhead

function moodFor(score) {
  if (score >= 80) return 'love'
  if (score >= 50) return 'ok'
  return 'argue'
}

const CAPTIONS = {
  love:  'You two are very similar!',
  ok:    'Pretty similar — a few things to talk through',
  argue: 'Lots to talk through — start with the differences below',
}

export default function SimilarityMood({ score, size = 'md', showCaption = false }) {
  if (score === null || score === undefined) return null
  const mood = moodFor(score)
  const text = size === 'sm' ? 'text-2xl' : 'text-4xl'

  return (
    <div className="flex flex-col items-center" role="img" aria-label={CAPTIONS[mood]}>
      {mood === 'love' && (
        <div className="relative inline-flex items-end justify-center pt-4">
          <span className="fs-heart" style={{ left: '0%',  animationDelay: '0s'   }}>❤️</span>
          <span className="fs-heart" style={{ left: '40%', animationDelay: '0.6s' }}>💕</span>
          <span className="fs-heart" style={{ left: '75%', animationDelay: '1.2s' }}>❤️</span>
          <span className={text}>😊</span>
        </div>
      )}
      {mood === 'ok' && <span className={text}>🤝</span>}
      {mood === 'argue' && (
        <div className="inline-flex items-end gap-0.5">
          <span className={`${text} fs-argue-left`}>🐼</span>
          <span className="text-base fs-pop">💢</span>
          <span className="inline-block -scale-x-100">
            <span className={`${text} fs-argue-right`}>🐼</span>
          </span>
        </div>
      )}
      {showCaption && <p className="text-xs text-slate-500 mt-1 text-center">{CAPTIONS[mood]}</p>}
    </div>
  )
}
