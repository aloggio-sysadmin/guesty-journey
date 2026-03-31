'use strict';

/**
 * Centralized journey configuration — single source of truth for all journey types.
 * Each journey defines its stages, approved roles, role-stage mappings, and AI interview context.
 */

const JOURNEYS = {
  // ── GUEST JOURNEY (existing — preserved exactly) ──────────────────────
  guest: {
    id: 'guest',
    label: 'Guest Journey',
    persona: 'guest journey',
    subject: 'guest',
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
    stageDescriptions: {
      discovery: 'how guests find and research the property (browsing, reading reviews, comparing options)',
      booking: 'the reservation process (selecting dates, making a booking, receiving confirmation)',
      pre_arrival: 'what happens before the guest arrives (pre-stay emails, special requests, upsells)',
      check_in: 'the arrival experience (greeting, ID verification, room assignment, key handover)',
      in_stay: 'the guest experience during their stay (housekeeping, dining, activities, requests)',
      check_out: 'the departure process (settling the bill, returning keys, transport, farewell)',
      post_stay: 'follow-up after departure (thank-you messages, review requests, feedback)',
      re_engagement: 'bringing guests back (special offers, loyalty programmes, win-back outreach)'
    },
    approvedRoles: [
      'Regional General Manager',
      'Holiday / Hotel / Park Manager',
      'Assistant Holiday Manager, Hotel Operations',
      'Client Services',
      'Host / Inspector',
      'Reservations & Guest Services',
      'Call Centre Manager',
      'Trust',
      'Marketing / Digital Marketing',
      'Regulatory & Compliance'
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
    roleFocus: {
      'Regional General Manager': 'You are speaking with a senior leader who oversees multiple properties. Focus on strategic oversight, cross-property consistency, escalation paths, and how they ensure service quality across locations. Ask about their bird\'s-eye view of the guest experience and where they see the biggest operational challenges.',
      'Holiday / Hotel / Park Manager': 'You are speaking with someone who manages a property day-to-day. Focus on on-the-ground operations, staff coordination, guest complaints handling, property-specific processes, and how they balance guest satisfaction with operational efficiency.',
      'Assistant Holiday Manager, Hotel Operations': 'You are speaking with someone who supports property management and handles operational execution. Focus on hands-on processes, staff supervision, daily routines, guest issue resolution, and how they coordinate between departments.',
      'Client Services': 'You are speaking with someone who is a primary point of contact for guests and property stakeholders. Focus on guest communications, enquiry handling, complaint resolution, pre/post-stay touchpoints, and how they manage guest expectations.',
      'Host / Inspector': 'You are speaking with someone who physically inspects and prepares properties. Focus on property readiness standards, check-in/check-out inspections, quality assurance, what they look for during walkthroughs, and how they handle issues found on-site.',
      'Reservations & Guest Services': 'You are speaking with someone who handles bookings and guest enquiries. Focus on the enquiry-to-booking process, channel management (phone, email, OTAs), rate handling, special requests, and how they communicate with guests before arrival.',
      'Call Centre Manager': 'You are speaking with someone who manages inbound guest communications. Focus on call handling processes, common guest queries, escalation procedures, after-hours protocols, and how they measure service quality.',
      'Trust': 'You are speaking with someone who handles trust accounting and financial compliance. Focus on trust account processes, payment handling, reconciliation, owner disbursements, financial reporting, and regulatory compliance around guest funds.',
      'Marketing / Digital Marketing': 'You are speaking with someone who drives guest acquisition and re-engagement. Focus on how guests discover properties, digital channels, listing optimisation, campaign strategies, brand presence, and how they bring past guests back.',
      'Regulatory & Compliance': 'You are speaking with someone who ensures regulatory adherence. Focus on compliance requirements at each stage, licensing, safety standards, data privacy (guest information handling), and how compliance intersects with the guest experience.',
    }
  },

  // ── EMPLOYEE JOURNEY ──────────────────────────────────────────────────
  employee: {
    id: 'employee',
    label: 'Employee Journey',
    persona: 'employee journey',
    subject: 'employee',
    stages: [
      { id: 'recruitment',       label: 'Recruitment',       tip: 'Attracting, sourcing, and hiring talent' },
      { id: 'onboarding',        label: 'Onboarding',        tip: 'New employee induction, training, systems access, first weeks' },
      { id: 'daily_operations',  label: 'Daily Operations',  tip: 'Day-to-day work routines, tools, team coordination' },
      { id: 'development',       label: 'Development',       tip: 'Training, upskilling, career progression, mentoring' },
      { id: 'performance',       label: 'Performance',       tip: 'Reviews, KPIs, feedback cycles, goal setting' },
      { id: 'engagement',        label: 'Engagement',        tip: 'Culture, wellbeing, recognition, internal communication' },
      { id: 'transition',        label: 'Transition',        tip: 'Role changes, promotions, offboarding, exit process' },
    ],
    stageDescriptions: {
      recruitment: 'how talent is sourced, attracted, and hired (job postings, interviews, offers, onboarding pipeline)',
      onboarding: 'the new employee experience (induction, training, systems access, first weeks on the job)',
      daily_operations: 'day-to-day work routines, tools, team coordination, and operational workflows',
      development: 'training, upskilling, career progression, mentoring, and professional growth opportunities',
      performance: 'performance reviews, KPIs, feedback cycles, goal setting, and accountability',
      engagement: 'employee wellbeing, culture, recognition, internal communication, and team morale',
      transition: 'role changes, promotions, transfers, offboarding, and the exit process'
    },
    approvedRoles: [
      'Head of People and Culture',
      'Payroll Lead',
      'Regional General Manager',
      'Holiday / Hotel / Park Manager',
      'Hotel Operations Manager',
      'Call Centre Manager',
      'Change Manager',
      'Project Manager',
      'Head of Marketing',
      'Financial Controller'
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
    roleFocus: {
      'Head of People and Culture': 'You are speaking with the HR/People leader. Focus on recruitment strategies, onboarding programmes, employee development frameworks, performance management systems, culture initiatives, engagement surveys, and exit processes.',
      'Payroll Lead': 'You are speaking with someone who manages payroll operations. Focus on onboarding payroll setup, ongoing payroll processing, compliance, leave management, and offboarding financial processes.',
      'Regional General Manager': 'You are speaking with a senior leader overseeing regional teams. Focus on how they recruit and retain talent, develop team capability, manage performance across properties, and drive employee engagement.',
      'Holiday / Hotel / Park Manager': 'You are speaking with a property-level manager. Focus on how they hire and train their teams, manage day-to-day staff coordination, handle performance conversations, and maintain team morale on the ground.',
      'Hotel Operations Manager': 'You are speaking with someone who manages hotel operations staff. Focus on recruitment for operational roles, staff training, daily coordination, shift management, and performance tracking.',
      'Call Centre Manager': 'You are speaking with someone who leads a call centre team. Focus on hiring for call centre roles, agent training and onboarding, quality monitoring, daily workflow management, and team performance.',
      'Change Manager': 'You are speaking with someone who manages organisational change. Focus on how change impacts employees during onboarding, daily work, training needs, engagement, and transitions between roles or systems.',
      'Project Manager': 'You are speaking with someone who oversees project delivery with teams. Focus on how they coordinate team work, develop team skills, and manage performance within project contexts.',
      'Head of Marketing': 'You are speaking with the marketing leader. Focus on how they recruit and develop marketing talent, manage team workflows, and handle performance in a creative/analytical team.',
      'Financial Controller': 'You are speaking with the finance leader. Focus on finance team onboarding, daily accounting workflows, performance management for finance staff, and transition processes for finance roles.',
    }
  },

  // ── OWNER JOURNEY ─────────────────────────────────────────────────────
  owner: {
    id: 'owner',
    label: 'Owner Journey',
    persona: 'property owner journey',
    subject: 'property owner',
    stages: [
      { id: 'acquisition',        label: 'Acquisition',        tip: 'Sourcing, pitching, and signing new property owners' },
      { id: 'owner_onboarding',   label: 'Owner Onboarding',   tip: 'Contracts, listing setup, photography, pricing strategy' },
      { id: 'property_setup',     label: 'Property Setup',     tip: 'Standards, inspections, amenities, compliance readiness' },
      { id: 'active_management',  label: 'Active Management',  tip: 'Revenue management, maintenance, cleaning, guest coordination' },
      { id: 'reporting',          label: 'Reporting',          tip: 'Financial statements, trust distributions, performance reviews' },
      { id: 'retention',          label: 'Retention',          tip: 'Relationship management, satisfaction, contract renewals' },
      { id: 'offboarding',        label: 'Offboarding',        tip: 'Property exit, handover, final reconciliation' },
    ],
    stageDescriptions: {
      acquisition: 'how new property owners are sourced, pitched, and signed (lead generation, presentations, agreements)',
      owner_onboarding: 'the new owner experience (contracts, listing setup, photography, pricing strategy, system access)',
      property_setup: 'preparing the property (standards compliance, inspections, amenity checklists, readiness sign-off)',
      active_management: 'ongoing property management (revenue optimisation, maintenance, cleaning, guest coordination, issue handling)',
      reporting: 'owner reporting and financials (trust distributions, performance statements, occupancy and revenue reports)',
      retention: 'keeping owners satisfied (relationship management, proactive communication, renewal conversations, satisfaction tracking)',
      offboarding: 'when an owner exits (contract termination, final reconciliation, property handover, listing removal)'
    },
    approvedRoles: [
      'Business Development Manager',
      'Client Services',
      'Senior Client Services Executive',
      'Holiday / Hotel / Park Manager',
      'Regional General Manager',
      'Trust',
      'Trust Administrator',
      'Finance Manager - Trust Accounts',
      'Revenue Portfolio Manager',
      'Host / Inspector',
      'Maintenance & Landscaper'
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
    roleFocus: {
      'Business Development Manager': 'You are speaking with someone who acquires new property listings. Focus on how they source leads, pitch to property owners, manage the sign-up process, and hand over to the onboarding team.',
      'Client Services': 'You are speaking with someone who manages ongoing owner relationships. Focus on owner communications, issue handling, reporting, satisfaction tracking, and the renewal/exit process.',
      'Senior Client Services Executive': 'You are speaking with a senior owner relationship manager. Focus on complex owner escalations, portfolio oversight, retention strategies, vendor coordination, and commercial targets.',
      'Holiday / Hotel / Park Manager': 'You are speaking with a property manager. Focus on how they interact with owners regarding property standards, maintenance, revenue performance, and relationship management.',
      'Regional General Manager': 'You are speaking with a regional leader. Focus on owner acquisition strategy, portfolio growth, cross-property owner management, and owner satisfaction KPIs.',
      'Trust': 'You are speaking with someone in trust accounting. Focus on owner financial reporting, trust distributions, payment processing, and financial reconciliation during offboarding.',
      'Trust Administrator': 'You are speaking with someone who administers trust accounts. Focus on owner payment processing, statement generation, reconciliation, and compliance requirements.',
      'Finance Manager - Trust Accounts': 'You are speaking with a trust finance manager. Focus on trust account operations, owner distributions, financial controls, compliance, and end-of-contract financial processes.',
      'Revenue Portfolio Manager': 'You are speaking with someone who manages revenue for property portfolios. Focus on pricing strategies, market analysis, owner reporting on revenue performance, and optimisation.',
      'Host / Inspector': 'You are speaking with someone who inspects properties. Focus on property setup standards, condition assessments, owner-facing quality reports, and maintenance coordination.',
      'Maintenance & Landscaper': 'You are speaking with someone who maintains properties. Focus on property setup requirements, ongoing maintenance workflows, vendor coordination, and owner communication about property condition.',
    }
  },

  // ── VENDOR JOURNEY ────────────────────────────────────────────────────
  vendor: {
    id: 'vendor',
    label: 'Vendor Journey',
    persona: 'vendor journey',
    subject: 'vendor',
    stages: [
      { id: 'sourcing',           label: 'Sourcing',           tip: 'Finding, evaluating, and selecting vendors and suppliers' },
      { id: 'vendor_onboarding',  label: 'Vendor Onboarding',  tip: 'Contracts, compliance, credentials, system setup' },
      { id: 'service_delivery',   label: 'Service Delivery',   tip: 'Active service provision, quality standards, SLAs' },
      { id: 'performance_review', label: 'Performance Review', tip: 'Quality checks, KPI monitoring, feedback' },
      { id: 'financial',          label: 'Financial',          tip: 'Invoicing, payments, reconciliation, dispute resolution' },
      { id: 'relationship',       label: 'Relationship',       tip: 'Communication, issue resolution, escalation paths' },
      { id: 'renewal_exit',       label: 'Renewal / Exit',     tip: 'Contract renewal, termination, vendor replacement' },
    ],
    stageDescriptions: {
      sourcing: 'how vendors are found, evaluated, and selected (RFQs, comparisons, references, approvals)',
      vendor_onboarding: 'the vendor setup process (contracts, compliance checks, credentials, system access, SLA agreements)',
      service_delivery: 'active service provision (quality standards, SLA adherence, day-to-day coordination, issue handling)',
      performance_review: 'vendor performance management (quality checks, KPI monitoring, feedback, scorecards)',
      financial: 'vendor financial management (invoicing, payment processing, reconciliation, dispute resolution)',
      relationship: 'ongoing vendor relationship management (communication, issue escalation, strategic alignment)',
      renewal_exit: 'contract lifecycle decisions (renewal negotiations, termination, transition to replacement vendors)'
    },
    approvedRoles: [
      'Head of Logistics and Operations',
      'Senior Accounts Officer',
      'Head Housekeeper',
      'MLR Services Manager',
      'Hotel Operations Manager',
      'Maintenance & Landscaper',
      'Park Manager',
      'Business Support Manager'
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
    roleFocus: {
      'Head of Logistics and Operations': 'You are speaking with someone who oversees the full vendor and supply chain. Focus on vendor sourcing strategies, onboarding processes, SLA management, performance tracking, financial oversight, and contract lifecycle management.',
      'Senior Accounts Officer': 'You are speaking with someone who manages vendor finances. Focus on vendor payment processing, invoice management, reconciliation, financial onboarding, and contract financial terms.',
      'Head Housekeeper': 'You are speaking with someone who manages cleaning vendors. Focus on how cleaning vendors are sourced and onboarded, quality standards, service delivery coordination, and performance monitoring.',
      'MLR Services Manager': 'You are speaking with someone who manages laundry and related service vendors. Focus on vendor sourcing, onboarding, service delivery standards, quality management, and relationship coordination.',
      'Hotel Operations Manager': 'You are speaking with someone who coordinates operational vendors at properties. Focus on how they source and work with vendors, manage day-to-day service delivery, and handle performance issues.',
      'Maintenance & Landscaper': 'You are speaking with someone who works with maintenance contractors. Focus on how contractors are sourced, how service delivery is coordinated, and how quality is monitored on-site.',
      'Park Manager': 'You are speaking with someone who manages park operations and vendors. Focus on vendor sourcing for park services, onboarding processes, service delivery coordination, and performance management.',
      'Business Support Manager': 'You are speaking with someone who provides business support including vendor coordination. Focus on vendor onboarding, service delivery coordination, financial administration, and relationship management.',
    }
  }
};

// ── Helper functions ────────────────────────────────────────────────────
const JOURNEY_TYPES = Object.keys(JOURNEYS);

function getJourney(type) {
  return JOURNEYS[type] || JOURNEYS.guest;
}

function getAllStageIds(type) {
  return getJourney(type).stages.map(s => s.id);
}

function getAllValidStageIds() {
  const ids = new Set();
  for (const j of Object.values(JOURNEYS)) {
    for (const s of j.stages) ids.add(s.id);
  }
  return [...ids];
}

function getApprovedRoles(type) {
  return getJourney(type).approvedRoles;
}

function getRoleFocus(type, role) {
  const journey = getJourney(type);
  return journey.roleFocus[role] || '';
}

function getStageDescriptions(type) {
  return getJourney(type).stageDescriptions;
}

function getRoleStageMap(type) {
  return getJourney(type).roleStageMap;
}

function getFirstStage(type) {
  const stages = getJourney(type).stages;
  return stages.length > 0 ? stages[0].id : 'discovery';
}

module.exports = {
  JOURNEYS,
  JOURNEY_TYPES,
  getJourney,
  getAllStageIds,
  getAllValidStageIds,
  getApprovedRoles,
  getRoleFocus,
  getStageDescriptions,
  getRoleStageMap,
  getFirstStage
};
