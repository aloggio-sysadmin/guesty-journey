'use strict';

const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  full_name: Joi.string().required(),
  role: Joi.string().valid('admin', 'interviewer').required()
});

const bulkImportSchema = Joi.object({
  csv: Joi.string().required()
});

const startSessionSchema = Joi.object({
  sme_id: Joi.string().optional(),
  sme_name: Joi.string().optional(),
  sme_role: Joi.string().optional(),
  sme_department: Joi.string().optional(),
  sme_location: Joi.string().optional(),
  sme_email: Joi.string().email().optional(),
  sme_phone: Joi.string().optional(),
  journey_stages: Joi.array().items(Joi.string()).optional()
});

const sendMessageSchema = Joi.object({
  content: Joi.string().max(5000).required()
});

const quickActionSchema = Joi.object({
  action: Joi.string().valid('next','done','pause','summary','status','back','correct','help').required(),
  record_id: Joi.string().optional()
});

const JOURNEY_STAGES = ['discovery','booking','pre_arrival','check_in','in_stay','check_out','post_stay','re_engagement'];

const smeCreateSchema = Joi.object({
  full_name: Joi.string().required(),
  role: Joi.string().required(),
  department: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
  contact_json: Joi.alternatives().try(Joi.object(), Joi.string()).optional(),
  domains_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  journey_stages_owned_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  systems_used_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional()
});

const smeUpdateSchema = smeCreateSchema.fork(
  ['full_name','role'], schema => schema.optional()
);

const techCreateSchema = Joi.object({
  system_name: Joi.string().required(),
  vendor: Joi.string().optional().allow(''),
  category: Joi.string().valid('PMS','CRM','Channel Manager','Accounting','Communication','Operations','Compliance','Analytics','Other').required(),
  environment: Joi.string().valid('production','staging','legacy','being_replaced').optional(),
  primary_owner_sme_id: Joi.string().optional().allow(''),
  users_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  integration_links_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  manual_workarounds_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  source_sme_ids_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional()
});

const techUpdateSchema = techCreateSchema.fork(
  ['system_name','category'], schema => schema.optional()
);

const processCreateSchema = Joi.object({
  process_name: Joi.string().required(),
  journey_stage: Joi.string().valid(...JOURNEY_STAGES).required(),
  sub_stage: Joi.string().optional().allow(''),
  owner_sme_id: Joi.string().optional().allow(''),
  supporting_sme_ids_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  trigger_json: Joi.alternatives().try(Joi.object(), Joi.string()).optional(),
  steps_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  handoffs_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  maturity: Joi.string().valid('ad_hoc','documented','standardised','optimised').optional(),
  as_documented: Joi.string().optional().allow(''),
  as_practiced: Joi.string().optional().allow(''),
  source_sme_ids_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional()
});

const processUpdateSchema = processCreateSchema.fork(
  ['process_name','journey_stage'], schema => schema.optional()
);

const journeyCreateSchema = Joi.object({
  journey_stage: Joi.string().valid(...JOURNEY_STAGES).required(),
  stage_description: Joi.string().optional().allow(''),
  guest_actions_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  frontstage_interactions_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  backstage_processes_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  technology_touchpoints_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  failure_points_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  supporting_process_ids_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  supporting_sme_ids_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional()
});

const journeyUpdateSchema = journeyCreateSchema.fork(
  ['journey_stage'], schema => schema.optional()
);

const gapCreateSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  journey_stage_id: Joi.string().optional().allow(''),
  process_id: Joi.string().optional().allow(''),
  source_sme_ids_json: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  gap_type: Joi.string().valid('broken_handoff','missing_process','manual_workaround','data_loss','system_gap','communication_failure','compliance_risk','guest_experience','other').optional(),
  root_cause: Joi.string().optional().allow(''),
  frequency: Joi.string().valid('rare','occasional','frequent','systemic').optional(),
  guest_impact: Joi.string().valid('none','low','medium','high','critical').optional(),
  business_impact: Joi.string().optional().allow(''),
  financial_impact_estimate: Joi.string().optional().allow(''),
  opportunity_json: Joi.alternatives().try(Joi.object(), Joi.string()).optional(),
  status: Joi.string().valid('open','in_progress','resolved','wont_fix').optional()
});

const gapUpdateSchema = gapCreateSchema.fork(
  ['title'], schema => schema.optional()
);

const conflictCreateSchema = Joi.object({
  conflict_type: Joi.string().valid('process_discrepancy','data_inconsistency','technology_mismatch','ownership_dispute','system_discrepancy','other').optional(),
  description: Joi.string().required(),
  journey_stage: Joi.string().optional().allow(''),
  process_id: Joi.string().optional().allow(''),
  sme_a_id: Joi.string().required(),
  sme_b_id: Joi.string().optional().allow(''),
  sme_a_claim: Joi.string().optional().allow(''),
  sme_b_claim: Joi.string().optional().allow('')
});

const conflictResolveSchema = Joi.object({
  resolution_notes: Joi.string().required()
});

const smeSessionStartSchema = Joi.object({
  token: Joi.string().required()
});

const smeSessionMessageSchema = Joi.object({
  content: Joi.string().max(5000).required(),
  token: Joi.string().required()
});

function validate(schema, data) {
  const result = schema.validate(data, { abortEarly: false, allowUnknown: false, stripUnknown: true });
  return { error: result.error ? result.error.details.map(d => d.message).join('; ') : null, value: result.value };
}

module.exports = {
  validate,
  loginSchema, registerSchema, bulkImportSchema,
  startSessionSchema, sendMessageSchema, quickActionSchema,
  smeCreateSchema, smeUpdateSchema,
  techCreateSchema, techUpdateSchema,
  processCreateSchema, processUpdateSchema,
  journeyCreateSchema, journeyUpdateSchema,
  gapCreateSchema, gapUpdateSchema,
  conflictCreateSchema, conflictResolveSchema,
  smeSessionStartSchema, smeSessionMessageSchema
};
