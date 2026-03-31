import { z } from 'zod';

export const contactSchema = z.object({
	fullName: z.string().min(2, 'Full name is required'),
	email: z.string().email('Valid email is required'),
	phone: z.string().min(7, 'Phone number is required'),
	title: z.string().nullable().default(null),
	linkedinUrl: z
		.string()
		.url('Must be a valid URL')
		.nullable()
		.default(null)
});

export type Contact = z.infer<typeof contactSchema>;
