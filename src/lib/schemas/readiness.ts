import { z } from 'zod';

export const financialStatementStatuses = [
	'none',
	'internal_only',
	'compiled',
	'reviewed',
	'audited',
	'unknown'
] as const;

export const documentStatuses = ['none', 'draft', 'complete'] as const;

export const professionalStatuses = ['none', 'identified', 'engaged'] as const;

export const onlinePresenceLevels = ['weak', 'basic', 'established', 'strong'] as const;

export const capacityLevels = ['low', 'moderate', 'high'] as const;

export const readinessSchema = z.object({
	financialStatements: z.enum(financialStatementStatuses, {
		message: 'Financial statement status is required'
	}),
	businessPlan: z.enum(documentStatuses, { message: 'Business plan status is required' }),
	pitchDeck: z.enum(documentStatuses, { message: 'Pitch deck status is required' }),
	attorney: z.enum(professionalStatuses, { message: 'Attorney status is required' }),
	cpa: z.enum(professionalStatuses, { message: 'CPA status is required' }),
	marketing: z.enum(professionalStatuses, { message: 'Marketing support status is required' }),
	onlinePresence: z.enum(onlinePresenceLevels, { message: 'Online presence level is required' })
});

export const capacitySchema = z.object({
	leadershipTimeCapacity: z.enum(capacityLevels, {
		message: 'Leadership time capacity is required'
	}).nullable(),
	teamExecutionCapacity: z.enum(capacityLevels, {
		message: 'Team execution capacity is required'
	}).nullable(),
	canSupportCampaignFor90Days: z.boolean({
		message: 'Please indicate if you can support a 90-day campaign'
	}).nullable(),
	raiseBudgetUsd: z.number().int().min(0, 'Must be 0 or greater').nullable().default(null)
});

export type Readiness = z.infer<typeof readinessSchema>;
export type Capacity = z.infer<typeof capacitySchema>;
