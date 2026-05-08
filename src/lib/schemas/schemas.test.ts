import { describe, it, expect } from 'vitest';
import { companySchema } from './company.js';
import { contactSchema } from './contact.js';
import { regulatorySchema } from './regulatory.js';
import { offeringSchema } from './offering.js';
import { useOfProceedsSchema, financialProjectionsSchema, financialStatementFiscalYearEndSchema, teamQualificationsSchema, assumptionsSchema } from './fundamentals.js';
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

	it('accepts previousRegCFRaises as null when no prior CF raises', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			previousRegCFRaises: null
		});
		expect(result.success).toBe(true);
	});

	it('accepts valid previousRegCFRaises array', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: true,
			previousRaiseDetails: 'Raised $500K via Reg CF on Wefunder in 2023.',
			regulatoryOrders: false,
			badActorIndicators: false,
			previousRegCFRaises: [
				{ closingDate: '2023-06-15', amountRaisedUsd: 500000, platformName: 'Wefunder' }
			]
		});
		expect(result.success).toBe(true);
	});

	it('rejects previousRegCFRaises entry with future closing date', () => {
		const futureDate = new Date();
		futureDate.setFullYear(futureDate.getFullYear() + 1);
		const futureDateStr = futureDate.toISOString().split('T')[0];
		const result = regulatorySchema.safeParse({
			previousRaise: true,
			previousRaiseDetails: 'We had a previous raise on a crowdfunding platform.',
			regulatoryOrders: false,
			badActorIndicators: false,
			previousRegCFRaises: [
				{ closingDate: futureDateStr, amountRaisedUsd: 500000, platformName: 'Wefunder' }
			]
		});
		expect(result.success).toBe(false);
	});

	it('rejects previousRegCFRaises entry with negative amount', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: true,
			previousRaiseDetails: 'We had a previous raise on a crowdfunding platform.',
			regulatoryOrders: false,
			badActorIndicators: false,
			previousRegCFRaises: [
				{ closingDate: '2023-06-15', amountRaisedUsd: -100, platformName: 'Wefunder' }
			]
		});
		expect(result.success).toBe(false);
	});

	it('rejects previousRegCFRaises entry with zero amount', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: true,
			previousRaiseDetails: 'We had a previous raise on a crowdfunding platform.',
			regulatoryOrders: false,
			badActorIndicators: false,
			previousRegCFRaises: [
				{ closingDate: '2023-06-15', amountRaisedUsd: 0, platformName: 'Wefunder' }
			]
		});
		expect(result.success).toBe(false);
	});

	it('accepts previousRegCFRaises entry without platform name', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: true,
			previousRaiseDetails: 'We had a previous raise on a crowdfunding platform.',
			regulatoryOrders: false,
			badActorIndicators: false,
			previousRegCFRaises: [
				{ closingDate: '2023-06-15', amountRaisedUsd: 500000, platformName: null }
			]
		});
		expect(result.success).toBe(true);
	});

	it('accepts isFormerExchangeActReporter false', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			isFormerExchangeActReporter: false
		});
		expect(result.success).toBe(true);
	});

	it('accepts isFormerExchangeActReporter true with termination confirmed', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			isFormerExchangeActReporter: true,
			exchangeActReportingTerminated: true,
			exchangeActTerminationDate: '2024-06-30'
		});
		expect(result.success).toBe(true);
	});

	it('accepts isFormerExchangeActReporter true with termination confirmed and no date', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			isFormerExchangeActReporter: true,
			exchangeActReportingTerminated: true
		});
		expect(result.success).toBe(true);
	});

	it('accepts isFormerExchangeActReporter true with termination not confirmed', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			isFormerExchangeActReporter: true,
			exchangeActReportingTerminated: false
		});
		expect(result.success).toBe(true);
	});

	it('rejects isFormerExchangeActReporter true when exchangeActReportingTerminated is null', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			isFormerExchangeActReporter: true,
			exchangeActReportingTerminated: null
		});
		expect(result.success).toBe(false);
	});

	it('rejects exchangeActTerminationDate with future date', () => {
		const future = new Date();
		future.setFullYear(future.getFullYear() + 1);
		const futureStr = future.toISOString().split('T')[0];
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			isFormerExchangeActReporter: true,
			exchangeActReportingTerminated: true,
			exchangeActTerminationDate: futureStr
		});
		expect(result.success).toBe(false);
	});

	it('accepts hasActivePlatformOffering false with no follow-up', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			hasActivePlatformOffering: false
		});
		expect(result.success).toBe(true);
	});

	it('accepts hasActivePlatformOffering true with activePlatformHasClosed answered', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			hasActivePlatformOffering: true,
			activePlatformHasClosed: false
		});
		expect(result.success).toBe(true);
	});

	it('rejects hasActivePlatformOffering true when activePlatformHasClosed is null', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			hasActivePlatformOffering: true,
			activePlatformHasClosed: null
		});
		expect(result.success).toBe(false);
	});

	it('accepts hasActivePlatformOffering true + closed sales + platform name', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			hasActivePlatformOffering: true,
			activePlatformHasClosed: true,
			activePlatformName: 'Wefunder'
		});
		expect(result.success).toBe(true);
	});

	it('accepts hasActivePlatformOffering null (unanswered)', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: false,
			regulatoryOrders: false,
			badActorIndicators: false,
			hasActivePlatformOffering: null
		});
		expect(result.success).toBe(true);
	});

	it('accepts multiple previousRegCFRaises entries', () => {
		const result = regulatorySchema.safeParse({
			previousRaise: true,
			previousRaiseDetails: 'We completed two Reg CF raises on Wefunder totaling $2M.',
			regulatoryOrders: false,
			badActorIndicators: false,
			previousRegCFRaises: [
				{ closingDate: '2022-03-01', amountRaisedUsd: 1000000, platformName: 'Wefunder' },
				{ closingDate: '2023-09-15', amountRaisedUsd: 1000000, platformName: 'Wefunder' }
			]
		});
		expect(result.success).toBe(true);
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

describe('Financial Statement Fiscal Year-End schema', () => {
	it('accepts null', () => {
		expect(financialStatementFiscalYearEndSchema.safeParse(null).success).toBe(true);
	});

	it('accepts a past date', () => {
		expect(financialStatementFiscalYearEndSchema.safeParse('2025-12-31').success).toBe(true);
	});

	it('rejects a future date', () => {
		const future = new Date();
		future.setFullYear(future.getFullYear() + 1);
		const futureStr = future.toISOString().split('T')[0];
		expect(financialStatementFiscalYearEndSchema.safeParse(futureStr).success).toBe(false);
	});

	it('rejects an invalid date format', () => {
		expect(financialStatementFiscalYearEndSchema.safeParse('12/31/2025').success).toBe(false);
	});

	it('rejects a non-date string', () => {
		expect(financialStatementFiscalYearEndSchema.safeParse('not-a-date').success).toBe(false);
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
