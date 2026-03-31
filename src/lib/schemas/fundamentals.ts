import { z } from 'zod';

export const useOfProceedsItemSchema = z.object({
	category: z.string().min(1, 'Category is required'),
	percent: z
		.number()
		.int()
		.min(1, 'Must be at least 1%')
		.max(100, 'Cannot exceed 100%'),
	description: z.string().nullable().default(null)
});

export const useOfProceedsSchema = z
	.array(useOfProceedsItemSchema)
	.min(2, 'At least 2 use-of-proceeds categories are required')
	.superRefine((items, ctx) => {
		const total = items.reduce((sum, item) => sum + item.percent, 0);
		if (total !== 100) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Percentages must total 100% (currently ${total}%)`,
				path: []
			});
		}
		const hasDescription = items.some((item) => item.description && item.description.length > 0);
		if (!hasDescription) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'At least one category must include a description',
				path: []
			});
		}
	});

export const financialProjectionsSchema = z
	.object({
		hasProjections: z.boolean().nullable(),
		projectionSummary: z.string().nullable().default(null)
	})
	.superRefine((data, ctx) => {
		if (data.hasProjections === true && (!data.projectionSummary || data.projectionSummary.length < 50)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Please summarize your financial projections (at least 50 characters)',
				path: ['projectionSummary']
			});
		}
	});

export const teamQualificationsSchema = z
	.string()
	.min(100, 'Please provide more detail about your team (at least 100 characters)');

export const assumptionsSchema = z
	.string()
	.min(100, 'Please provide more detail about your market validation (at least 100 characters)');

export const whatFromInvestorsSchema = z
	.string()
	.min(1, 'Please describe what investors will receive');

export const principalReturnSchema = z
	.string()
	.min(1, 'Please describe how investors will get their principal back');

export const investorConsiderationSchema = z
	.string()
	.min(1, 'Please describe the total consideration investors will receive');

export type UseOfProceedsItem = z.infer<typeof useOfProceedsItemSchema>;
export type FinancialProjections = z.infer<typeof financialProjectionsSchema>;
