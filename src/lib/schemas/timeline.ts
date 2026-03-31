import { z } from 'zod';

export const timelineExpectations = [
	'lt_30_days',
	'1_to_3_months',
	'3_to_6_months',
	'6_plus_months',
	'unknown'
] as const;

export const timelineSchema = z
	.object({
		desiredLaunchDate: z.string().nullable().default(null),
		timelineExpectation: z.enum(timelineExpectations, {
			message: 'Timeline expectation is required'
		}),
		understandsPreparationTime: z.boolean({
			message: 'Please indicate if you understand preparation requirements'
		}).nullable()
	})
	.superRefine((data, ctx) => {
		if (data.desiredLaunchDate) {
			const launchDate = new Date(data.desiredLaunchDate);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			if (launchDate < today) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Launch date cannot be in the past',
					path: ['desiredLaunchDate']
				});
			}
		}
	});

export type Timeline = z.infer<typeof timelineSchema>;
