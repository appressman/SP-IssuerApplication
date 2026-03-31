import { z } from 'zod';

export const applicationStatuses = [
	'draft',
	'submit_pending',
	'submitted',
	'submission_failed',
	'abandoned'
] as const;

export const applicationMetaSchema = z.object({
	applicationId: z.string().uuid(),
	status: z.enum(applicationStatuses),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	submittedAt: z.string().datetime().nullable().default(null),
	version: z.string().default('1.0')
});

export type ApplicationMeta = z.infer<typeof applicationMetaSchema>;
