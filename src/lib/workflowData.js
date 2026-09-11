// Workflow phase and task definitions for all visit types and roles.
// Each task has a unique id (used as Firestore answer key) and a label.
// A phase with a `timing` string asks "Do you agree with this time interval?"
// at the section level. Tasks may set `askTimeWhenNo` to ask for a preferred
// number of minutes when answered "No".

export const VISIT_TYPES = [
  { id: 'standard_30min',   label: '30-Min Primary Care Visit',       emoji: '🩺', available: true  },
  { id: 'joint_injection',  label: 'Joint Injection Visit',           emoji: '💉', available: true  },
  { id: 'new_patient',      label: 'New Patient Visit',               emoji: '📋', available: true  },
  { id: 'awv',              label: 'Medicare Annual Wellness (AWV)',   emoji: '🏥', available: true  },
  { id: 'omt',              label: 'OMT Visit',                       emoji: '🖐', available: true  },
]

export const ROLES = [
  { id: 'nursing',   label: 'Nursing',   desc: 'MA, LPN, RN, or clinical support staff' },
  { id: 'provider',  label: 'Provider',  desc: 'MD, DO, APRN, NP, or PA' },
]

/**
 * Maps a user's registered profile role to their workflow role.
 * Returns 'nursing' | 'provider' | null (null = ambiguous, show picker).
 */
export const PROFILE_TO_WORKFLOW_ROLE = {
  'Physician':                 'provider',
  'Nurse Practitioner':        'provider',
  'APRN':                      'provider',
  'Physician Assistant':       'provider',
  'Registered Nurse':          'nursing',
  'Licensed Practical Nurse':  'nursing',
  'Medical Assistant':         'nursing',
  'Office / Admin Staff':      null,
  'Non-clinical Team Member':  null,
  'Other':                     null,
}

/** A friendly emoji for a workflow section, based on its name. */
const PHASE_EMOJIS = [
  [/before|pre-visit/i, '🚪'], [/rooming|vitals/i, '🛏️'], [/history|complaint/i, '📝'],
  [/preventive|screening/i, '🛡️'], [/notification/i, '📣'], [/risk assessment/i, '📊'],
  [/structural|exam/i, '🩺'], [/after|exit/i, '👋'], [/turnover/i, '🧹'], [/documentation|coding/i, '📄'],
  [/timing/i, '⏱️'], [/omt/i, '🖐️'], [/procedure/i, '💉'], [/education/i, '🎓'], [/consent/i, '✍️'],
  [/follow-up/i, '📅'], [/opening/i, '🤝'], [/assessment|plan|diagnosis/i, '🧠'],
]

export function phaseEmoji(name) {
  return PHASE_EMOJIS.find(([re]) => re.test(name))?.[1] ?? '📌'
}

export const PROFILE_ROLES = Object.keys(PROFILE_TO_WORKFLOW_ROLE)

export function inferWorkflowRole(profileRole) {
  return PROFILE_TO_WORKFLOW_ROLE[profileRole] ?? null
}

/**
 * Nursing and provider task ids differ only by a role marker in the prefix
 * (e.g. `s30n_hx_hpi` vs `s30p_hx_hpi`). Stripping it lets a nurse's answers
 * be compared against a provider's answers for the same step.
 */
const ROLE_PREFIXES = {
  s30n: 's30', s30p: 's30',
  jin: 'ji',   jip: 'ji',
  npn: 'np',   npp: 'np',
  awvn: 'awv', awvp: 'awv',
  omtn: 'omt', omtp: 'omt',
}

export function canonicalTaskId(taskId) {
  const i = taskId.indexOf('_')
  if (i < 0) return taskId
  const prefix = taskId.slice(0, i)
  return (ROLE_PREFIXES[prefix] ?? prefix) + taskId.slice(i)
}

/**
 * Parse a timing string like "2–3 min" or "5 min" into minutes.
 * Returns { min, max, mid } or null when there is no timing.
 */
export function parseTiming(timing) {
  if (!timing) return null
  const nums = timing.match(/\d+(\.\d+)?/g)?.map(Number) ?? []
  if (nums.length === 0) return null
  const min = nums[0]
  const max = nums[1] ?? nums[0]
  return { min, max, mid: (min + max) / 2 }
}

/**
 * Minutes a person wants for a phase: their preferred time when they
 * disagreed with the typical interval, otherwise the typical midpoint.
 * For phases without a typical interval (custom templates) this is the sum
 * of the "time desired" on tasks they answered Yes.
 */
export function phaseMinutes(phase, answers = {}, phaseTimes = {}) {
  const typical = parseTiming(phase.timing)
  const pt = phaseTimes[phase.phase]
  if (typical) {
    if (pt?.agree === false && Number.isFinite(pt.preferred_min)) return pt.preferred_min
    return typical.mid
  }
  const taskSum = phase.tasks.reduce((sum, t) => {
    const a = answers[t.id]
    return a?.selected === true && Number.isFinite(a.preferred_time_min) ? sum + a.preferred_time_min : sum
  }, 0)
  return taskSum || null
}

export function totalMinutes(phases, answers, phaseTimes) {
  return phases.reduce((sum, p) => sum + (phaseMinutes(p, answers, phaseTimes) ?? 0), 0)
}

// ─── standard_30min ──────────────────────────────────────────────────────────

const standard_30min_nursing = [
  {
    phase: 'Before the Patient Enters',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 's30n_pre_review_chart',       label: 'Review chart (reason for visit, last vitals, open orders, pending labs)' },
      { id: 's30n_pre_prepare_room',       label: 'Prepare the room (supplies, gown if needed, equipment check)' },
      { id: 's30n_pre_note_flags',         label: 'Note flags (overdue screenings, chronic disease gaps, medication refills)' },
    ],
  },
  {
    phase: 'Patient Rooming',
    timing: '5–7 min',
    hasTime: true,
    tasks: [
      { id: 's30n_room_greet',             label: 'Greet patient + confirm identity (name + DOB)' },
      { id: 's30n_room_confirm_reason',    label: 'Confirm reason for visit' },
      { id: 's30n_room_cc_note',           label: 'Add chief complaint to note during rooming' },
      { id: 's30n_room_hpi_note',          label: 'Add HPI to note during rooming' },
      { id: 's30n_room_vitals',            label: 'Vital signs (BP, HR, RR, temp, SpO₂, weight, height/BMI)' },
      { id: 's30n_room_pain',              label: 'Pain score (0–10)' },
    ],
  },
  {
    phase: 'Chief Complaint & History',
    timing: '5 min',
    hasTime: true,
    tasks: [
      { id: 's30n_hx_hpi',                label: 'Brief HPI (onset, duration, severity, associated symptoms, better/worse)' },
      { id: 's30n_hx_med_recon',          label: 'Medication reconciliation (current meds/doses + new OTC/supplements)' },
      { id: 's30n_hx_allergy',            label: 'Allergy verification' },
      { id: 's30n_hx_social',             label: 'Social history updates (smoking, alcohol, living situation)' },
      { id: 's30n_hx_ros',                label: 'Review systems relevant to chief complaint' },
    ],
  },
  {
    phase: 'Preventive Health Screening',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 's30n_prev_flag_overdue',      label: 'Flag overdue items (mammogram, colonoscopy, A1c, lipids, vaccines)' },
      { id: 's30n_prev_phq',               label: 'Depression/anxiety screen (PHQ-2 → PHQ-9 if triggered)' },
      { id: 's30n_prev_fall_risk',         label: 'Fall risk assessment if age ≥65' },
      { id: 's30n_prev_document',          label: 'Document and flag for provider' },
    ],
  },
  {
    phase: 'Provider Notification',
    timing: '1 min',
    hasTime: true,
    tasks: [
      { id: 's30n_notify_handoff',         label: 'Brief verbal handoff to provider (vitals, chief complaint, relevant HPI)' },
    ],
  },
  {
    phase: 'During Provider Exam',
    timing: '10–12 min',
    hasTime: false,
    tasks: [
      { id: 's30n_dur_assist',             label: 'Available for assist (procedures, specimens, chaperone)' },
      { id: 's30n_dur_anticipate_orders',  label: 'Anticipate orders (labs, referrals, imaging)' },
      { id: 's30n_dur_standing_orders',    label: 'Begin entering standing orders per protocol' },
    ],
  },
  {
    phase: 'After Provider Exits',
    timing: '3–5 min',
    hasTime: true,
    tasks: [
      { id: 's30n_after_edu',              label: 'Patient education (new meds, instructions, follow-up)' },
      { id: 's30n_after_provider_edu',     label: 'Prefer the provider handles patient education at the end of the visit' },
      { id: 's30n_after_avs',              label: 'Provide and review AVS with patient' },
      { id: 's30n_after_qa',               label: 'Answer questions + confirm understanding (teach-back)' },
      { id: 's30n_after_followup',         label: 'Schedule follow-up or referrals' },
      { id: 's30n_after_specimens',        label: 'Collect specimens if ordered (labs, UA, swabs)' },
      { id: 's30n_after_escort',           label: 'Escort patient out or to lab' },
    ],
  },
  {
    phase: 'Room Turnover',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 's30n_turn_biohazard',         label: 'Dispose biohazard/sharps' },
      { id: 's30n_turn_wipe',              label: 'Wipe surfaces and equipment' },
      { id: 's30n_turn_restock',           label: 'Restock supplies' },
      { id: 's30n_turn_finalize_doc',      label: 'Finalize nursing documentation in EMR' },
      { id: 's30n_turn_flag_orders',       label: 'Flag outstanding orders for provider signature' },
      { id: 's30n_turn_add_to_rooming',    label: 'Prefer to add this time to the rooming time at the beginning of the visit' },
    ],
  },
  {
    phase: 'Documentation Assist',
    timing: null,
    hasTime: false,
    tasks: [
      { id: 's30n_doc_nursing_assist',     label: 'Should nursing assist with provider-preferred documentation' },
      { id: 's30n_doc_last_encounter',     label: 'Should nursing pull copy of last visit encounter' },
      { id: 's30n_doc_consult_notes',      label: 'Copy of relevant consult notes' },
      { id: 's30n_doc_recent_labs',        label: 'Copy of recent labs' },
      { id: 's30n_doc_imaging',            label: 'Copy of recent imaging/test results' },
      { id: 's30n_doc_print_copies',       label: 'Print copies if patient requests' },
      { id: 's30n_doc_discuss_workflow',   label: 'Amenable to discussing workflow differences or suggestions with teammates' },
    ],
  },
  {
    phase: 'Visit Timing',
    timing: null,
    hasTime: false,
    tasks: [
      { id: 's30n_vt_15_enough',           label: '15 minutes out of a 30-minute visit is enough time to complete nursing patient prep for the provider', askTimeWhenNo: true },
    ],
  },
]

const standard_30min_provider = [
  {
    phase: 'Before the Patient Enters',
    timing: '2–5 min',
    hasTime: true,
    tasks: [
      { id: 's30p_pre_review_chart',       label: 'Review chart (reason for visit, last vitals, open orders, pending labs)' },
      { id: 's30p_pre_note_flags',         label: 'Note flags (overdue screenings, chronic disease gaps, medication refills)' },
    ],
  },
  {
    phase: 'Patient Rooming',
    timing: '5–7 min',
    hasTime: true,
    tasks: [
      { id: 's30p_room_greet',             label: 'Greet patient + confirm identity' },
      { id: 's30p_room_confirm_reason',    label: 'Confirm reason for visit (patient states in own words)' },
      { id: 's30p_room_vitals_ehr',        label: 'Vital signs documented in EHR' },
      { id: 's30p_room_pain',              label: 'Pain score (0–10)' },
      { id: 's30p_room_realtime_doc',      label: 'Document in EHR in real time' },
    ],
  },
  {
    phase: 'History & Chief Complaint',
    timing: '5 min',
    hasTime: true,
    tasks: [
      { id: 's30p_hx_hpi',                label: 'Brief HPI (onset, duration, severity, associated symptoms, better/worse)' },
      { id: 's30p_hx_med_recon',          label: 'Medication reconciliation' },
      { id: 's30p_hx_allergy',            label: 'Allergy verification' },
      { id: 's30p_hx_social',             label: 'Social history updates' },
      { id: 's30p_hx_ros',                label: 'Review of systems relevant to chief complaint' },
      { id: 's30p_hx_prev_screen',        label: 'Preventive health screening (overdue items, PHQ-2/9, fall risk if ≥65)' },
    ],
  },
  {
    phase: 'Provider Exam',
    timing: '10–12 min',
    hasTime: true,
    tasks: [
      { id: 's30p_exam_nursing_assist',    label: 'Nursing available for assist (procedures, specimens, chaperone)' },
      { id: 's30p_exam_place_orders',      label: 'Anticipate and place orders (labs, referrals, imaging)' },
      { id: 's30p_exam_standing_orders',   label: 'Enter standing orders per protocol' },
    ],
  },
  {
    phase: 'Provider Exit',
    timing: '3–5 min',
    hasTime: true,
    tasks: [
      { id: 's30p_exit_edu',               label: 'Patient education (new meds, instructions, follow-up)' },
      { id: 's30p_exit_avs',               label: 'Review AVS with patient' },
      { id: 's30p_exit_qa',                label: 'Answer questions + confirm understanding' },
      { id: 's30p_exit_followup',          label: 'Schedule follow-up + referrals' },
    ],
  },
  {
    phase: 'Documentation Assist',
    timing: null,
    hasTime: false,
    tasks: [
      { id: 's30p_doc_nursing_assist',     label: 'Should nursing assist with provider-preferred documentation' },
      { id: 's30p_doc_last_encounter',     label: 'Should nursing pull copy of last visit encounter' },
      { id: 's30p_doc_consult_notes',      label: 'Copy of relevant consult notes' },
      { id: 's30p_doc_recent_labs',        label: 'Copy of recent labs' },
      { id: 's30p_doc_imaging',            label: 'Copy of recent imaging/test results' },
      { id: 's30p_doc_print_copies',       label: 'Print copies if patient requests' },
      { id: 's30p_doc_discuss_workflow',   label: 'Interested in discussing workflow differences with teammates' },
    ],
  },
  {
    phase: 'Visit Timing',
    timing: null,
    hasTime: false,
    tasks: [
      { id: 's30p_vt_15_enough',           label: '15 minutes out of a 30-minute visit is enough time to complete the provider portion of the visit', askTimeWhenNo: true },
    ],
  },
]

// ─── joint_injection ─────────────────────────────────────────────────────────

const joint_injection_nursing = [
  {
    phase: 'Pre-Visit Prep',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'jin_pre_review_chart',        label: 'Review chart (procedure type, joint, laterality, prior injections, response history)' },
      { id: 'jin_pre_contraindications',   label: 'Check contraindications (anticoagulants, active infection, allergy)' },
      { id: 'jin_pre_consent_available',   label: 'Confirm consent form available' },
      { id: 'jin_pre_setup_tray',          label: 'Set up procedure tray (steroid + dose, anesthetic, syringes + needles, betadine/chlorhexidine, sterile gloves, drape, gauze, bandage)' },
      { id: 'jin_pre_position_room',       label: 'Position room/lighting correctly' },
    ],
  },
  {
    phase: 'Patient Rooming & Vitals',
    timing: '3–4 min',
    hasTime: true,
    tasks: [
      { id: 'jin_room_vitals',             label: 'Vital signs (BP, HR, temp, weight)' },
      { id: 'jin_room_pain_score',         label: 'Pain score in affected joint (baseline)' },
      { id: 'jin_room_confirm_joint',      label: 'Confirm joint and side with patient' },
      { id: 'jin_room_position_patient',   label: 'Position patient for injection' },
      { id: 'jin_room_begin_consent',      label: 'Begin consent process' },
    ],
  },
  {
    phase: 'During Procedure',
    timing: '5–7 min',
    hasTime: true,
    tasks: [
      { id: 'jin_proc_open_supplies',      label: 'Open sterile supplies + prep field' },
      { id: 'jin_proc_draw_meds',          label: 'Draw up medications under provider direction' },
      { id: 'jin_proc_maintain_sterile',   label: 'Maintain sterile field' },
      { id: 'jin_proc_monitor_patient',    label: 'Monitor patient during procedure' },
    ],
  },
  {
    phase: 'Post-Procedure',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'jin_post_assess',             label: 'Assess patient (pain, dizziness, vasovagal)' },
      { id: 'jin_post_observe',            label: 'Keep patient seated/observed 5 min' },
      { id: 'jin_post_recheck_bp',         label: 'Recheck BP if hypertensive or on anticoagulants' },
      { id: 'jin_post_label_send_fluid',   label: 'Label + send aspirated fluid to lab' },
      { id: 'jin_post_document',           label: 'Document medication name, dose, lot number, expiration, site, laterality' },
    ],
  },
  {
    phase: 'Patient Education',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'jin_edu_rest_joint',          label: 'Rest joint 24–48 hours' },
      { id: 'jin_edu_flare_warning',       label: 'Explain post-injection flare (normal, treat with ice/rest)' },
      { id: 'jin_edu_blood_sugar',         label: 'Blood sugar warning for diabetics' },
      { id: 'jin_edu_infection_warning',   label: 'Infection warning signs' },
      { id: 'jin_edu_benefit_timeline',    label: 'Expected benefit timeline' },
      { id: 'jin_edu_followup',            label: 'When to follow up' },
      { id: 'jin_edu_avs',                 label: 'Provide written AVS' },
    ],
  },
  {
    phase: 'Room Turnover',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'jin_turn_sharps',             label: 'Dispose sharps immediately' },
      { id: 'jin_turn_biohazard',          label: 'Biohazard disposal' },
      { id: 'jin_turn_disinfect',          label: 'Disinfect surfaces' },
      { id: 'jin_turn_restock',            label: 'Restock tray + supplies' },
      { id: 'jin_turn_documentation',      label: 'Complete nursing documentation' },
    ],
  },
]

const joint_injection_provider = [
  {
    phase: 'Pre-Visit Prep',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'jip_pre_review_imaging',      label: 'Review imaging (X-ray, MRI, ultrasound) if available' },
      { id: 'jip_pre_confirm_approach',    label: 'Confirm landmark vs. ultrasound-guided approach' },
      { id: 'jip_pre_review_last_inj',     label: 'Review last injection date (steroid interval precautions)' },
      { id: 'jip_pre_anticipate_coding',   label: 'Anticipate ICD-10 and CPT coding' },
    ],
  },
  {
    phase: 'History & Exam',
    timing: '4–5 min',
    hasTime: true,
    tasks: [
      { id: 'jip_hx_hpi',                 label: 'Brief HPI (pain location, duration, severity, functional impact, prior treatments + injections)' },
      { id: 'jip_hx_medications',         label: 'Review medications (NSAIDs, anticoagulants, diabetes meds)' },
      { id: 'jip_hx_allergies',           label: 'Confirm allergies (iodine/betadine, lidocaine, latex)' },
      { id: 'jip_hx_msk_exam',            label: 'MSK-focused exam (inspection, palpation, ROM, special tests)' },
      { id: 'jip_hx_rule_out',            label: 'Rule out contraindications (infection, septic joint, fracture)' },
    ],
  },
  {
    phase: 'Informed Consent',
    timing: '1–2 min',
    hasTime: true,
    tasks: [
      { id: 'jip_consent_explain',         label: 'Explain procedure + expected benefit + alternatives' },
      { id: 'jip_consent_risks',           label: 'Risks (infection, post-injection flare, skin atrophy, tendon rupture, blood sugar elevation)' },
      { id: 'jip_consent_confirm',         label: 'Confirm patient understands' },
      { id: 'jip_consent_sign',            label: 'Sign consent' },
    ],
  },
  {
    phase: 'Procedure',
    timing: '5–7 min',
    hasTime: true,
    tasks: [
      { id: 'jip_proc_wash_gloves',        label: 'Wash hands + don sterile gloves' },
      { id: 'jip_proc_landmark',           label: 'Identify and mark landmark (or set up ultrasound)' },
      { id: 'jip_proc_prep_skin',          label: 'Prep skin with antiseptic' },
      { id: 'jip_proc_anesthetize',        label: 'Anesthetize skin if needed' },
      { id: 'jip_proc_insert_needle',      label: 'Insert needle' },
      { id: 'jip_proc_aspirate',           label: 'Aspirate if effusion present' },
      { id: 'jip_proc_confirm_placement',  label: 'Confirm placement' },
      { id: 'jip_proc_inject',             label: 'Inject steroid ± anesthetic' },
      { id: 'jip_proc_withdraw_bandage',   label: 'Withdraw + apply pressure + bandage' },
    ],
  },
  {
    phase: 'Post-Procedure',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'jip_post_document',           label: 'Document procedure note immediately (indication, consent, medications, technique, tolerance, complications, aspirate if applicable)' },
    ],
  },
  {
    phase: 'Follow-Up Planning',
    timing: '1 min',
    hasTime: true,
    tasks: [
      { id: 'jip_fu_schedule',             label: 'Schedule follow-up 4–6 weeks' },
      { id: 'jip_fu_referral_failures',    label: 'If repeated failures → orthopedic/rheumatology referral' },
      { id: 'jip_fu_pt_referral',          label: 'Consider PT referral' },
      { id: 'jip_fu_imaging_referral',     label: 'Imaging referral if needed' },
    ],
  },
  {
    phase: 'Documentation & Coding',
    timing: null,
    hasTime: false,
    tasks: [
      { id: 'jip_doc_em_note',             label: 'Complete E/M note + procedure note' },
      { id: 'jip_doc_cpt',                 label: 'CPT coding (20610, 20611, 20605, 76942)' },
      { id: 'jip_doc_modifier_25',         label: 'Confirm modifier 25 if billing E/M same day' },
      { id: 'jip_doc_medical_necessity',   label: 'Document medical necessity' },
      { id: 'jip_doc_sign_orders',         label: 'Sign all orders' },
    ],
  },
]

// ─── new_patient ──────────────────────────────────────────────────────────────

const new_patient_nursing = [
  {
    phase: 'Pre-Visit Prep',
    timing: '3–4 min',
    hasTime: true,
    tasks: [
      { id: 'npn_pre_confirm_new',         label: 'Confirm new patient status (seen by any provider in this practice within 3 years)' },
      { id: 'npn_pre_insurance',           label: 'Confirm insurance eligibility' },
      { id: 'npn_pre_paperwork',           label: 'Ensure new patient paperwork complete (demographics, insurance cards, photo ID, HIPAA, practice policies, release of records, emergency contact, preferred pharmacy)' },
      { id: 'npn_pre_outside_records',     label: 'Load any available outside records' },
    ],
  },
  {
    phase: 'Patient Rooming',
    timing: '4–5 min',
    hasTime: true,
    tasks: [
      { id: 'npn_room_greet',              label: 'Warm greeting — first impressions matter' },
      { id: 'npn_room_orient',             label: 'Orient patient to the practice (after-hours contact, portal enrollment, lab + pharmacy workflow)' },
      { id: 'npn_room_vitals',             label: 'Vital signs (bilateral BP if hypertension history, HR, RR, temp, SpO₂, height, weight, BMI, pain score)' },
      { id: 'npn_room_screenings',         label: 'Baseline screenings (PHQ-2/9, AUDIT-C, tobacco use, fall risk if ≥65, cognitive screen if ≥65)' },
      { id: 'npn_room_med_recon',          label: 'Medication reconciliation (confirm each med, dose, frequency, adherence, high-risk meds)' },
      { id: 'npn_room_allergies',          label: 'Confirm allergies with reaction type' },
      { id: 'npn_room_pharmacy',           label: 'Confirm preferred pharmacy' },
      { id: 'npn_room_gown',               label: 'Gown patient if exam anticipated' },
    ],
  },
  {
    phase: 'Documentation Assist',
    timing: null,
    hasTime: false,
    tasks: [
      { id: 'npn_doc_outside_records',     label: 'Should nursing pull outside records' },
      { id: 'npn_doc_referral_notes',      label: 'Copy of referral notes' },
      { id: 'npn_doc_med_list',            label: 'Prepare medication reconciliation list' },
      { id: 'npn_doc_high_risk_flag',      label: 'Flag high-risk medications (warfarin, insulin, opioids, lithium)' },
    ],
  },
]

const new_patient_provider = [
  {
    phase: 'Opening',
    timing: '3–4 min',
    hasTime: true,
    tasks: [
      { id: 'npp_open_introduce',          label: 'Knock + introduce yourself (name, degree, role)' },
      { id: 'npp_open_sit_down',           label: 'Sit down — do not stand at the door' },
      { id: 'npp_open_elicit_agenda',      label: 'Elicit full agenda upfront' },
      { id: 'npp_open_time_limit',         label: 'Acknowledge 30 min may not cover everything' },
      { id: 'npp_open_tone',               label: 'Establish collaborative, non-judgmental, patient-centered tone' },
    ],
  },
  {
    phase: 'Comprehensive History',
    timing: '8–10 min',
    hasTime: true,
    tasks: [
      { id: 'npp_hx_cc_hpi',              label: 'Chief complaint + HPI (primary reason for establishing care, any acute concerns, onset/duration/severity)' },
      { id: 'npp_hx_pmh',                 label: 'Past medical history (chronic conditions, hospitalizations, surgeries, obstetric history)' },
      { id: 'npp_hx_med_review',          label: 'Full medication review (indication, dose, prescriber, last labs, adherence, OTC/supplements)' },
      { id: 'npp_hx_allergy',             label: 'Allergy list (confirm + clarify reaction type)' },
      { id: 'npp_hx_family',              label: 'Family history (CAD, diabetes, cancer, stroke, mental illness, sudden cardiac death)' },
      { id: 'npp_hx_social',              label: 'Social history (occupation, living situation, tobacco, alcohol, drugs, exercise, diet, sleep, sexual history, domestic violence screen, advance directives)' },
      { id: 'npp_hx_ros',                 label: 'Review of systems' },
    ],
  },
  {
    phase: 'Assessment & Plan',
    timing: null,
    hasTime: false,
    tasks: [
      { id: 'npp_ap_treatment_plan',       label: 'Outline treatment plan for subacute, acute, or chronic issues' },
      { id: 'npp_ap_order_labs',           label: 'Order needed labs or imaging' },
      { id: 'npp_ap_schedule_annual',      label: 'Schedule annual exam or wellness visit if due' },
      { id: 'npp_ap_schedule_nursing',     label: 'Schedule nursing visits for vaccinations or screenings' },
      { id: 'npp_ap_rapport',              label: 'Establish rapport — ask which needs patient wants to prioritize' },
    ],
  },
]

// ─── awv (Medicare Annual Wellness Visit) ─────────────────────────────────────

const awv_nursing = [
  {
    phase: 'Pre-Visit Prep',
    timing: '3–4 min',
    hasTime: true,
    tasks: [
      { id: 'awvn_pre_visit_type',         label: 'Confirm visit type (Initial AWV, Subsequent AWV, or Welcome to Medicare/IPPE)' },
      { id: 'awvn_pre_eligibility',        label: 'Confirm no AWV in the past 12 months (eligibility check)' },
      { id: 'awvn_pre_pull_records',       label: 'Pull problem list, medication list, prior AWV, outstanding screenings/immunizations, specialist notes, recent labs' },
      { id: 'awvn_pre_forms',              label: 'Prepare AWV forms (HRA, PHQ-9, cognitive screen, fall risk, ADL/iADL, advance directive status)' },
    ],
  },
  {
    phase: 'Patient Rooming',
    timing: '4–5 min',
    hasTime: true,
    tasks: [
      { id: 'awvn_room_vitals',            label: 'Vital signs (BP, HR, height, weight, BMI — no temp unless indicated)' },
      { id: 'awvn_room_vision',            label: 'Vision screen (Snellen chart)' },
      { id: 'awvn_room_hearing',           label: 'Hearing screen (whisper test or validated tool)' },
      { id: 'awvn_room_questionnaires',    label: 'Administer questionnaires (HRA, PHQ-2 → PHQ-9, Mini-Cog/MoCA, fall risk, ADL/iADL)' },
      { id: 'awvn_room_advance_directive', label: 'Check advance directive — does the patient have one on file?' },
      { id: 'awvn_room_update_history',    label: 'Update medication list, allergies, surgical/hospitalization history, family history' },
    ],
  },
]

const awv_provider = [
  {
    phase: 'Pre-Visit Prep',
    timing: '3–4 min',
    hasTime: true,
    tasks: [
      { id: 'awvp_pre_prior_awv',          label: 'Review prior AWV note and personalized prevention plan' },
      { id: 'awvp_pre_care_gaps',          label: 'Identify care gaps (overdue labs, screenings, vaccines)' },
      { id: 'awvp_pre_chronic',            label: 'Note chronic conditions requiring prevention plan updates' },
      { id: 'awvp_pre_flags',              label: 'Review flagged cognitive or functional concerns from prior visit' },
    ],
  },
  {
    phase: 'Opening',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'awvp_open_purpose',           label: 'Explain the purpose: prevention and planning, not a full physical' },
      { id: 'awvp_open_billing',           label: 'Set billing expectations if medical problems are addressed (separate E/M, modifier 25)' },
      { id: 'awvp_open_hra',               label: 'Review HRA responses with the patient as a conversation guide' },
      { id: 'awvp_open_ask',               label: 'Ask open-ended: "How have you been feeling overall?"' },
    ],
  },
  {
    phase: 'Health Risk Assessment Review',
    timing: '4–5 min',
    hasTime: true,
    tasks: [
      { id: 'awvp_hra_chronic',            label: 'Chronic disease status (diabetes, HTN, COPD, heart disease, CKD)' },
      { id: 'awvp_hra_function',           label: 'Functional status (ADLs, iADLs, new limitations)' },
      { id: 'awvp_hra_falls',              label: 'Fall risk (falls in past 12 months, fear of falling, home hazards)' },
      { id: 'awvp_hra_cognitive',          label: 'Cognitive assessment (Mini-Cog/MoCA results; CPT 99483 workup if impairment)' },
      { id: 'awvp_hra_mood',               label: 'Mood and mental health (PHQ-9, isolation, caregiver stress)' },
      { id: 'awvp_hra_substance',          label: 'Substance use (AUDIT-C, tobacco, recreational drugs)' },
      { id: 'awvp_hra_nutrition_sleep',    label: 'Nutrition and sleep (weight changes, apnea symptoms)' },
      { id: 'awvp_hra_safety',             label: 'Safety (driving, home safety, elder abuse screen)' },
      { id: 'awvp_hra_social',             label: 'Social history (living situation, support system, financial stress)' },
    ],
  },
]

// ─── omt (Osteopathic Manipulative Treatment) ─────────────────────────────────

const omt_nursing = [
  {
    phase: 'Pre-Visit Prep',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'omtn_pre_review_chart',       label: 'Review chart (visit type, regions to treat, prior OMT response, diagnosis)' },
      { id: 'omtn_pre_contraindications',  label: 'Check contraindications (fracture, malignancy, severe osteoporosis, infection, anticoagulation, carotid/vertebral disease, recent surgery)' },
      { id: 'omtn_pre_room_setup',         label: 'Room setup (treatment table, step stool, gown/drape, pillow/bolster)' },
      { id: 'omtn_pre_consent_form',       label: 'Consent form available if required by practice' },
    ],
  },
  {
    phase: 'Patient Rooming & Vitals',
    timing: '3–4 min',
    hasTime: true,
    tasks: [
      { id: 'omtn_room_vitals',            label: 'Vital signs (BP, HR, RR, temp, weight)' },
      { id: 'omtn_room_pain',              label: 'Pain score — location and severity (baseline)' },
      { id: 'omtn_room_function',          label: 'Functional assessment (mobility limitations, ADL impact)' },
      { id: 'omtn_room_cc',                label: "Document chief complaint in the patient's own words" },
      { id: 'omtn_room_gown_position',     label: 'Gown patient if needed and position on the treatment table' },
    ],
  },
  {
    phase: 'During OMT',
    timing: '8–10 min',
    hasTime: true,
    tasks: [
      { id: 'omtn_proc_positioning',       label: 'Remain available for positioning assistance' },
      { id: 'omtn_proc_monitor',           label: 'Monitor patient comfort and communication' },
      { id: 'omtn_proc_chaperone',         label: 'Be present as chaperone if required' },
    ],
  },
  {
    phase: 'Post-Procedure',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'omtn_post_sit_slowly',        label: 'Assist patient to sitting slowly (orthostatic precaution)' },
      { id: 'omtn_post_observe',           label: 'Keep patient seated and observed 3–5 minutes' },
      { id: 'omtn_post_recheck_bp',        label: 'Recheck BP if hypertensive or symptomatic' },
      { id: 'omtn_post_document',          label: 'Document techniques, regions treated, response, pre/post pain score' },
    ],
  },
]

const omt_provider = [
  {
    phase: 'Pre-Visit Prep',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'omtp_pre_prior_notes',        label: 'Review prior OMT notes (techniques, regions, response)' },
      { id: 'omtp_pre_imaging',            label: 'Review any new imaging (rule out structural contraindications)' },
      { id: 'omtp_pre_meds',               label: 'Review medications (muscle relaxants, pain meds, anticoagulants)' },
      { id: 'omtp_pre_plan_technique',     label: 'Plan likely technique (HVLA, MFR, counterstrain, ME, cranial/BLT, soft tissue/articulatory)' },
    ],
  },
  {
    phase: 'Opening',
    timing: '3–4 min',
    hasTime: true,
    tasks: [
      { id: 'omtp_open_greet',             label: 'Greet, confirm identity and visit purpose, set agenda' },
      { id: 'omtp_open_hpi',               label: 'Brief HPI (location, onset, severity, aggravating/relieving factors, functional limits, prior OMT/PT, trauma)' },
      { id: 'omtp_open_meds_allergies',    label: 'Review medications and confirm allergies' },
    ],
  },
  {
    phase: 'Structural Exam',
    timing: '5–6 min',
    hasTime: true,
    tasks: [
      { id: 'omtp_exam_posture_gait',      label: 'Postural and gait assessment' },
      { id: 'omtp_exam_regional',          label: 'Regional screening, tissue texture, asymmetry, ROM, tenderness' },
      { id: 'omtp_exam_tart',              label: 'Document TART findings' },
      { id: 'omtp_exam_neuro_red_flags',   label: 'Neurological screen if indicated and rule out red flags' },
    ],
  },
  {
    phase: 'Diagnosis & Consent',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'omtp_dx_somatic',             label: 'Identify somatic dysfunction by region and type' },
      { id: 'omtp_dx_select_technique',    label: 'Select technique by age, tolerance, acuity, contraindications' },
      { id: 'omtp_consent_explain',        label: 'Explain techniques, risks, and alternatives in plain language' },
      { id: 'omtp_consent_cervical',       label: 'Explicit consent for cervical HVLA (vertebral artery risk)' },
      { id: 'omtp_consent_document',       label: 'Document consent' },
    ],
  },
  {
    phase: 'OMT Procedure',
    timing: '8–10 min',
    hasTime: true,
    tasks: [
      { id: 'omtp_proc_sequence',          label: 'Sequence treatment: global/soft first, primary dysfunction, compensatory regions, global finish' },
      { id: 'omtp_proc_reassess',          label: 'Reassess after each technique' },
      { id: 'omtp_proc_communicate',       label: 'Communicate throughout; stop for dizziness, radiating pain, or neuro symptoms' },
    ],
  },
  {
    phase: 'Post-Procedure Assessment',
    timing: '2–3 min',
    hasTime: true,
    tasks: [
      { id: 'omtp_post_tart',              label: 'Reassess TART findings (ROM, tissue texture, tenderness)' },
      { id: 'omtp_post_pain',              label: 'Pain score reassessment compared to baseline' },
      { id: 'omtp_post_symptoms',          label: 'Check the patient is not dizzy or symptomatic' },
    ],
  },
]

// ─── Master lookup ────────────────────────────────────────────────────────────

export const WORKFLOW_DATA = {
  standard_30min: {
    nursing:  standard_30min_nursing,
    provider: standard_30min_provider,
  },
  joint_injection: {
    nursing:  joint_injection_nursing,
    provider: joint_injection_provider,
  },
  new_patient: {
    nursing:  new_patient_nursing,
    provider: new_patient_provider,
  },
  awv: {
    nursing:  awv_nursing,
    provider: awv_provider,
  },
  omt: {
    nursing:  omt_nursing,
    provider: omt_provider,
  },
}

// Helper: get all task ids for a given workflow + role
export function getAllTaskIds(visitType, role) {
  const phases = WORKFLOW_DATA[visitType]?.[role] ?? []
  return phases.flatMap((p) => p.tasks.map((t) => t.id))
}
