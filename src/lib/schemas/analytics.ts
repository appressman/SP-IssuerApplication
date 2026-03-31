import { z } from 'zod';

export const analyticsSchema = z.object({
	utmSource: z.string().nullable().default(null),
	utmMedium: z.string().nullable().default(null),
	utmCampaign: z.string().nullable().default(null),
	startedAt: z.string().datetime().nullable().default(null),
	lastActiveAt: z.string().datetime().nullable().default(null)
});

export type Analytics = z.infer<typeof analyticsSchema>;
