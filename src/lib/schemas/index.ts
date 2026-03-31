import { z } from 'zod';
import { applicationMetaSchema } from './application.js';
import { contactSchema } from './contact.js';
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
import { consentSchema } from './consent.js';
import { analyticsSchema } from './analytics.js';

export const scoringSchema = z.object({
	totalScore: z.number().nullable().default(null),
	band: z
		.enum(['qualified', 'qualified_with_reservations', 'not_qualified'])
		.nullable()
		.default(null),
	criteria: z.object({
		businessModel: z.number().default(0),
		fundingNeedAndUse: z.number().default(0),
		regulatoryReadiness: z.number().default(0),
		teamAndCapacity: z.number().default(0),
		budget: z.number().default(0),
		timeline: z.number().default(0),
		marketOpportunity: z.number().default(0)
	}),
	flags: z.array(z.string()).default([])
});

export const fullApplicationSchema = applicationMetaSchema.extend({
	contact: contactSchema,
	company: companySchema,
	regulatoryHistory: regulatorySchema,
	offering: offeringSchema,
	fundamentals: z.object({
		useOfProceeds: useOfProceedsSchema,
		financialProjections: financialProjectionsSchema,
		teamQualifications: teamQualificationsSchema,
		assumptions: assumptionsSchema,
		whatFromInvestors: whatFromInvestorsSchema,
		principalReturn: principalReturnSchema,
		investorConsideration: investorConsiderationSchema
	}),
	readiness: readinessSchema,
	capacity: capacitySchema,
	timeline: timelineSchema,
	consent: consentSchema,
	analytics: analyticsSchema,
	scoring: scoringSchema
});

export type ApplicationData = z.infer<typeof fullApplicationSchema>;
export type ScoringResult = z.infer<typeof scoringSchema>;

// Re-export all schemas
export { applicationMetaSchema } from './application.js';
export { contactSchema } from './contact.js';
export { companySchema } from './company.js';
export { regulatorySchema } from './regulatory.js';
export { offeringSchema } from './offering.js';
export {
	useOfProceedsSchema,
	useOfProceedsItemSchema,
	financialProjectionsSchema,
	teamQualificationsSchema,
	assumptionsSchema,
	whatFromInvestorsSchema,
	principalReturnSchema,
	investorConsiderationSchema
} from './fundamentals.js';
export { readinessSchema, capacitySchema } from './readiness.js';
export { timelineSchema } from './timeline.js';
export { consentSchema } from './consent.js';
export { analyticsSchema } from './analytics.js';
