import { z } from 'zod';

export const securityTypes = [
	'equity',
	'debt',
	'revenue_share',
	'safe',
	'convertible_note',
	'other'
] as const;

export const exemptionTargets = [
	'reg_cf',
	'reg_d_506b',
	'reg_d_506c',
	'undecided',
	'other'
] as const;

export const offeringSchema = z
	.object({
		securityType: z.enum(securityTypes, { message: 'Security type is required' }),
		securityTypeOther: z.string().nullable().default(null),
		exemptionTarget: z.enum(exemptionTargets, { message: 'Exemption target is required' }),
		raiseTargetUsd: z
			.number()
			.int()
			.positive('Raise target must be a positive amount')
			.nullable(),
		minimumRaiseUsd: z
			.number()
			.int()
			.positive('Minimum raise must be a positive amount')
			.nullable(),
		maximumRaiseUsd: z
			.number()
			.int()
			.positive('Maximum raise must be a positive amount')
			.nullable(),
		minimumInvestmentUsd: z
			.number()
			.int()
			.positive('Minimum investment must be a positive amount')
			.nullable()
			.default(null),
		offeringDescription: z.string().nullable().default(null)
	})
	.superRefine((data, ctx) => {
		if (data.securityType === 'other' && (!data.securityTypeOther || data.securityTypeOther.length < 1)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Please describe the security type',
				path: ['securityTypeOther']
			});
		}
		if (
			data.minimumRaiseUsd !== null &&
			data.maximumRaiseUsd !== null &&
			data.maximumRaiseUsd < data.minimumRaiseUsd
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Maximum raise must be greater than or equal to minimum raise',
				path: ['maximumRaiseUsd']
			});
		}
		if (
			data.raiseTargetUsd !== null &&
			data.minimumRaiseUsd !== null &&
			data.maximumRaiseUsd !== null
		) {
			if (data.raiseTargetUsd < data.minimumRaiseUsd || data.raiseTargetUsd > data.maximumRaiseUsd) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Raise target must be between minimum and maximum raise amounts',
					path: ['raiseTargetUsd']
				});
			}
		}
	});

export type Offering = z.infer<typeof offeringSchema>;
