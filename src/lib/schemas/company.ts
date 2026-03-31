import { z } from 'zod';

export const entityTypes = [
	'LLC',
	'C-Corp',
	'S-Corp',
	'B-Corp',
	'Nonprofit',
	'Partnership',
	'Sole Proprietorship',
	'Other'
] as const;

export const employeeCountRanges = ['1-5', '6-25', '26-100', '101-500', '500+'] as const;

export const revenueStatuses = ['pre_revenue', 'revenue_generating'] as const;

export const companySchema = z.object({
	legalName: z.string().min(2, 'Company legal name is required'),
	doingBusinessAs: z.string().nullable().default(null),
	website: z
		.string()
		.url('Must be a valid URL')
		.nullable()
		.default(null),
	industry: z.string().min(1, 'Industry is required'),
	stateOfIncorporation: z.string().min(2, 'State of incorporation is required'),
	entityType: z.enum(entityTypes, { message: 'Entity type is required' }),
	yearsOperating: z
		.number()
		.int()
		.min(0, 'Must be 0 or greater')
		.max(100, 'Must be 100 or less')
		.nullable()
		.default(null),
	employeeCountRange: z.enum(employeeCountRanges).nullable().default(null),
	revenueStatus: z.enum(revenueStatuses, { message: 'Revenue status is required' })
});

export type Company = z.infer<typeof companySchema>;
