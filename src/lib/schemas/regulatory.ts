import { z } from 'zod';

export const regCFClosingSchema = z.object({
	closingDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date (YYYY-MM-DD)')
		.refine((d) => new Date(d) <= new Date(), 'Closing date cannot be in the future'),
	amountRaisedUsd: z
		.number({ message: 'Enter the amount raised' })
		.int('Amount must be a whole dollar amount')
		.positive('Amount must be positive'),
	platformName: z.string().min(1, 'Enter the platform name').nullable().default(null)
});

export type RegCFClosing = z.infer<typeof regCFClosingSchema>;

export const regulatorySchema = z
	.object({
		previousRaise: z.boolean({ message: 'Please indicate if you have previously raised capital' }).nullable(),
		previousRaiseDetails: z.string().nullable().default(null),
		previousRegCFRaises: z.array(regCFClosingSchema).nullable().default(null),
		regulatoryOrders: z.boolean({ message: 'Please indicate if there are any regulatory orders' }).nullable(),
		regulatoryOrdersDetails: z.string().nullable().default(null),
		badActorIndicators: z.boolean({ message: 'Please indicate if there are any bad actor events' }).nullable(),
		badActorDetails: z.string().nullable().default(null),
		// C&DI 100.03: platform switching only permitted before any sales close
		hasActivePlatformOffering: z
			.boolean({ message: 'Please indicate if you have an active Reg CF offering on another portal' })
			.nullable()
			.default(null),
		activePlatformHasClosed: z
			.boolean({ message: 'Please indicate if any sales have closed on that offering' })
			.nullable()
			.default(null),
		activePlatformName: z.string().nullable().default(null)
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
		if (data.hasActivePlatformOffering === true && data.activePlatformHasClosed === null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Please indicate whether any sales have closed on the active offering',
				path: ['activePlatformHasClosed']
			});
		}
	});

export type RegulatoryHistory = z.infer<typeof regulatorySchema>;
