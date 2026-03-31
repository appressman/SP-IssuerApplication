/**
 * Maps application form data to GoHighLevel contact and opportunity fields.
 * GHL field keys and pipeline IDs from wrangler.toml vars.
 */

import type { ScoringResult } from '$lib/schemas/index.js';

interface GhlContactPayload {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	companyName: string;
	website: string;
	tags: string[];
	customField: Record<string, string>;
}

interface GhlOpportunityPayload {
	pipelineId: string;
	pipelineStageId: string;
	name: string;
	monetaryValue: number;
	tags: string[];
}

interface WebhookPayload {
	contact: GhlContactPayload;
	opportunity: GhlOpportunityPayload;
	applicationId: string;
	scoring: ScoringResult;
	formSummary: Record<string, any>;
	submittedAt: string;
}

const BAND_TAGS: Record<string, string> = {
	qualified: 'issuer-qualified',
	qualified_with_reservations: 'issuer-qualified-reservations',
	not_qualified: 'issuer-not-qualified'
};

export function buildWebhookPayload(
	formData: Record<string, any>,
	scoring: ScoringResult,
	applicationId: string,
	env: {
		GHL_PIPELINE_ID: string;
		GHL_DISCOVERY_STAGE_ID: string;
		GHL_PROSPECTING_STAGE_ID: string;
	}
): WebhookPayload {
	const contact = formData.contact ?? {};
	const company = formData.company ?? {};
	const offering = formData.offering ?? {};

	// Split name
	const fullName = contact.fullName ?? '';
	const nameParts = fullName.trim().split(/\s+/);
	const firstName = nameParts[0] ?? '';
	const lastName = nameParts.slice(1).join(' ') || '';

	// Determine stage based on band
	const stageId =
		scoring.band === 'qualified'
			? env.GHL_PROSPECTING_STAGE_ID
			: env.GHL_DISCOVERY_STAGE_ID;

	const tags = [
		'issuer-application',
		BAND_TAGS[scoring.band ?? 'not_qualified'] ?? 'issuer-not-qualified',
		`score-${scoring.totalScore}`
	];

	return {
		contact: {
			firstName,
			lastName,
			email: contact.email ?? '',
			phone: contact.phone ?? '',
			companyName: company.legalName ?? '',
			website: company.website ?? '',
			tags,
			customField: {
				issuer_readiness_score: String(scoring.totalScore ?? 0),
				issuer_readiness_band: scoring.band ?? 'not_qualified',
				issuer_security_type: offering.securityType ?? '',
				issuer_exemption_target: offering.exemptionTarget ?? '',
				issuer_target_raise: String(offering.targetRaiseAmount ?? ''),
				issuer_entity_type: company.entityType ?? '',
				issuer_industry: company.industry ?? '',
				issuer_state: company.state ?? '',
				issuer_application_id: applicationId
			}
		},
		opportunity: {
			pipelineId: env.GHL_PIPELINE_ID,
			pipelineStageId: stageId,
			name: `${company.legalName ?? 'Unknown'} - Issuer Application`,
			monetaryValue: Number(offering.targetRaiseAmount) || 0,
			tags
		},
		applicationId,
		scoring,
		formSummary: {
			companyName: company.legalName,
			industry: company.industry,
			state: company.state,
			securityType: offering.securityType,
			targetRaise: offering.targetRaiseAmount,
			revenueStatus: company.revenueStatus,
			yearsOperating: company.yearsOperating,
			hasAttorney: formData.professionals?.attorney !== 'none',
			hasCpa: formData.professionals?.cpa !== 'none',
			timelineExpectation: formData.timeline?.timelineExpectation
		},
		submittedAt: new Date().toISOString()
	};
}
