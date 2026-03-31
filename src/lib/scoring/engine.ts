/**
 * ISS-ACQ-05 Aligned Scoring Engine
 * 7 criteria, 100-point scale
 * Bands: qualified (>=70), qualified_with_reservations (50-69), not_qualified (<50)
 */

import type { ScoringResult } from '$lib/schemas/index.js';

interface FormData {
	company?: Record<string, any>;
	regulatoryHistory?: Record<string, any>;
	offering?: Record<string, any>;
	useOfProceeds?: Record<string, any>;
	financial?: Record<string, any>;
	team?: Record<string, any>;
	market?: Record<string, any>;
	investorReturns?: Record<string, any>;
	documentation?: Record<string, any>;
	professionals?: Record<string, any>;
	capacity?: Record<string, any>;
	timeline?: Record<string, any>;
}

// Criteria weights (total = 100)
const WEIGHTS = {
	businessModel: 20,
	fundingNeedAndUse: 15,
	regulatoryReadiness: 15,
	teamAndCapacity: 15,
	budget: 10,
	timeline: 10,
	marketOpportunity: 15
} as const;

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function scoreBusinessModel(data: FormData): { score: number; flags: string[] } {
	const flags: string[] = [];
	let raw = 0;
	const max = 100;

	const company = data.company;
	if (!company) return { score: 0, flags: ['No company information provided'] };

	// Entity type exists
	if (company.entityType) raw += 15;
	// Years operating
	if (company.yearsOperating !== undefined) {
		const years = Number(company.yearsOperating);
		if (years >= 3) raw += 25;
		else if (years >= 1) raw += 15;
		else raw += 5;
	}
	// Revenue status
	if (company.revenueStatus === 'revenue_generating') raw += 30;
	else if (company.revenueStatus === 'pre_revenue_with_traction') raw += 20;
	else if (company.revenueStatus === 'pre_revenue') {
		raw += 5;
		flags.push('Pre-revenue company: higher risk profile for investors');
	}
	// Industry specified
	if (company.industry) raw += 10;
	// Website exists
	if (company.website) raw += 10;
	// Employee count
	if (company.employeeCountRange && company.employeeCountRange !== '0') raw += 10;

	return { score: clamp(Math.round((raw / max) * 100), 0, 100), flags };
}

function scoreFundingNeedAndUse(data: FormData): { score: number; flags: string[] } {
	const flags: string[] = [];
	let raw = 0;
	const max = 100;

	const offering = data.offering;
	const useOfProceeds = data.useOfProceeds;

	if (!offering) return { score: 0, flags: ['No offering information provided'] };

	// Has raise amounts
	if (offering.minRaiseAmount && offering.maxRaiseAmount) {
		raw += 20;
		if (Number(offering.maxRaiseAmount) > 5000000) {
			flags.push('Raise exceeds $5M Reg CF limit');
		}
	}
	// Security type specified
	if (offering.securityType) raw += 15;
	// Exemption target
	if (offering.exemptionTarget) raw += 10;
	// Offering description
	if (offering.offeringDescription && offering.offeringDescription.length > 20) raw += 15;

	// Use of proceeds
	if (useOfProceeds?.items && Array.isArray(useOfProceeds.items)) {
		const items = useOfProceeds.items;
		if (items.length >= 2) raw += 15;
		const total = items.reduce((sum: number, i: any) => sum + (Number(i.percentage) || 0), 0);
		if (total === 100) raw += 15;
		else flags.push('Use of proceeds does not total 100%');
		const hasDescriptions = items.every((i: any) => i.description && i.description.length > 0);
		if (hasDescriptions) raw += 10;
	}

	return { score: clamp(Math.round((raw / max) * 100), 0, 100), flags };
}

function scoreRegulatoryReadiness(data: FormData): { score: number; flags: string[] } {
	const flags: string[] = [];
	let raw = 0;
	const max = 100;

	const reg = data.regulatoryHistory;
	const docs = data.documentation;
	const pros = data.professionals;

	if (!reg) return { score: 0, flags: ['No regulatory history provided'] };

	// Clean regulatory history (no bad actors, no prior issues)
	if (reg.hasBadActorHistory === false) raw += 30;
	else if (reg.hasBadActorHistory === true) {
		raw += 0;
		flags.push('CRITICAL: Bad actor disqualification may apply');
	}
	if (reg.hasPriorRegulatoryIssues === false) raw += 15;
	else if (reg.hasPriorRegulatoryIssues === true) flags.push('Prior regulatory issues reported');

	if (reg.hasPriorSecuritiesOffering === false) raw += 10;
	else if (reg.hasPriorSecuritiesOffering === true) raw += 15; // Prior experience is good

	// Documentation readiness
	if (docs) {
		if (docs.businessPlan === 'complete') raw += 10;
		else if (docs.businessPlan === 'draft') raw += 5;
		if (docs.pitchDeck === 'complete') raw += 10;
		else if (docs.pitchDeck === 'draft') raw += 5;
	}

	// Professional team
	if (pros) {
		if (pros.attorney === 'engaged') raw += 15;
		else if (pros.attorney === 'identified') raw += 7;
		else if (pros.attorney === 'none') flags.push('No securities attorney: required for any offering');
		if (pros.cpa === 'engaged') raw += 10;
		else if (pros.cpa === 'identified') raw += 5;
	}

	return { score: clamp(Math.round((raw / max) * 100), 0, 100), flags };
}

function scoreTeamAndCapacity(data: FormData): { score: number; flags: string[] } {
	const flags: string[] = [];
	let raw = 0;
	const max = 100;

	const team = data.team;
	const capacity = data.capacity;

	// Team qualifications
	if (team?.qualifications && team.qualifications.length >= 100) raw += 30;
	else if (team?.qualifications && team.qualifications.length > 0) raw += 15;

	// Capacity assessment
	if (capacity) {
		const capScores: Record<string, number> = { high: 20, moderate: 12, low: 5 };
		raw += capScores[capacity.leadershipTimeCapacity] || 0;
		raw += capScores[capacity.teamExecutionCapacity] || 0;

		if (capacity.canSupportCampaignFor90Days === true) raw += 20;
		else if (capacity.canSupportCampaignFor90Days === false) flags.push('Cannot support 90-day campaign activity');

		const presenceScores: Record<string, number> = { strong: 20, established: 15, basic: 8, weak: 3 };
		raw += presenceScores[capacity.onlinePresence] || 0;

		if (capacity.onlinePresence === 'weak') flags.push('Weak online presence: crowdfunding success correlates with digital reach');
	}

	return { score: clamp(Math.round((raw / max) * 100), 0, 100), flags };
}

function scoreBudget(data: FormData): { score: number; flags: string[] } {
	const flags: string[] = [];
	let raw = 0;
	const max = 100;

	const financial = data.financial;

	if (!financial) return { score: 0, flags: ['No financial information provided'] };

	// Financial statements
	const stmtScores: Record<string, number> = { audited: 40, reviewed: 30, compiled: 20, none: 5 };
	raw += stmtScores[financial.financialStatements] || 0;
	if (financial.financialStatements === 'none') flags.push('No financial statements prepared');

	// Has projections
	if (financial.hasProjections === true) {
		raw += 30;
		if (financial.projectionSummary && financial.projectionSummary.length >= 50) raw += 30;
		else raw += 15;
	} else if (financial.hasProjections === false) {
		raw += 10;
	}

	return { score: clamp(Math.round((raw / max) * 100), 0, 100), flags };
}

function scoreTimeline(data: FormData): { score: number; flags: string[] } {
	const flags: string[] = [];
	let raw = 0;
	const max = 100;

	const timeline = data.timeline;

	if (!timeline) return { score: 0, flags: ['No timeline information provided'] };

	// Timeline expectation
	const expectScores: Record<string, number> = {
		'3_to_6_months': 40,
		'1_to_3_months': 35,
		'6_plus_months': 30,
		lt_30_days: 10,
		unknown: 15
	};
	raw += expectScores[timeline.timelineExpectation] || 0;

	if (timeline.timelineExpectation === 'lt_30_days') flags.push('Very aggressive timeline: 30 days is typically insufficient');

	// Understands preparation
	if (timeline.understandsPreparationTime === true) raw += 30;
	else if (timeline.understandsPreparationTime === false) raw += 10;

	// Has a target date
	if (timeline.desiredLaunchDate) raw += 30;
	else raw += 10;

	return { score: clamp(Math.round((raw / max) * 100), 0, 100), flags };
}

function scoreMarketOpportunity(data: FormData): { score: number; flags: string[] } {
	const flags: string[] = [];
	let raw = 0;
	const max = 100;

	const market = data.market;
	const returns = data.investorReturns;

	// Market assumptions
	if (market?.assumptions && market.assumptions.length >= 100) raw += 40;
	else if (market?.assumptions && market.assumptions.length > 0) raw += 20;

	// Investor returns clarity
	if (returns) {
		if (returns.whatFromInvestors && returns.whatFromInvestors.length > 10) raw += 20;
		if (returns.principalReturn && returns.principalReturn.length > 10) raw += 20;
		if (returns.investorConsideration && returns.investorConsideration.length > 10) raw += 20;
	}

	return { score: clamp(Math.round((raw / max) * 100), 0, 100), flags };
}

export function calculateScore(formData: FormData): ScoringResult {
	const results = {
		businessModel: scoreBusinessModel(formData),
		fundingNeedAndUse: scoreFundingNeedAndUse(formData),
		regulatoryReadiness: scoreRegulatoryReadiness(formData),
		teamAndCapacity: scoreTeamAndCapacity(formData),
		budget: scoreBudget(formData),
		timeline: scoreTimeline(formData),
		marketOpportunity: scoreMarketOpportunity(formData)
	};

	const criteria = {
		businessModel: Math.round((results.businessModel.score / 100) * WEIGHTS.businessModel),
		fundingNeedAndUse: Math.round((results.fundingNeedAndUse.score / 100) * WEIGHTS.fundingNeedAndUse),
		regulatoryReadiness: Math.round((results.regulatoryReadiness.score / 100) * WEIGHTS.regulatoryReadiness),
		teamAndCapacity: Math.round((results.teamAndCapacity.score / 100) * WEIGHTS.teamAndCapacity),
		budget: Math.round((results.budget.score / 100) * WEIGHTS.budget),
		timeline: Math.round((results.timeline.score / 100) * WEIGHTS.timeline),
		marketOpportunity: Math.round((results.marketOpportunity.score / 100) * WEIGHTS.marketOpportunity)
	};

	const totalScore = Object.values(criteria).reduce((sum, v) => sum + v, 0);

	const allFlags = Object.values(results).flatMap((r) => r.flags);

	// Critical flags force not_qualified
	const hasCriticalFlag = allFlags.some((f) => f.startsWith('CRITICAL:'));

	let band: 'qualified' | 'qualified_with_reservations' | 'not_qualified';
	if (hasCriticalFlag || totalScore < 50) {
		band = 'not_qualified';
	} else if (totalScore >= 70) {
		band = 'qualified';
	} else {
		band = 'qualified_with_reservations';
	}

	return { totalScore, band, criteria, flags: allFlags };
}

export const CRITERIA_LABELS: Record<string, string> = {
	businessModel: 'Business Model',
	fundingNeedAndUse: 'Funding Need & Use',
	regulatoryReadiness: 'Regulatory Readiness',
	teamAndCapacity: 'Team & Capacity',
	budget: 'Financial Preparedness',
	timeline: 'Timeline Readiness',
	marketOpportunity: 'Market Opportunity'
};

export const CRITERIA_WEIGHTS = WEIGHTS;

export const BAND_LABELS: Record<string, { label: string; color: string; description: string }> = {
	qualified: {
		label: 'Qualified',
		color: 'green',
		description: 'Your company appears well-positioned for a securities offering. SyndicatePath will reach out to discuss next steps.'
	},
	qualified_with_reservations: {
		label: 'Qualified with Reservations',
		color: 'amber',
		description: 'Your company shows potential but there are areas that need attention before proceeding. SyndicatePath will review and provide guidance.'
	},
	not_qualified: {
		label: 'Not Currently Qualified',
		color: 'red',
		description: 'Based on your responses, there are significant gaps that should be addressed before pursuing a securities offering. SyndicatePath may still reach out with recommendations.'
	}
};
