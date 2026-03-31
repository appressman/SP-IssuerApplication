import { z } from 'zod';

export const consentSchema = z.object({
	agreedToProcessing: z.literal(true, {
		errorMap: () => ({ message: 'You must consent to data processing to submit' })
	}),
	agreedToDisclaimers: z.literal(true, {
		errorMap: () => ({ message: 'You must acknowledge the disclaimers to submit' })
	}),
	timestamp: z.string().datetime().nullable().default(null)
});

export type Consent = z.infer<typeof consentSchema>;
