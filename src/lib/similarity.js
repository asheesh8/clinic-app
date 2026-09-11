// Pure scoring helpers for the Similarity page.
import { canonicalTaskId, parseTiming, phaseMinutes } from './workflowData'
import { WORK_STYLE_SECTIONS } from './profileQuestions'

function isAnswered(v) {
  return v === true || v === false
}

function indexTasks(phases) {
  const map = new Map()
  phases.forEach((p) => p.tasks.forEach((t) => {
    map.set(canonicalTaskId(t.id), { id: t.id, label: t.label, phase: p.phase })
  }))
  return map
}

function roundHalf(n) {
  return Math.round(n * 2) / 2
}

/**
 * Similarity between two filled-out workflows. Compares every task both
 * people answered (nursing and provider versions of the same step count as
 * the same task) plus the section time intervals both people weighed in on.
 */
export function computeSimilarity(myPhases, myDoc, theirPhases, theirDoc) {
  const myAnswers    = myDoc?.answers ?? {}
  const theirAnswers = theirDoc?.answers ?? {}
  const myPT         = myDoc?.phase_times ?? {}
  const theirPT      = theirDoc?.phase_times ?? {}
  const theirTasks   = indexTasks(theirPhases)
  const items        = []

  myPhases.forEach((phase) => {
    phase.tasks.forEach((t) => {
      const key   = canonicalTaskId(t.id)
      const other = theirTasks.get(key)
      if (!other) return
      const mine   = myAnswers[t.id]?.selected
      const theirs = theirAnswers[other.id]?.selected
      if (!isAnswered(mine) || !isAnswered(theirs)) return
      items.push({ kind: 'task', key, label: t.label, phase: phase.phase, mine, theirs, agree: mine === theirs })
    })

    const theirPhase = theirPhases.find((p) => p.phase === phase.phase)
    if (theirPhase && parseTiming(phase.timing) && isAnswered(myPT[phase.phase]?.agree) && isAnswered(theirPT[phase.phase]?.agree)) {
      const mine   = phaseMinutes(phase, myAnswers, myPT)
      const theirs = phaseMinutes(theirPhase, theirAnswers, theirPT)
      items.push({
        kind: 'time', key: `time:${phase.phase}`, label: `Time for ${phase.phase}`, phase: phase.phase,
        mine, theirs, agree: Math.abs(mine - theirs) <= 1,
      })
    }
  })

  if (items.length === 0) return { score: null, total: 0, matched: 0, items }
  const matched = items.filter((i) => i.agree).length
  return { score: Math.round((matched / items.length) * 100), total: items.length, matched, items }
}

/**
 * Merge two people's workflows into one hybrid workflow:
 *   both    — you both do/want it
 *   discuss — you disagree; talk it through
 *   mine / theirs — only one of you answered Yes
 * Section times are averaged when both people have a preference.
 */
export function buildHybrid(myPhases, myDoc, theirPhases, theirDoc) {
  const myAnswers    = myDoc?.answers ?? {}
  const theirAnswers = theirDoc?.answers ?? {}
  const myPT         = myDoc?.phase_times ?? {}
  const theirPT      = theirDoc?.phase_times ?? {}
  const theirTasks   = indexTasks(theirPhases)
  const myKeys       = new Set(myPhases.flatMap((p) => p.tasks.map((t) => canonicalTaskId(t.id))))

  const phaseNames = [...new Set([...myPhases.map((p) => p.phase), ...theirPhases.map((p) => p.phase)])]

  const phases = phaseNames.map((name) => {
    const mp = myPhases.find((p) => p.phase === name)
    const tp = theirPhases.find((p) => p.phase === name)
    const myMin    = mp ? phaseMinutes(mp, myAnswers, myPT) : null
    const theirMin = tp ? phaseMinutes(tp, theirAnswers, theirPT) : null
    const minutes  = myMin != null && theirMin != null ? roundHalf((myMin + theirMin) / 2) : (myMin ?? theirMin)

    const tasks = []
    mp?.tasks.forEach((t) => {
      const key    = canonicalTaskId(t.id)
      const other  = theirTasks.get(key)
      const mine   = myAnswers[t.id]?.selected
      const theirs = other ? theirAnswers[other.id]?.selected : undefined
      let status = null
      if (mine === true && theirs === true) status = 'both'
      else if (isAnswered(mine) && isAnswered(theirs) && mine !== theirs) status = 'discuss'
      else if (mine === true) status = 'mine'
      else if (theirs === true) status = 'theirs'
      if (status) tasks.push({ key, label: t.label, status })
    })
    tp?.tasks.forEach((t) => {
      const key = canonicalTaskId(t.id)
      if (myKeys.has(key)) return
      if (theirAnswers[t.id]?.selected === true) tasks.push({ key, label: t.label, status: 'theirs' })
    })

    return { name, minutes, myMinutes: myMin, theirMinutes: theirMin, tasks }
  }).filter((p) => p.tasks.length > 0 || p.minutes)

  // Nursing and provider sections run in parallel during one visit, so the
  // hybrid length is the average of each person's total, not the sum of all sections.
  const myTotal    = myPhases.reduce((s, p) => s + (phaseMinutes(p, myAnswers, myPT) ?? 0), 0)
  const theirTotal = theirPhases.reduce((s, p) => s + (phaseMinutes(p, theirAnswers, theirPT) ?? 0), 0)
  const totalMinutes = myTotal && theirTotal ? roundHalf((myTotal + theirTotal) / 2) : (myTotal || theirTotal)
  return { phases, totalMinutes }
}

/**
 * Compare Schedule & Communication yes/no answers, pairing nursing and
 * provider questions that ask about the same thing (e.g. blood draws).
 */
export function compareWorkStyle(mine = {}, theirs = {}) {
  const groups = new Map()
  WORK_STYLE_SECTIONS.forEach((s) => s.items.forEach((q) => {
    if (q.type !== 'yesno') return
    const key = q.pairs ?? q.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(q)
  }))

  const items = []
  groups.forEach((qs, key) => {
    const myQ    = qs.find((q) => isAnswered(mine[q.id]))
    const theirQ = qs.find((q) => isAnswered(theirs[q.id]))
    if (!myQ || !theirQ) return
    const a = mine[myQ.id]
    const b = theirs[theirQ.id]
    items.push({ key, myLabel: myQ.label, theirLabel: theirQ.label, mine: a, theirs: b, agree: a === b })
  })
  if (items.length === 0) return { score: null, total: 0, matched: 0, items }
  const matched = items.filter((i) => i.agree).length
  return { score: Math.round((matched / items.length) * 100), total: items.length, matched, items }
}
