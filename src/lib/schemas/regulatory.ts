import { z } from 'zod';

export const regulatorySchema = z
	.object({
		previousRaise: z.boolean({ message: 'Please indicate if you have previously raised capital' }).nullable(),
		previousRaiseDetails: z.string().nullable().default(null),
		regulatoryOrders: z.boolean({ message: 'Please indicate if there are any regulatory orders' }).nullable(),
		regulatoryOrdersDetails: z.string().nullable().default(null),
		badActorIndicators: z.boolean({ message: 'Please indicate if there are any bad actor events' }).nullable(),
		badActorDetails: z.string().nullable().default(null)
	})
	.superRefine((data, ctx) => {
		if (data.previousRaise === true && (!data.previousRaiseDetails || data.previousRaiseDetails.length < 20)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Please describe your previous capital raises (at least 20 characters)',
				path: ['previousRaiseDetails']
			});
		}
		if (data.regulatoryOrders === true && (!data.regulatoryOrdersDetails || data.regulatoryOrdersDetails.length < 20)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Please describe the regulatory orders (at least 20 characters)',
				path: ['regulatoryOrdersDetails']
			});
		}
		if (data.badActorIndicators === true && (!data.badActorDetails || data.badActorDetails.length < 20)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Please describe the bad actor events (at least 20 characters)',
				path: ['badActorDetails']
			});
		}
	});

export type RegulatoryHistory = z.infer<typeof regulatorySchema>;
