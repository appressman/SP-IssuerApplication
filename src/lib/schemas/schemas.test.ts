import { describe, it, expect } from 'vitest';
import { companySchema } from './company.js';
import { contactSchema } from './contact.js';
import { regulatorySchema } from './regulatory.js';
import { offeringSchema } from './offering.js';
import { useOfProceedsSchema, financialProjectionsSchema, teamQualificationsSchema, assumptionsSchema } from './fundamentals.js';
import { readinessSchema, capacitySchema } from './readiness.js';
import { timelineSchema } from './timeline.js';
import { consentSchema } from './consent.js';
import { getStepConfig, TOTAL_FORM_STEPS } from './stepConfig.js';

describe('Company schema', () => {
	const validCompany = {
		legalName: 'Acme Inc',
		industry: 'Technology',
		stateOfIncorporation: 'Delaware',
		entityType: 'LLC' as const,
		revenueStatus: 'revenue_generating' as const
	};

	it('accepts valid data', () => {
		const result = companySchema.safeParse(validCompany);
		expect(result.success).toBe(true);
	});

	it('rejects missing legal name', () => {
		const result = companySchema.safeParse({ ...validCompany, legalName: '' });
		expect(result.success).toBe(false);
	});

	it('rejects legal name too short', () => {
		const result = companySchema.safeParse({ ...validCompany, legalName: 'A' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid entity type', () => {
		const result = companySchema.safeParse({ ...validCompany, entityType: 'InvalidType' });
		expect(result.success).toBe(false);
	});

	it('accepts valid website URL', () => {
		const result = companySchema.safeParse({ ...validCompany, website: 'https://acme.com' });
		expect(result.success).toBe(true);
	});

	it('rejects invalid website URL', () => {
		const result = companySchema.safeParse({ ...validCompany, website: 'not-a-url' });
		expect(result.success).toBe(false);
	});

	it('accepts null website', () => {
		const result = companySchema.safeParse({ ...validCompany, website: null });
		expect(result.success).toBe(true);
	});

	it('rejects years operating over 100', () => {
		const result = companySchema.safeParse({ ...validCompany, yearsOperating: 101 });
		expect(result.success).toBe(false);
	});

	it('accepts years operating at 0', () => {
		const result = companySchema.safeParse({ ...validCompany, yearsOperating: 0 });
		expect(result.success).toBe(true);
	});
});

describe('Contact schema', () => {
	it('accepts valid contact', () => {
		const result = contactSchema.safeParse({
			fullName: 'John Doe',
			email: 'john@example.com',
			phone: '555-1234'
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid email', () => {
		const result = contactSchema.safeParse({
			fullName: 'John Doe',
			email: 'not-an-email',
			phone: '555-1234'
		});
		expect(result.success).toBe(false);
	});

	it('rejects short phone', () => {
		const result = contactSchema.safeParse({
			fullName: 'John Doe',
			email: 'john@example.com',
			phone: '123'
		});
		expect(result.success).toBe(false);
	});
});

describe('Regulatory schema', () => {
	it('accepts all no answers', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false
		});
		expect(result.success).toBe(true);
	});

	it('requires details when previous raise is yes', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: true,
			previousRaiseDetails: null,
			regulatoryOrders: false,
			badActorIndicators: false
		});
		expect(result.success).toBe(false);
	});

	it('requires details min 20 chars when previous raise is yes', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: true,
			previousRaiseDetails: 'Short',
			regulatoryOrders: false,
			badActorIndicators: false
		});
		expect(result.success).toBe(false);
	});

	it('accepts details when previous raise is yes', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: true,
			previousRaiseDetails: 'We raised $500K in a seed round from angel investors in 2024.',
			regulatoryOrders: false,
			badActorIndicators: false
		});
		expect(result.success).toBe(true);
	});

	it('requires bad actor details when indicated', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: true,
			badActorDetails: null
		});
		expect(result.success).toBe(false);
	});
});

describe('Offering schema', () => {
	const validOffering = {
		securityType: 'equity' as const,
		exemptionTarget: 'reg_cf' as const,
		raiseTargetUsd: 500000,
		minimumRaiseUsd: 250000,
		maximumRaiseUsd: 750000
	};

	it('accepts valid offering', () => {
		const result = offeringSchema.safeParse(validOffering);
		expect(result.success).toBe(true);
	});

	it('rejects max raise less than min raise', () => {
		const result = offeringSchema.safeParse({
			...validOffering,
			minimumRaiseUsd: 500000,
			maximumRaiseUsd: 250000
		});
		expect(result.success).toBe(false);
	});

	it('rejects raise target outside min/max range', () => {
		const result = offeringSchema.safeParse({
			...validOffering,
			raiseTargetUsd: 100000
		});
		expect(result.success).toBe(false);
	});

	it('requires explanation for other security type', () => {
		const result = offeringSchema.safeParse({
			...validOffering,
			securityType: 'other',
			securityTypeOther: null
		});
		expect(result.success).toBe(false);
	});

	it('accepts other security type with explanation', () => {
		const result = offeringSchema.safeParse({
			...validOffering,
			securityType: 'other',
			securityTypeOther: 'Profit interest units'
		});
		expect(result.success).toBe(true);
	});
});

describe('Use of Proceeds schema', () => {
	it('accepts valid use of proceeds totaling 100', () => {
		const result = useOfProceedsSchema.safeParse([
			{ category: 'Marketing', percent: 40, description: 'Digital marketing campaigns' },
			{ category: 'Product Development', percent: 60, description: null }
		]);
		expect(result.success).toBe(true);
	});

	it('rejects when total is not 100', () => {
		const result = useOfProceedsSchema.safeParse([
			{ category: 'Marketing', percent: 40, description: 'Campaigns' },
			{ category: 'Product', percent: 40, description: null }
		]);
		expect(result.success).toBe(false);
	});

	it('rejects fewer than 2 categories', () => {
		const result = useOfProceedsSchema.safeParse([
			{ category: 'Marketing', percent: 100, description: 'Everything' }
		]);
		expect(result.success).toBe(false);
	});

	it('requires at least one description', () => {
		const result = useOfProceedsSchema.safeParse([
			{ category: 'Marketing', percent: 50, description: null },
			{ category: 'Product', percent: 50, description: null }
		]);
		expect(result.success).toBe(false);
	});
});

describe('Financial Projections schema', () => {
	it('accepts no projections', () => {
		const result = financialProjectionsSchema.safeParse({
			hasProjections: false,
			projectionSummary: null
		});
		expect(result.success).toBe(true);
	});

	it('requires summary when projections exist', () => {
		const result = financialProjectionsSchema.safeParse({
			hasProjections: true,
			projectionSummary: null
		});
		expect(result.success).toBe(false);
	});

	it('requires summary min 50 chars', () => {
		const result = financialProjectionsSchema.safeParse({
			hasProjections: true,
			projectionSummary: 'Too short'
		});
		expect(result.success).toBe(false);
	});

	it('accepts projections with adequate summary', () => {
		const result = financialProjectionsSchema.safeParse({
			hasProjections: true,
			projectionSummary: 'We project $1M revenue in year 1, growing to $3M by year 3 with 40% gross margins.'
		});
		expect(result.success).toBe(true);
	});
});

describe('Team Qualifications schema', () => {
	it('rejects text under 100 chars', () => {
		const result = teamQualificationsSchema.safeParse('Short description');
		expect(result.success).toBe(false);
	});

	it('accepts text over 100 chars', () => {
		const result = teamQualificationsSchema.safeParse(
			'Our CEO has 15 years in fintech, previously VP at Square. Our CTO built the backend for a Series B startup that processed $50M in transactions.'
		);
		expect(result.success).toBe(true);
	});
});

describe('Timeline schema', () => {
	it('accepts valid timeline', () => {
		const result = timelineSchema.safeParse({
			timelineExpectation: '3_to_6_months',
			understandsPreparationTime: true
		});
		expect(result.success).toBe(true);
	});

	it('rejects past launch date', () => {
		const result = timelineSchema.safeParse({
			desiredLaunchDate: '2020-01-01',
			timelineExpectation: '3_to_6_months',
			understandsPreparationTime: true
		});
		expect(result.success).toBe(false);
	});

	it('accepts future launch date', () => {
		const result = timelineSchema.safeParse({
			desiredLaunchDate: '2027-06-01',
			timelineExpectation: '3_to_6_months',
			understandsPreparationTime: true
		});
		expect(result.success).toBe(true);
	});
});

describe('Consent schema', () => {
	it('requires both consents to be true', () => {
		const result = consentSchema.safeParse({
			agreedToProcessing: false,
			agreedToDisclaimers: true
		});
		expect(result.success).toBe(false);
	});

	it('accepts both consents true', () => {
		const result = consentSchema.safeParse({
			agreedToProcessing: true,
			agreedToDisclaimers: true,
			timestamp: new Date().toISOString()
		});
		expect(result.success).toBe(true);
	});
});

describe('Step config', () => {
	it('has 13 steps total (12 form + review)', () => {
		expect(TOTAL_FORM_STEPS).toBe(12);
	});

	it('returns correct config for step 1', () => {
		const config = getStepConfig(1);
		expect(config?.title).toBe('Company Information');
	});

	it('returns correct config for step 13', () => {
		const config = getStepConfig(13);
		expect(config?.title).toBe('Review & Submit');
	});

	it('returns undefined for invalid step', () => {
		const config = getStepConfig(99);
		expect(config).toBeUndefined();
	});
});
