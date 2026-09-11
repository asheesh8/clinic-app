// Terms of Service + Privacy Policy content. Bump TERMS_VERSION whenever the
// text changes in a way users must re-accept; everyone is asked again once.
// NOTE: plain-language draft — have a lawyer review before a wide launch.

export const TERMS_VERSION = '2026-09-10'
export const TERMS_UPDATED = 'September 10, 2026'

export const PRIVACY_PROMISES = [
  { emoji: '🚫', title: "We don't sell your personal information", body: 'Not to advertisers, data brokers, or anyone else.' },
  { emoji: '📵', title: "We don't share your data with third-party ad networks", body: 'FlowSync has no ads and no ad trackers.' },
  { emoji: '🔐', title: 'You control who sees your profile', body: 'Choose Private, Organization, or Public at any time in My Profile.' },
  { emoji: '📝', title: 'You own what you create', body: 'Your answers, workflows, and templates belong to you.' },
]

export const TERMS_SECTIONS = [
  {
    heading: 'What FlowSync is',
    body: [
      'FlowSync helps teammates share how they like to work — workflow preferences, workspace needs, and communication style — so teams can work together more smoothly.',
      'FlowSync is not a medical record. Do not enter patient names, dates of birth, or any other protected health information (PHI).',
    ],
  },
  {
    heading: 'Your account',
    body: [
      'You are responsible for keeping your login secure and for the information you add. Use your real name and role so teammates know who they are working with.',
    ],
  },
  {
    heading: 'Your content and copyright',
    body: [
      'You keep ownership of everything you submit: questionnaire answers, custom workflow templates, messages, and photos.',
      'You give FlowSync a limited permission to store your content and show it to the people you choose (for example your organization, people you share a template with, or the public if your profile is public). This permission ends when you delete the content or your account, except for copies other people already received, such as messages.',
      "Only upload content you have the right to share. Don't copy someone else's copyrighted material into FlowSync without permission.",
      'The FlowSync app, its design, name, logo, and built-in workflow templates are owned by FlowSync and protected by copyright. You may not copy or resell them.',
    ],
  },
  {
    heading: 'Acceptable use',
    body: [
      'Be respectful. No harassment, discrimination, spam, or attempts to access accounts or data that are not yours.',
      'Interaction ratings should reflect genuine working experiences.',
    ],
  },
  {
    heading: 'Privacy',
    body: [
      'We collect the information you provide (name, email, role, organization, answers, photo) and basic technical data needed to run the service.',
      'We use it only to operate FlowSync: showing your profile to the people you choose, calculating similarity scores, and delivering messages.',
      "We don't sell personal information and don't share it with advertising networks. We use trusted service providers (such as our hosting, database, and photo storage providers) only to run the app.",
      'You can update your information any time, change your profile visibility, or ask us to delete your account.',
    ],
  },
  {
    heading: 'No warranty',
    body: [
      'FlowSync is provided "as is". Similarity scores and hybrid workflows are suggestions to help conversations — they are not clinical guidance or employment advice.',
    ],
  },
  {
    heading: 'Changes',
    body: [
      "If we make important changes to these terms we'll ask you to review and accept them again in the app.",
    ],
  },
]
