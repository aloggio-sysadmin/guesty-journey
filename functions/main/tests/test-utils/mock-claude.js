'use strict';

/**
 * Pre-built Claude response mocks.
 * Use jest.mock('../services/claude-client') in test files and
 * return these objects from the mock implementation.
 */

const OPENING_MESSAGE_RESPONSE = {
  reply: "Hello! I'm your journey mapping assistant. I'd love to learn about your role in the discovery and pre-arrival stage. Could you start by telling me what systems you use when a guest first makes a reservation?",
  extractions: {
    systems: [],
    process_steps: [],
    gaps: [],
    journey_touchpoints: [],
    sme_updates: {}
  },
  conflicts_detected: [],
  open_questions: [],
  conversation_state: {
    current_stage: 'discovery',
    current_topic: 'reservation systems',
    topics_covered: [],
    topics_remaining: [],
    should_move_to_next_stage: false,
    stage_completion_estimate: 10
  }
};

const EXTRACTION_RESPONSE = {
  reply: "That's great. So you use Opera PMS for reservations and it integrates with the channel manager. I've noted that down. What happens after a booking is confirmed — how does the pre-arrival team get notified?",
  extractions: {
    systems: [
      {
        system_name: 'Opera PMS',
        vendor: 'Oracle Hospitality',
        category: 'Property Management',
        is_new: true,
        integration_with: ['Channel Manager']
      }
    ],
    process_steps: [
      {
        description: 'Guest makes reservation via OTA or direct booking',
        journey_stage: 'discovery',
        belongs_to_process: null,
        sequence_number: 1
      }
    ],
    gaps: [],
    journey_touchpoints: [
      {
        touchpoint_name: 'Reservation Confirmation',
        journey_stage: 'discovery',
        channel: 'Email',
        description: 'Automated confirmation sent via Opera'
      }
    ],
    sme_updates: { new_systems_used: ['Opera PMS'], new_domains: [], new_stages_owned: [] }
  },
  conflicts_detected: [],
  open_questions: ['How does the pre-arrival team get notified?'],
  conversation_state: {
    current_stage: 'discovery',
    current_topic: 'reservation confirmation',
    topics_covered: ['reservation systems'],
    topics_remaining: [],
    should_move_to_next_stage: false,
    stage_completion_estimate: 35
  }
};

const GAP_RESPONSE = {
  reply: "Interesting — so there's a manual step where staff copy reservation details into a separate spreadsheet because the PMS doesn't integrate with your F&B system. That sounds like a significant gap. How often does this cause issues?",
  extractions: {
    systems: [
      { system_name: 'F&B System', vendor: '', category: 'Food & Beverage', is_new: true, integration_with: [] }
    ],
    process_steps: [],
    gaps: [
      {
        title: 'Manual data transfer between PMS and F&B system',
        description: 'Staff manually copy reservation details into a spreadsheet because PMS and F&B system are not integrated.',
        gap_type: 'missing_integration',
        root_cause: 'No API integration between Opera PMS and F&B system',
        frequency: 'daily',
        guest_impact: 'high'
      }
    ],
    journey_touchpoints: [],
    sme_updates: {}
  },
  conflicts_detected: [],
  open_questions: [],
  conversation_state: {
    current_stage: 'pre_arrival',
    current_topic: 'F&B integration gap',
    topics_covered: ['reservation systems', 'reservation confirmation'],
    topics_remaining: [],
    should_move_to_next_stage: false,
    stage_completion_estimate: 60
  }
};

const CONFLICT_RESPONSE = {
  reply: "That's helpful context. I should mention that a previous SME indicated the F&B system does have an API — this may be worth clarifying. Moving on, can you walk me through the check-in process?",
  extractions: {
    systems: [],
    process_steps: [],
    gaps: [],
    journey_touchpoints: [],
    sme_updates: {}
  },
  conflicts_detected: [
    {
      description: 'SME-001 states F&B system has no API integration; previous SME states it does.',
      conflict_type: 'system_discrepancy',
      journey_stage: 'pre_arrival',
      field_name: 'integration_links_json',
      sme_a_id: 'SME-001',
      sme_b_id: 'SME-002',
      sme_a_claim: 'No API integration exists',
      sme_b_claim: 'API integration exists but is not configured'
    }
  ],
  open_questions: ['Confirm whether F&B system API integration exists'],
  conversation_state: {
    current_stage: 'pre_arrival',
    current_topic: 'check-in',
    topics_covered: ['reservation systems', 'reservation confirmation', 'F&B integration gap'],
    topics_remaining: [],
    should_move_to_next_stage: false,
    stage_completion_estimate: 75
  }
};

const STAGE_COMPLETE_RESPONSE = {
  reply: "We've covered the key aspects of the pre-arrival stage thoroughly. I have a good understanding of the systems, processes, and gaps in this area. Shall we move on to the check-in stage?",
  extractions: {
    systems: [], process_steps: [], gaps: [], journey_touchpoints: [], sme_updates: {}
  },
  conflicts_detected: [],
  open_questions: [],
  conversation_state: {
    current_stage: 'pre_arrival',
    current_topic: '',
    topics_covered: ['reservation systems', 'reservation confirmation', 'F&B integration gap'],
    topics_remaining: ['check_in'],
    should_move_to_next_stage: true,
    stage_completion_estimate: 95
  }
};

const EXECUTIVE_SUMMARY_RESPONSE = {
  reply: `Executive Summary — Guest Journey Mapping Project

OVERVIEW
The mapping exercise has covered 3 key journey stages with input from 4 subject matter experts, documenting 12 processes, 8 technology systems, and 6 gaps.

KEY FINDINGS
• Opera PMS is the central system but lacks integrations with F&B and Housekeeping platforms
• Manual data entry creates significant risk in the pre-arrival and check-in stages
• Guest communication touchpoints are inconsistent across channels

CRITICAL GAPS
• No automated data transfer between PMS and F&B system (High impact — daily occurrence)
• Check-in verification process not documented; practitioners follow different procedures

STRATEGIC RECOMMENDATIONS
1. Prioritise PMS integration with F&B and Housekeeping systems
2. Standardise and document the check-in verification SOP
3. Implement automated pre-arrival guest communication workflow`
};

const SESSION_SUMMARY_RESPONSE = {
  reply: 'Session summary: Documented the discovery and pre-arrival stages. Key finding: PMS integration gap with F&B system. Extracted 2 systems, 1 process, 1 gap, 1 conflict. Recommended next: resolve F&B integration conflict and document check-in stage.'
};

module.exports = {
  OPENING_MESSAGE_RESPONSE,
  EXTRACTION_RESPONSE,
  GAP_RESPONSE,
  CONFLICT_RESPONSE,
  STAGE_COMPLETE_RESPONSE,
  EXECUTIVE_SUMMARY_RESPONSE,
  SESSION_SUMMARY_RESPONSE
};
