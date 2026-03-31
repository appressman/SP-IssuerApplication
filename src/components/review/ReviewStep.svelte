<script lang="ts">
	import { calculateScore, CRITERIA_LABELS, CRITERIA_WEIGHTS, BAND_LABELS } from '$lib/scoring/engine.js';
	import { steps } from '$lib/schemas/stepConfig.js';

	type Props = {
		formData: Record<string, any>;
		applicationId: string;
		onEdit: (step: number) => void;
	};
	let { formData, applicationId, onEdit }: Props = $props();

	let agreedToProcessing = $state(false);
	let agreedToDisclaimers = $state(false);
	let submitting = $state(false);
	let submitError = $state('');
	let submitted = $state(false);

	let scoring = $derived(calculateScore(formData));
	let bandInfo = $derived(BAND_LABELS[scoring.band ?? 'not_qualified']);

	async function handleSubmit() {
		if (!agreedToProcessing || !agreedToDisclaimers) {
			submitError = 'You must agree to both consent items before submitting.';
			return;
		}

		submitting = true;
		submitError = '';

		try {
			const res = await fetch('/api/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					applicationId,
					consent: {
						agreedToProcessing,
						agreedToDisclaimers,
						timestamp: new Date().toISOString()
					}
				})
			});

			if (res.ok) {
				submitted = true;
				window.scrollTo(0, 0);
			} else {
				const data = await res.json().catch(() => ({}));
				submitError = data.error || 'Submission failed. Please try again.';
			}
		} catch {
			submitError = 'Network error. Please check your connection and try again.';
		} finally {
			submitting = false;
		}
	}

	const SECTION_MAP: Record<number, { key: string; label: string; fields: string[] }> = {
		1: { key: 'company', label: 'Company', fields: ['legalName', 'dba', 'website', 'industry', 'state', 'entityType', 'yearsOperating', 'employeeCountRange', 'revenueStatus'] },
		2: { key: 'regulatoryHistory', label: 'Regulatory', fields: ['hasPriorSecuritiesOffering', 'hasBadActorHistory', 'hasPriorRegulatoryIssues'] },
		3: { key: 'offering', label: 'Offering', fields: ['securityType', 'exemptionTarget', 'minRaiseAmount', 'maxRaiseAmount', 'targetRaiseAmount', 'minimumInvestment'] },
		4: { key: 'useOfProceeds', label: 'Use of Proceeds', fields: ['items'] },
		5: { key: 'financial', label: 'Financial', fields: ['financialStatements', 'hasProjections'] },
		6: { key: 'team', label: 'Team', fields: ['qualifications'] },
		7: { key: 'market', label: 'Market', fields: ['assumptions'] },
		8: { key: 'investorReturns', label: 'Returns', fields: ['whatFromInvestors', 'principalReturn', 'investorConsideration'] },
		9: { key: 'documentation', label: 'Docs', fields: ['businessPlan', 'pitchDeck'] },
		10: { key: 'professionals', label: 'Team', fields: ['attorney', 'cpa', 'marketing'] },
		11: { key: 'capacity', label: 'Capacity', fields: ['leadershipTimeCapacity', 'teamExecutionCapacity', 'canSupportCampaignFor90Days', 'onlinePresence'] },
		12: { key: 'timeline', label: 'Timeline', fields: ['timelineExpectation', 'understandsPreparationTime', 'desiredLaunchDate'] }
	};

	function getSectionStatus(stepNum: number): 'complete' | 'partial' | 'empty' {
		const section = SECTION_MAP[stepNum];
		if (!section) return 'empty';
		const sectionData = formData[section.key];
		if (!sectionData) return 'empty';
		const filled = section.fields.filter(f => {
			const val = sectionData[f];
			return val !== null && val !== undefined && val !== '' && val !== false;
		}).length;
		if (filled === section.fields.length) return 'complete';
		if (filled > 0) return 'partial';
		return 'empty';
	}

	function formatValue(val: any): string {
		if (val === null || val === undefined || val === '') return '(not provided)';
		if (typeof val === 'boolean') return val ? 'Yes' : 'No';
		if (typeof val === 'number') return val.toLocaleString();
		if (Array.isArray(val)) return `${val.length} item(s)`;
		return String(val);
	}
</script>

{#if submitted}
	<div class="text-center py-8">
		<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
			<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
		</div>
		<h2 class="text-2xl font-bold text-sp-navy mb-2">Assessment Submitted</h2>
		<p class="text-sp-medium-gray mb-6">Thank you for completing the SyndicatePath Readiness Assessment. Our team will review your responses and reach out within 2-3 business days.</p>

		<div class="bg-gray-50 rounded-lg p-6 max-w-md mx-auto text-left">
			<p class="font-medium text-sp-navy mb-2">Your Preliminary Score</p>
			<div class="flex items-center gap-3 mb-3">
				<span class="text-3xl font-bold text-sp-navy">{scoring.totalScore}</span>
				<span class="text-sm text-sp-medium-gray">/ 100</span>
				<span class="ml-auto px-3 py-1 rounded-full text-sm font-medium
					{bandInfo.color === 'green' ? 'bg-green-100 text-green-800' : ''}
					{bandInfo.color === 'amber' ? 'bg-amber-100 text-amber-800' : ''}
					{bandInfo.color === 'red' ? 'bg-red-100 text-red-800' : ''}"
				>{bandInfo.label}</span>
			</div>
			<p class="text-sm text-sp-medium-gray">{bandInfo.description}</p>
		</div>
	</div>
{:else}
	<div class="space-y-6">
		<!-- Score Preview -->
		<div class="bg-gray-50 rounded-lg p-4">
			<div class="flex items-center justify-between mb-3">
				<h3 class="font-bold text-sp-navy">Preliminary Readiness Score</h3>
				<div class="flex items-center gap-2">
					<span class="text-2xl font-bold text-sp-navy">{scoring.totalScore}</span>
					<span class="text-sm text-sp-medium-gray">/ 100</span>
				</div>
			</div>

			<div class="w-full bg-gray-200 rounded-full h-3 mb-3">
				<div
					class="h-3 rounded-full transition-all duration-500
						{scoring.totalScore !== null && scoring.totalScore >= 70 ? 'bg-green-500' : ''}
						{scoring.totalScore !== null && scoring.totalScore >= 50 && scoring.totalScore < 70 ? 'bg-amber-500' : ''}
						{scoring.totalScore !== null && scoring.totalScore < 50 ? 'bg-red-500' : ''}"
					style="width: {scoring.totalScore}%"
				></div>
			</div>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
				{#each Object.entries(scoring.criteria) as [key, value]}
					<div class="bg-white rounded p-2">
						<div class="text-sp-medium-gray">{CRITERIA_LABELS[key]}</div>
						<div class="font-bold text-sp-navy">{value} / {CRITERIA_WEIGHTS[key as keyof typeof CRITERIA_WEIGHTS]}</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Flags -->
		{#if scoring.flags.length > 0}
			<div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
				<p class="font-medium text-amber-800 mb-2">Items to Address</p>
				<ul class="list-disc ml-4 space-y-1 text-sm text-amber-700">
					{#each scoring.flags as flag}
						<li>{flag}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Section Summary -->
		<div>
			<h3 class="font-bold text-sp-navy mb-3">Your Responses</h3>
			<div class="space-y-2">
				{#each steps.slice(0, 12) as step}
					{@const status = getSectionStatus(step.stepNumber)}
					<div class="flex items-center justify-between bg-white border rounded-lg p-3">
						<div class="flex items-center gap-3">
							<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
								{status === 'complete' ? 'bg-green-100 text-green-700' : ''}
								{status === 'partial' ? 'bg-amber-100 text-amber-700' : ''}
								{status === 'empty' ? 'bg-gray-100 text-gray-500' : ''}">
								{#if status === 'complete'}
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
								{:else}
									{step.stepNumber}
								{/if}
							</div>
							<span class="text-sm font-medium text-sp-navy">{step.title}</span>
						</div>
						<button onclick={() => onEdit(step.stepNumber)} class="text-sm text-sp-gold hover:text-sp-gold/80 font-medium">
							Edit
						</button>
					</div>
				{/each}
			</div>
		</div>

		<!-- Consent -->
		<div class="border-t pt-4 space-y-3">
			<h3 class="font-bold text-sp-navy">Consent & Acknowledgments</h3>

			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" bind:checked={agreedToProcessing} class="mt-1 accent-sp-gold" />
				<span class="text-sm text-sp-dark-gray">
					I consent to SyndicatePath (Miventure Inc.) processing the information provided in this assessment for the purpose of evaluating my company's readiness for a securities offering. I understand this assessment does not constitute legal, financial, or investment advice.
				</span>
			</label>

			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" bind:checked={agreedToDisclaimers} class="mt-1 accent-sp-gold" />
				<span class="text-sm text-sp-dark-gray">
					I acknowledge that this is a preliminary assessment only and that all information provided will be subject to verification. I understand that completing this assessment does not guarantee acceptance for any offering or service, and that SyndicatePath may decline to proceed based on its review.
				</span>
			</label>
		</div>

		<!-- Submit -->
		{#if submitError}
			<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
				{submitError}
			</div>
		{/if}

		<div class="flex justify-between items-center pt-2">
			<button onclick={() => onEdit(12)} class="px-4 py-2 text-sp-medium-gray hover:text-sp-navy text-sm">
				Back to Previous Step
			</button>
			<button
				onclick={handleSubmit}
				disabled={submitting || !agreedToProcessing || !agreedToDisclaimers}
				class="px-6 py-3 bg-sp-gold text-white font-bold rounded-lg hover:bg-sp-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{submitting ? 'Submitting...' : 'Submit Assessment'}
			</button>
		</div>

		<p class="text-xs text-sp-medium-gray text-center">
			By submitting, your responses will be shared with the SyndicatePath team for review. You will receive a confirmation email at the address you registered with.
		</p>
	</div>
{/if}
