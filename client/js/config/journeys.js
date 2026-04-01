/**
 * Frontend journey configuration (ES module mirror of backend config).
 * Single source of truth for journey types, stages, roles, and mappings.
 */

export const JOURNEYS = {
  // ── GUEST JOURNEY (existing — preserved exactly) ──────────────────────
  guest: {
    id: 'guest',
    label: 'Guest Journey',
    stages: [
      { id: 'discovery',      label: 'Discovery',      tip: 'Guest researches options, reads reviews, compares properties' },
      { id: 'booking',        label: 'Booking',         tip: 'Guest selects dates, makes a reservation, receives confirmation' },
      { id: 'pre_arrival',    label: 'Pre-arrival',     tip: 'Guest receives pre-stay communications, special requests, upsells' },
      { id: 'check_in',       label: 'Check-in',        tip: 'Guest arrives, identity verification, room assignment, key handover' },
      { id: 'in_stay',        label: 'In-stay',         tip: 'Guest experience during the stay — housekeeping, concierge, dining, activities' },
      { id: 'check_out',      label: 'Check-out',       tip: 'Guest settles bill, returns keys, arranges transport, departure' },
      { id: 'post_stay',      label: 'Post-stay',       tip: 'Guest receives follow-up, review requests, loyalty programme communications' },
      { id: 're_engagement',  label: 'Re-engagement',   tip: 'Returning guest outreach, special offers, win-back campaigns' },
    ],
    roleStageMap: {
      'Regional General Manager':                       ['discovery', 'booking', 'pre_arrival', 'check_in', 'in_stay', 'check_out', 'post_stay', 're_engagement'],
      'Holiday / Hotel / Park Manager':                 ['discovery', 'booking', 'pre_arrival', 'check_in', 'in_stay', 'check_out', 'post_stay', 're_engagement'],
      'Assistant Holiday Manager, Hotel Operations':    ['booking', 'pre_arrival', 'check_in', 'in_stay', 'check_out', 'post_stay'],
      'Client Services':                                ['discovery', 'booking', 'pre_arrival', 'post_stay', 're_engagement'],
      'Host / Inspector':                               ['pre_arrival', 'check_in', 'in_stay', 'check_out'],
      'Reservations & Guest Services':                  ['discovery', 'booking', 'pre_arrival'],
      'Call Centre Manager':                            ['discovery', 'booking', 'pre_arrival', 'post_stay'],
      'Trust':                                          ['booking', 'check_out', 'post_stay'],
      'Marketing / Digital Marketing':                  ['discovery', 're_engagement'],
      'Regulatory & Compliance':                        ['discovery', 'booking', 'pre_arrival', 'check_in', 'in_stay', 'check_out', 'post_stay', 're_engagement'],
    },
  },

  // ── EMPLOYEE JOURNEY ──────────────────────────────────────────────────
  employee: {
    id: 'employee',
    label: 'Employee Journey',
    stages: [
      { id: 'recruitment',       label: 'Recruitment',       tip: 'Attracting, sourcing, and hiring talent' },
      { id: 'onboarding',        label: 'Onboarding',        tip: 'New employee induction, training, systems access, first weeks' },
      { id: 'daily_operations',  label: 'Daily Operations',  tip: 'Day-to-day work routines, tools, team coordination' },
      { id: 'development',       label: 'Development',       tip: 'Training, upskilling, career progression, mentoring' },
      { id: 'performance',       label: 'Performance',       tip: 'Reviews, KPIs, feedback cycles, goal setting' },
      { id: 'engagement',        label: 'Engagement',        tip: 'Culture, wellbeing, recognition, internal communication' },
      { id: 'transition',        label: 'Transition',        tip: 'Role changes, promotions, offboarding, exit process' },
    ],
    roleStageMap: {
      'Head of People and Culture':      ['recruitment', 'onboarding', 'daily_operations', 'development', 'performance', 'engagement', 'transition'],
      'Payroll Lead':                    ['onboarding', 'daily_operations', 'transition'],
      'Regional General Manager':        ['recruitment', 'onboarding', 'daily_operations', 'development', 'performance', 'engagement', 'transition'],
      'Holiday / Hotel / Park Manager':  ['recruitment', 'onboarding', 'daily_operations', 'development', 'performance', 'engagement'],
      'Hotel Operations Manager':        ['recruitment', 'onboarding', 'daily_operations', 'performance', 'engagement'],
      'Call Centre Manager':             ['recruitment', 'onboarding', 'daily_operations', 'performance'],
      'Change Manager':                  ['onboarding', 'daily_operations', 'development', 'engagement', 'transition'],
      'Project Manager':                 ['daily_operations', 'development', 'performance'],
      'Head of Marketing':               ['recruitment', 'onboarding', 'daily_operations', 'development', 'performance'],
      'Financial Controller':            ['onboarding', 'daily_operations', 'performance', 'transition'],
    },
  },

  // ── OWNER JOURNEY ─────────────────────────────────────────────────────
  owner: {
    id: 'owner',
    label: 'Owner Journey',
    stages: [
      { id: 'acquisition',        label: 'Acquisition',        tip: 'Sourcing, pitching, and signing new property owners' },
      { id: 'owner_onboarding',   label: 'Owner Onboarding',   tip: 'Contracts, listing setup, photography, pricing strategy' },
      { id: 'property_setup',     label: 'Property Setup',     tip: 'Standards, inspections, amenities, compliance readiness' },
      { id: 'active_management',  label: 'Active Management',  tip: 'Revenue management, maintenance, cleaning, guest coordination' },
      { id: 'reporting',          label: 'Reporting',          tip: 'Financial statements, trust distributions, performance reviews' },
      { id: 'retention',          label: 'Retention',          tip: 'Relationship management, satisfaction, contract renewals' },
      { id: 'offboarding',        label: 'Offboarding',        tip: 'Property exit, handover, final reconciliation' },
    ],
    roleStageMap: {
      'Business Development Manager':      ['acquisition', 'owner_onboarding'],
      'Client Services':                   ['owner_onboarding', 'active_management', 'reporting', 'retention', 'offboarding'],
      'Senior Client Services Executive':  ['acquisition', 'owner_onboarding', 'active_management', 'reporting', 'retention', 'offboarding'],
      'Holiday / Hotel / Park Manager':    ['acquisition', 'owner_onboarding', 'property_setup', 'active_management', 'reporting', 'retention', 'offboarding'],
      'Regional General Manager':          ['acquisition', 'owner_onboarding', 'property_setup', 'active_management', 'reporting', 'retention', 'offboarding'],
      'Trust':                             ['reporting', 'offboarding'],
      'Trust Administrator':               ['reporting', 'offboarding'],
      'Finance Manager - Trust Accounts':  ['reporting', 'offboarding'],
      'Revenue Portfolio Manager':         ['owner_onboarding', 'active_management', 'reporting'],
      'Host / Inspector':                  ['property_setup', 'active_management'],
      'Maintenance & Landscaper':          ['property_setup', 'active_management'],
    },
  },

  // ── VENDOR JOURNEY ────────────────────────────────────────────────────
  vendor: {
    id: 'vendor',
    label: 'Vendor Journey',
    stages: [
      { id: 'sourcing',           label: 'Sourcing',           tip: 'Finding, evaluating, and selecting vendors and suppliers' },
      { id: 'vendor_onboarding',  label: 'Vendor Onboarding',  tip: 'Contracts, compliance, credentials, system setup' },
      { id: 'service_delivery',   label: 'Service Delivery',   tip: 'Active service provision, quality standards, SLAs' },
      { id: 'performance_review', label: 'Performance Review', tip: 'Quality checks, KPI monitoring, feedback' },
      { id: 'financial',          label: 'Financial',          tip: 'Invoicing, payments, reconciliation, dispute resolution' },
      { id: 'relationship',       label: 'Relationship',       tip: 'Communication, issue resolution, escalation paths' },
      { id: 'renewal_exit',       label: 'Renewal / Exit',     tip: 'Contract renewal, termination, vendor replacement' },
    ],
    roleStageMap: {
      'Head of Logistics and Operations':  ['sourcing', 'vendor_onboarding', 'service_delivery', 'performance_review', 'financial', 'relationship', 'renewal_exit'],
      'Senior Accounts Officer':           ['vendor_onboarding', 'financial', 'renewal_exit'],
      'Head Housekeeper':                  ['sourcing', 'vendor_onboarding', 'service_delivery', 'performance_review'],
      'MLR Services Manager':              ['sourcing', 'vendor_onboarding', 'service_delivery', 'performance_review', 'relationship'],
      'Hotel Operations Manager':          ['sourcing', 'service_delivery', 'performance_review', 'relationship'],
      'Maintenance & Landscaper':          ['sourcing', 'service_delivery', 'performance_review'],
      'Park Manager':                      ['sourcing', 'vendor_onboarding', 'service_delivery', 'performance_review', 'relationship'],
      'Business Support Manager':          ['vendor_onboarding', 'service_delivery', 'financial', 'relationship', 'renewal_exit'],
    },
  },
};

export const JOURNEY_TYPES = Object.keys(JOURNEYS);

export const JOURNEY_COLORS = {
  guest:    { primary: '#2563EB', primaryDark: '#1D4ED8' },
  employee: { primary: '#0D9488', primaryDark: '#0F766E' },
  owner:    { primary: '#7C3AED', primaryDark: '#6D28D9' },
  vendor:   { primary: '#D97706', primaryDark: '#B45309' },
};

export function getJourney(type) {
  return JOURNEYS[type] || JOURNEYS.guest;
}

export function getSelectedJourney() {
  return localStorage.getItem('selected_journey') || 'guest';
}

export function setSelectedJourney(type) {
  localStorage.setItem('selected_journey', type);
}

/** Apply journey-specific color theme by overriding CSS custom properties */
export function applyJourneyTheme(type) {
  const colors = JOURNEY_COLORS[type] || JOURNEY_COLORS.guest;
  const s = document.documentElement.style;
  s.setProperty('--primary', colors.primary);
  s.setProperty('--primary-dark', colors.primaryDark);
  s.setProperty('--sidebar-active', colors.primary);
  s.setProperty('--user-bubble', colors.primary);
}
