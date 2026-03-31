import { z } from 'zod';
import { companySchema } from './company.js';
import { regulatorySchema } from './regulatory.js';
import { offeringSchema } from './offering.js';
import {
	useOfProceedsSchema,
	financialProjectionsSchema,
	teamQualificationsSchema,
	assumptionsSchema,
	whatFromInvestorsSchema,
	principalReturnSchema,
	investorConsiderationSchema
} from './fundamentals.js';
import { readinessSchema, capacitySchema } from './readiness.js';
import { timelineSchema } from './timeline.js';
import { contactSchema } from './contact.js';
import { consentSchema } from './consent.js';

// Step 1: Company Information
export const step1Schema = companySchema;

// Step 2: Regulatory History
export const step2Schema = regulatorySchema;

// Step 3: Offering Structure
export const step3Schema = offeringSchema;

// Step 4: Use of Proceeds
export const step4Schema = z.object({
	useOfProceeds: useOfProceedsSchema
});

// Step 5: Financial Condition
export const step5Schema = z.object({
	financialStatements: readinessSchema.shape.financialStatements,
	financialProjections: financialProjectionsSchema
});

// Step 6: Team & Qualifications
export const step6Schema = z.object({
	teamQualifications: teamQualificationsSchema
});

// Step 7: Market & Validation
export const step7Schema = z.object({
	assumptions: assumptionsSchema
});

// Step 8: Investor Returns
export const step8Schema = z.object({
	whatFromInvestors: whatFromInvestorsSchema,
	principalReturn: principalReturnSchema,
	investorConsideration: investorConsiderationSchema
});

// Step 9: Documentation Status
export const step9Schema = z.object({
	businessPlan: readinessSchema.shape.businessPlan,
	pitchDeck: readinessSchema.shape.pitchDeck
});

// Step 10: Professional Team
export const step10Schema = z.object({
	attorney: readinessSchema.shape.attorney,
	cpa: readinessSchema.shape.cpa,
	marketing: readinessSchema.shape.marketing
});

// Step 11: Capacity & Resources
export const step11Schema = z.object({
	onlinePresence: readinessSchema.shape.onlinePresence,
	leadershipTimeCapacity: capacitySchema.shape.leadershipTimeCapacity,
	teamExecutionCapacity: capacitySchema.shape.teamExecutionCapacity,
	canSupportCampaignFor90Days: capacitySchema.shape.canSupportCampaignFor90Days
});

// Step 12: Timeline & Awareness
export const step12Schema = timelineSchema;

// Step 13: Review & Submit (contact + consent)
export const step13Schema = z.object({
	contact: contactSchema,
	consent: consentSchema
});

export const stepSchemas = [
	step1Schema,
	step2Schema,
	step3Schema,
	step4Schema,
	step5Schema,
	step6Schema,
	step7Schema,
	step8Schema,
	step9Schema,
	step10Schema,
	step11Schema,
	step12Schema,
	step13Schema
] as const;

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export function getStepSchema(step: StepNumber) {
	return stepSchemas[step - 1];
}
