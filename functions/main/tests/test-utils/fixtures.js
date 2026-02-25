'use strict';

const SMERegister = [
  {
    sme_id: 'SME-001',
    full_name: 'Alice Chen',
    role: 'Front Office Manager',
    department: 'Front Office',
    location: 'Sydney',
    contact_json: JSON.stringify({ email: 'alice@hotel.com', phone: '+61 2 9000 0001' }),
    domains_json: JSON.stringify(['reservations', 'check-in']),
    journey_stages_owned_json: JSON.stringify(['discovery', 'pre_arrival', 'check_in']),
    systems_used_json: JSON.stringify(['Opera PMS']),
    interview_status: 'completed',
    validated_by_sme: false,
    notes: '',
    created_at: '2025-01-10T09:00:00.000Z',
    updated_at: '2025-01-15T11:00:00.000Z'
  },
  {
    sme_id: 'SME-002',
    full_name: 'Bob Martinez',
    role: 'F&B Manager',
    department: 'Food & Beverage',
    location: 'Sydney',
    contact_json: JSON.stringify({ email: 'bob@hotel.com', phone: '+61 2 9000 0002' }),
    domains_json: JSON.stringify(['restaurant', 'room service']),
    journey_stages_owned_json: JSON.stringify(['in_stay']),
    systems_used_json: JSON.stringify(['Infrasys POS', 'Opera PMS']),
    interview_status: 'in_progress',
    validated_by_sme: false,
    notes: '',
    created_at: '2025-01-11T09:00:00.000Z',
    updated_at: '2025-01-11T09:00:00.000Z'
  }
];

const Users = [
  {
    user_id: 'USER-001',
    email: 'admin@hotel.com',
    // bcrypt hash of 'password123'
    password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    full_name: 'System Admin',
    role: 'admin',
    is_active: true,
    last_login: '2025-01-15T08:00:00.000Z',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-15T08:00:00.000Z'
  },
  {
    user_id: 'USER-002',
    email: 'interviewer@hotel.com',
    password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    full_name: 'Jane Interviewer',
    role: 'interviewer',
    is_active: true,
    last_login: null,
    created_at: '2025-01-05T00:00:00.000Z',
    updated_at: '2025-01-05T00:00:00.000Z'
  }
];

const Sessions = [
  {
    session_id: 'SESSION-001',
    sme_id: 'SME-001',
    interviewer_user_id: 'USER-002',
    session_date: '2025-01-15T10:00:00.000Z',
    duration_minutes: 45,
    method: 'interview',
    summary: '',
    conversation_state_json: JSON.stringify({
      current_stage: 'discovery',
      current_topic: '',
      topics_covered: [],
      topics_remaining: ['pre_arrival', 'check_in'],
      should_move_to_next_stage: false,
      stage_completion_estimate: 0
    }),
    status: 'active',
    created_at: '2025-01-15T10:00:00.000Z',
    closed_at: ''
  }
];

const ChatHistory = [
  {
    message_id: 'MSG-001',
    session_id: 'SESSION-001',
    role: 'agent',
    content: "Hello! I'm your journey mapping assistant. Tell me about reservations.",
    extractions_json: JSON.stringify({ systems: [], process_steps: [], gaps: [] }),
    conflicts_json: '[]',
    open_questions_json: '[]',
    conversation_state_json: JSON.stringify({ current_stage: 'discovery', stage_completion_estimate: 5 }),
    chat_history_timestamp: '2025-01-15T10:00:30.000Z'
  },
  {
    message_id: 'MSG-002',
    session_id: 'SESSION-001',
    role: 'user',
    content: 'We use Opera PMS for all reservations.',
    extractions_json: '{}',
    conflicts_json: '[]',
    open_questions_json: '[]',
    conversation_state_json: '{}',
    chat_history_timestamp: '2025-01-15T10:01:15.000Z'
  }
];

const TechEcosystem = [
  {
    system_id: 'SYS-001',
    system_name: 'Opera PMS',
    vendor: 'Oracle Hospitality',
    category: 'Property Management',
    primary_owner_sme_id: 'SME-001',
    users_json: JSON.stringify(['SME-001', 'SME-002']),
    environment: 'production',
    integration_links_json: JSON.stringify([{ system_name: 'Channel Manager', type: 'two-way' }]),
    manual_workarounds_json: '[]',
    source_sme_ids_json: JSON.stringify(['SME-001']),
    created_by: 'USER-002',
    created_at: '2025-01-15T10:05:00.000Z',
    updated_at: '2025-01-15T10:05:00.000Z'
  }
];

const ProcessInventory = [
  {
    process_id: 'PROC-001',
    process_name: 'Reservation Confirmation',
    journey_stage: 'discovery',
    sub_stage: '',
    owner_sme_id: 'SME-001',
    supporting_sme_ids_json: JSON.stringify(['SME-001']),
    trigger_json: '{}',
    steps_json: JSON.stringify([
      { description: 'Booking received in Opera PMS', sequence_number: 1 },
      { description: 'Confirmation email auto-sent', sequence_number: 2 }
    ]),
    handoffs_json: '[]',
    maturity: 'documented',
    as_documented: 'System auto-sends confirmation on booking',
    as_practiced: 'System auto-sends confirmation on booking',
    discrepancy_flag: false,
    discrepancy_notes: '',
    source_sme_ids_json: JSON.stringify(['SME-001']),
    conflict_flag: false,
    conflict_notes: '',
    created_by: 'USER-002',
    created_at: '2025-01-15T10:10:00.000Z',
    updated_at: '2025-01-15T10:10:00.000Z'
  }
];

const GapRegister = [
  {
    gap_id: 'GAP-001',
    title: 'Manual F&B data transfer',
    description: 'Staff manually copy reservation notes from PMS to F&B system.',
    journey_stage_id: 'pre_arrival',
    process_id: '',
    source_sme_ids_json: JSON.stringify(['SME-001']),
    gap_type: 'missing_integration',
    root_cause: 'No API between Opera PMS and F&B system',
    frequency: 'daily',
    guest_impact: 'high',
    business_impact: 'Staff time, error risk',
    financial_impact_estimate: '',
    confirmed_by_multiple_smes: false,
    conflict_with_sme_ids_json: '[]',
    opportunity_json: '{}',
    status: 'open',
    created_by: 'USER-002',
    created_at: '2025-01-15T10:15:00.000Z',
    updated_at: '2025-01-15T10:15:00.000Z'
  }
];

const ConflictLog = [
  {
    conflict_id: 'CONF-001',
    description: 'Alice states F&B system has no API; Bob states API exists but is unconfigured.',
    conflict_type: 'system_discrepancy',
    journey_stage: 'pre_arrival',
    process_id: '',
    sme_a_id: 'SME-001',
    sme_b_id: 'SME-002',
    sme_a_claim: 'No API integration',
    sme_b_claim: 'API exists but unconfigured',
    status: 'open',
    resolution_method: '',
    resolution_notes: '',
    resolved_by: '',
    created_by: 'USER-002',
    created_at: '2025-01-15T10:20:00.000Z',
    updated_at: '2025-01-15T10:20:00.000Z'
  }
];

const JourneyMap = [
  {
    stage_id: 'STAGE-001',
    journey_stage: 'discovery',
    stage_description: 'Guest discovers and books the hotel.',
    guest_actions_json: JSON.stringify(['Searches online', 'Makes booking']),
    frontstage_interactions_json: JSON.stringify([{ touchpoint_name: 'Booking confirmation', channel: 'Email' }]),
    backstage_processes_json: JSON.stringify([{ description: 'Reservation enters Opera PMS' }]),
    technology_touchpoints_json: JSON.stringify(['Opera PMS']),
    failure_points_json: '[]',
    supporting_process_ids_json: JSON.stringify(['PROC-001']),
    supporting_sme_ids_json: JSON.stringify(['SME-001']),
    created_by: 'USER-002',
    created_at: '2025-01-15T10:25:00.000Z',
    updated_at: '2025-01-15T10:25:00.000Z'
  }
];

const ProjectState = [
  {
    project_id: 'PROJ-001',
    project_name: 'Guest Journey Mapping',
    total_smes: 4,
    interviewed_smes: 2,
    total_stages: 8,
    mapped_stages: 1,
    completion_json: JSON.stringify({ overall: 25, discovery: 100 }),
    last_updated: '2025-01-15T10:30:00.000Z'
  }
];

const Counters = [
  { counter_name: 'SME',     current_value: '2',  prefix: 'SME-',     padding: '3' },
  { counter_name: 'SESSION', current_value: '1',  prefix: 'SESSION-', padding: '3' },
  { counter_name: 'MSG',     current_value: '2',  prefix: 'MSG-',     padding: '3' },
  { counter_name: 'SYS',     current_value: '1',  prefix: 'SYS-',     padding: '3' },
  { counter_name: 'PROC',    current_value: '1',  prefix: 'PROC-',    padding: '3' },
  { counter_name: 'STAGE',   current_value: '1',  prefix: 'STAGE-',   padding: '3' },
  { counter_name: 'GAP',     current_value: '1',  prefix: 'GAP-',     padding: '3' },
  { counter_name: 'CONF',    current_value: '1',  prefix: 'CONF-',    padding: '3' },
  { counter_name: 'TP',      current_value: '0',  prefix: 'TP-',      padding: '3' },
  { counter_name: 'Q',       current_value: '0',  prefix: 'Q-',       padding: '3' },
  { counter_name: 'USER',    current_value: '2',  prefix: 'USER-',    padding: '3' }
];

function fullStore() {
  const addRowIds = (arr) => arr.map((r, i) => ({ ROWID: String(i + 1), ...r }));
  return {
    SMERegister: addRowIds(SMERegister),
    Users: addRowIds(Users),
    Sessions: addRowIds(Sessions),
    ChatHistory: addRowIds(ChatHistory),
    TechEcosystem: addRowIds(TechEcosystem),
    ProcessInventory: addRowIds(ProcessInventory),
    GapRegister: addRowIds(GapRegister),
    ConflictLog: addRowIds(ConflictLog),
    JourneyMap: addRowIds(JourneyMap),
    ProjectState: addRowIds(ProjectState),
    Counters: addRowIds(Counters),
    OpenQuestions: []
  };
}

module.exports = {
  SMERegister, Users, Sessions, ChatHistory,
  TechEcosystem, ProcessInventory, GapRegister, ConflictLog,
  JourneyMap, ProjectState, Counters,
  fullStore
};
