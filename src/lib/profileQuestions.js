// Profile questionnaire definitions shared by the Profile editor and the
// read-only person view. Ids are Firestore field keys — don't rename them.

export const TITLE_OPTIONS = [
  'Doctor',
  'Nurse',
  'APRN',
  'Nurse Practitioner',
  'PCP',
  'First Name Only',
  'Last Name Only',
  'First + Title',
  'Last + Title',
  'Other',
]

export const PRONOUN_OPTIONS = [
  'he/him/his',
  'she/her/hers',
  'they/them/theirs',
  'Other',
]

export const VISIBILITY_OPTIONS = [
  { id: 'private', label: '🔒 Private',      desc: 'Only people you approve can see your profile details.' },
  { id: 'org',     label: '🏥 Organization', desc: 'Everyone in your organization, plus people you approve.' },
  { id: 'public',  label: '🌎 Public',       desc: 'Anyone on FlowSync can find you, view your profile, and follow you.' },
]

export const WORK_PREFS = [
  { id: 'prefer_same_location',        label: 'Prefer same location daily' },
  { id: 'prefer_same_team_member',     label: 'Prefer same team member daily' },
  { id: 'prefer_designated_desk',      label: 'Prefer designated desk/work area' },
  { id: 'ok_working_late',             label: 'OK working late or past scheduled end time' },
  { id: 'prefer_come_in_early',        label: 'Prefer to come in early' },
  { id: 'satisfied_admin_time',        label: 'Satisfied with current admin/documentation time' },
  { id: 'have_enough_support_staff',   label: 'Have enough support staff' },
  { id: 'ok_discuss_workflow_diffs',   label: 'Do you mind discussing workflow differences with teammates' },
]

export const WORKSPACE_COMFORTS = [
  { id: 'ergonomic_desk',              label: 'Ergonomic desk' },
  { id: 'ergonomic_chair',             label: 'Ergonomic chair' },
  { id: 'staff_kitchen_access',        label: 'Staff kitchen access' },
  { id: 'fridge_in_kitchen',           label: 'Fridge in staff kitchen' },
  { id: 'designated_staff_dining',     label: 'Designated staff dining area' },
  { id: 'coffee_tea_machine',          label: 'Coffee/tea machine' },
  { id: 'separate_staff_bathroom',     label: 'Separate staff bathroom' },
  { id: 'designated_staff_parking',    label: 'Designated staff parking' },
]

export const VEHICLE_OPTIONS = ['Larger', 'Standard']

export const DESK_ITEMS = [
  { id: 'desk_organizer',              label: 'Desk organizer' },
  { id: 'desk_drawer',                 label: 'Drawer' },
  { id: 'stapler',                     label: 'Stapler' },
  { id: 'paperclip_holder',            label: 'Paperclip holder' },
  { id: 'pen_pencil_holder',           label: 'Pen/pencil holder' },
  { id: 'single_monitor',              label: 'Single monitor' },
  { id: 'dual_monitors',               label: 'Dual monitors' },
]

export const EXAM_ROOM_ITEMS = [
  { id: 'sink_in_room',                label: 'Sink in room' },
  { id: 'hand_soap',                   label: 'Hand soap' },
  { id: 'hand_sanitizer',              label: 'Hand sanitizer' },
  { id: 'surgical_n95_masks',          label: 'Surgical/N95 masks' },
  { id: 'paper_towels',                label: 'Paper towels' },
  { id: 'standard_exam_table',         label: 'Standard exam table' },
  { id: 'height_adjustable_table',     label: 'Height-adjustable electric table' },
  { id: 'chair_patient_guest',         label: 'Chair for patient/guest' },
  { id: 'desktop_computer',            label: 'Desktop computer' },
  { id: 'laptop',                      label: 'Laptop' },
  { id: 'sphygmomanometer',            label: 'Sphygmomanometer' },
  { id: 'large_bp_cuff',               label: 'Large BP cuff' },
  { id: 'ophthalmoscope',              label: 'Ophthalmoscope' },
  { id: 'otoscope',                    label: 'Otoscope' },
  { id: 'tuning_fork',                 label: 'Tuning fork' },
  { id: 'reflex_hammer',               label: 'Reflex hammer' },
  { id: 'microfilament',               label: 'Microfilament' },
  { id: 'tongue_depressors',           label: 'Tongue depressors' },
  { id: 'assorted_bandaids',           label: 'Assorted bandaids' },
  { id: 'surgical_scissors',           label: 'Surgical scissors' },
  { id: 'forceps',                     label: 'Forceps' },
  { id: 'gauze_4x4',                   label: '4x4 gauze' },
  { id: 'cloth_tape',                  label: 'Cloth tape' },
  { id: 'antibiotic_ointment',         label: 'Antibiotic ointment' },
  { id: 'coban_wrap',                  label: 'Coban wrap' },
  { id: 'isopropyl_alcohol',           label: 'Isopropyl alcohol' },
  { id: 'betadine_swabs',              label: 'Betadine swabs' },
  { id: 'patient_gowns',               label: 'Patient gowns' },
  { id: 'draping_cloths',              label: 'Draping cloths' },
  { id: 'standard_towels',             label: 'Standard towels' },
  { id: 'designated_chaperone',        label: 'Designated chaperone' },
  { id: 'nursing_assist_procedures',   label: 'Nursing assist with procedures' },
]

// ─── Procedures ──────────────────────────────────────────────────────────────
// Every item is answered Yes / No / Other; "Other" takes a free-text amount.

export const PROCEDURE_SECTIONS = [
  {
    id: 'joint_supplies',
    title: '🦵 Joint Injections — Supplies',
    items: [
      { id: 'joint_syringe_5cc',      label: '5cc syringe',                    otherLabel: 'Other syringe size' },
      { id: 'joint_needle_25g_1in',   label: '25 gauge 1 inch needle',         otherLabel: 'Other gauge/length' },
      { id: 'joint_needle_25g_15in',  label: '25 gauge 1½ inch needle',        otherLabel: 'Other gauge/length' },
    ],
  },
  {
    id: 'hip',
    title: '🦴 Hip Mixture',
    items: [
      { id: 'hip_kenalog',            label: '1ml of 40 mg/ml Kenalog',        otherLabel: 'Other amount' },
      { id: 'hip_bupivacaine',        label: '1ml of 0.5% bupivacaine',        otherLabel: 'Other amount' },
    ],
  },
  {
    id: 'shoulder',
    title: '💪 Glenohumeral (Shoulder) Joint',
    items: [
      { id: 'shoulder_kenalog',       label: '1ml of 40 mg/ml Kenalog',        otherLabel: 'Other amount' },
      { id: 'shoulder_bupivacaine',   label: '1ml of 0.5% bupivacaine',        otherLabel: 'Other amount' },
    ],
  },
  {
    id: 'knee',
    title: '🦵 Knee',
    items: [
      { id: 'knee_kenalog',           label: '1ml of 40 mg/ml Kenalog',        otherLabel: 'Other amount' },
      { id: 'knee_bupivacaine',       label: '1ml of 0.5% bupivacaine',        otherLabel: 'Other amount' },
    ],
  },
  {
    id: 'trigger_points',
    title: '🎯 Trigger Points (5–10)',
    items: [
      { id: 'tp_syringe_10cc',        label: '10cc syringe',                   otherLabel: 'Other syringe size' },
      { id: 'tp_kenalog',             label: '2ml of 40 mg/ml Kenalog',        otherLabel: 'Other amount' },
      { id: 'tp_dexamethasone',       label: '2ml of 10 mg/ml dexamethasone',  otherLabel: 'Other amount' },
      { id: 'tp_bupivacaine',         label: '3ml of 0.5% bupivacaine',        otherLabel: 'Other amount' },
    ],
  },
]

export const FOLLOWUP_WEEK_OPTIONS = ['1 week', '2 weeks', '3 weeks', '4 weeks']  // shown with 📅

/**
 * Convert the pre-September procedure fields (free-text amounts and radio
 * picks) into the { choice, other } shape used now.
 */
export function legacyProcedures(d) {
  const out = {}
  const fromAmount = (id, value, defaultValue) => {
    if (!value) return
    out[id] = value === defaultValue ? { choice: 'yes', other: '' } : { choice: 'other', other: value }
  }
  fromAmount('hip_kenalog',          d.hip_kenalog,          '1ml')
  fromAmount('hip_bupivacaine',      d.hip_bupivacaine,      '1ml')
  fromAmount('shoulder_kenalog',     d.shoulder_kenalog,     '1ml')
  fromAmount('shoulder_bupivacaine', d.shoulder_bupivacaine, '1ml')
  fromAmount('knee_kenalog',         d.knee_kenalog,         '1ml')
  fromAmount('knee_bupivacaine',     d.knee_bupivacaine,     '1ml')
  fromAmount('tp_kenalog',           d.tp_kenalog,           '2ml')
  fromAmount('tp_dexamethasone',     d.tp_dexamethasone,     '2ml')
  fromAmount('tp_bupivacaine',       d.tp_bupivacaine,       '3ml')

  if (d.proc_joint_syringe) {
    out.joint_syringe_5cc = d.proc_joint_syringe === '5cc'
      ? { choice: 'yes', other: '' }
      : { choice: 'other', other: d.proc_joint_syringe === 'Other' ? (d.proc_joint_syringe_other ?? '') : d.proc_joint_syringe }
  }
  if (d.tp_syringe) {
    out.tp_syringe_10cc = d.tp_syringe === '10cc'
      ? { choice: 'yes', other: '' }
      : { choice: 'other', other: d.tp_syringe === 'Other' ? (d.tp_syringe_other ?? '') : d.tp_syringe }
  }
  if (Array.isArray(d.proc_needle_options) && d.proc_needle_options.length > 0) {
    const opts = d.proc_needle_options
    out.joint_needle_25g_1in  = { choice: opts.includes('25g × 1 inch') ? 'yes' : 'no', other: '' }
    out.joint_needle_25g_15in = { choice: opts.includes('25g × 1½ inch') ? 'yes' : 'no', other: '' }
    if (opts.includes('Other') && d.proc_needle_other) {
      out.joint_needle_25g_1in = { choice: 'other', other: d.proc_needle_other }
    }
  }
  return out
}

// ─── Schedule & communication ────────────────────────────────────────────────
// `roles` limits a section to a workflow role; `pairs` links a nursing
// question to the matching provider question for similarity scoring.

export const MESSAGING_APPS = [
  'Microsoft Teams',
  'Slack',
  'Epic Secure Chat',
  'TigerConnect',
  'Vocera',
  'Text / SMS',
  'Email',
]

export const WORK_STYLE_SECTIONS = [
  {
    title: '☀️ Daily Routine',
    items: [
      { id: 'print_daily_schedule', type: 'yesno', label: '🖨️ Do you like to print out a daily schedule for the day?' },
      { id: 'print_face_sheets',    type: 'yesno', label: '📄 Do you like face sheets of each patient?' },
      { id: 'morning_huddle',       type: 'yesno', label: '🗣️ Do you like a morning huddle for team members at the beginning of the shift?' },
    ],
  },
  {
    title: '💬 Communication',
    items: [
      { id: 'msg_via_app',          type: 'yesno',  label: '📱 Do you prefer to message each other via Microsoft Teams or a similar app?' },
      { id: 'msg_verbal',           type: 'yesno',  label: '🗣️ Do you prefer to communicate verbally?' },
      { id: 'msg_other',            type: 'text',   label: '✉️ Other means of communication you prefer?' },
      { id: 'msg_apps_used',        type: 'multi',  label: '🧰 Which messaging apps have you worked with?', options: MESSAGING_APPS },
      { id: 'msg_app_preferred',    type: 'choice', label: '⭐ Which one do you prefer to work with?', options: [...MESSAGING_APPS, 'No preference'] },
    ],
  },
  {
    title: '🗓️ Schedule',
    roles: ['provider'],
    items: [
      { id: 'max_physicals_am',     type: 'number', label: '🌅 How many physical exams do you like as a maximum on your morning schedule?' },
      { id: 'max_physicals_pm',     type: 'number', label: '🌇 How many physical exams do you like as a maximum on your afternoon schedule?' },
    ],
  },
  {
    title: 'Clinical Skills',
    roles: ['provider'],
    items: [
      { id: 'want_nurse_blood_draws', type: 'yesno', pairs: 'blood_draws', label: '🩸 Would you like your nurse to be skilled in blood draws?' },
    ],
  },
  {
    title: 'Clinical Skills',
    roles: ['nursing'],
    items: [
      { id: 'does_blood_draws',     type: 'yesno', pairs: 'blood_draws', label: '🩸 Do you do blood draws?' },
    ],
  },
]

/** Sections that apply to a workflow role (null role = show everything). */
export function workStyleSectionsFor(workflowRole) {
  return WORK_STYLE_SECTIONS.filter((s) => !s.roles || !workflowRole || s.roles.includes(workflowRole))
}

// ─── Teamwork & personality ("About Me") ─────────────────────────────────────

export const ABOUT_QUESTIONS = [
  { id: 'detail_oriented',   type: 'yesno', label: '🔍 Are you a detail-oriented person?' },
  { id: 'improve_team',      type: 'yesno', label: '📈 Do you try to look for ways to improve your team?' },
  { id: 'helpful_person',    type: 'yesno', label: '🙌 Do you consider yourself a helpful person to others?' },
  { id: 'backstab',          type: 'yesno', label: '🔪 Do you have tendencies to back-stab fellow employees?' },
  {
    id: 'under_the_bus', type: 'yesno', whyWhenYes: true,
    label: '🚌 Are you the type of person who would throw a teammate or coworker under the bus?',
  },
  {
    id: 'work_ethic', type: 'choice', label: '🏋️ Do you consider yourself to be:',
    options: ['💪 A hard worker', '🛋️ On the lazy side — I like to sit in place', "⚖️ I'm in between"],
  },
  {
    id: 'mistakes', type: 'choice', label: '🪞 Do you blame others or take ownership of mistakes?',
    options: ['🙋 Take ownership', '👉 Blame others'],
  },
  {
    id: 'handle_change', type: 'choice', label: '🌪️ How well do you handle unexpected changes?',
    options: ['😰 1 — Not well', '😐 2 — Sometimes', '😎 3 — Well'],
  },
  {
    id: 'feedback_view', type: 'choice', label: '🗨️ Do you consider feedback an attack or a learning point?',
    options: ['📚 A learning point', '⚔️ An attack', '🤷 Neither'],
  },
  {
    id: 'meetings_bring', type: 'choice', label: '🧑‍🤝‍🧑 Are you more likely to bring complaints or solutions to meetings?',
    options: ['💡 Solutions', '😤 Complaints'],
  },
  { id: 'talk_complaining_pct',     type: 'percent', label: '😩 What percentage of your daily talk is complaining?' },
  { id: 'talk_problem_solving_pct', type: 'percent', label: '🧩 What percentage of your daily talk involves problem solving?' },
  { id: 'good_day',          type: 'text',  label: '🌈 What is your idea of a good day at work?' },
  { id: 'has_pets',          type: 'yesno', label: '🐶 Do you have any pets?' },
  { id: 'favorite_color',    type: 'text',  label: '🎨 What is your favorite color?' },
]

/** Format an answer for read-only display. Returns '' when unanswered. */
export function formatAnswer(q, value, why) {
  if (value === null || value === undefined || value === '') return ''
  if (q.type === 'yesno') {
    const base = value ? 'Yes' : 'No'
    return value && why ? `${base} — ${why}` : base
  }
  if (q.type === 'multi') return Array.isArray(value) ? value.join(', ') : ''
  if (q.type === 'percent') return `${value}%`
  return String(value)
}
