<script lang="ts">
	import { untrack } from 'svelte';
	import FormField from '../FormField.svelte';
	import { financialStatementStatuses } from '$lib/schemas/readiness.js';
	import { isFinancialStatementStale, STALE_FINANCIAL_DAYS } from '$lib/scoring/engine.js';

	const STATUS_LABELS: Record<string, string> = {
		none: 'None', internal_only: 'Internal Only', compiled: 'Compiled',
		reviewed: 'Reviewed', audited: 'Audited', unknown: 'Unknown / Not Sure'
	};

	type Props = { data: Record<string, any> | undefined; onUpdate: (data: Record<string, any>) => void; errors: Record<string, string> };
	let { data, onUpdate, errors = $bindable({}) }: Props = $props();

	const today = new Date().toISOString().split('T')[0];

	let financialStatements = $state(data?.financialStatements ?? '');
	let financialStatementFiscalYearEnd = $state(data?.financialStatementFiscalYearEnd ?? '');

	const isStale = $derived(
		financialStatementFiscalYearEnd.length > 0 &&
		financialStatementFiscalYearEnd < today &&
		isFinancialStatementStale(financialStatementFiscalYearEnd)
	);
	let hasProjections = $state<boolean | null>(data?.hasProjections ?? null);
	let projectionSummary = $state(data?.projectionSummary ?? '');

	$effect(() => {
		untrack(() => onUpdate({
			financialStatements,
			financialStatementFiscalYearEnd: financialStatementFiscalYearEnd || null,
			hasProjections,
			projectionSummary: hasProjections ? projectionSummary : null
		}));
		const e: Record<string, string> = {};
		if (!financialStatements) e.financialStatements = 'Financial statement status is required';
		if (financialStatements && financialStatements !== 'none' && financialStatements !== 'unknown') {
			if (!financialStatementFiscalYearEnd) {
				e.financialStatementFiscalYearEnd = 'Enter the fiscal year-end date your statements cover';
			} else if (financialStatementFiscalYearEnd >= today) {
				e.financialStatementFiscalYearEnd = 'Fiscal year-end must be in the past';
			}
		}
		if (hasProjections === null) e.hasProjections = 'Please answer this question';
		if (hasProjections && (!projectionSummary || projectionSummary.length < 50)) e.projectionSummary = `Please summarize your projections (${projectionSummary.length}/50 chars minimum)`;
		errors = e;
	});
</script>

<div class="space-y-4">
	<FormField label="Financial Statements Status" name="financialStatements" required error={errors.financialStatements} helpText="What level of financial statements does your company have?">
		<select id="financialStatements" bind:value={financialStatements} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select status</option>
			{#each financialStatementStatuses as status}
				<option value={status}>{STATUS_LABELS[status]}</option>
			{/each}
		</select>
	</FormField>

	{#if financialStatements && financialStatements !== 'none' && financialStatements !== 'unknown'}
		<FormField
			label="Fiscal Year-End of Most Recent Financial Statements"
			name="financialStatementFiscalYearEnd"
			required
			error={errors.financialStatementFiscalYearEnd}
			helpText="The date your most recent fiscal year ended (e.g., December 31, 2025)"
		>
			<input
				type="date"
				bind:value={financialStatementFiscalYearEnd}
				max={today}
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold"
			/>
		</FormField>
	{/if}

	{#if isStale}
		<div class="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-800">
			<p class="font-medium mb-1">Financial Statements Are Stale (SEC C&DI 201.03)</p>
			<p>Your fiscal year-end is more than {STALE_FINANCIAL_DAYS} days in the past. Under SEC guidance, a Form C offering that spans more than 120 days past your fiscal year-end requires updated financial statements before filing. You will need to prepare updated financials before proceeding with your offering.</p>
		</div>
	{/if}

	<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
		<p class="font-medium mb-1">Financial Statement Levels</p>
		<ul class="list-disc ml-4 space-y-1">
			<li><strong>Internal Only:</strong> Prepared by your team, not reviewed by a CPA</li>
			<li><strong>Compiled:</strong> CPA organized your data but did not verify it</li>
			<li><strong>Reviewed:</strong> CPA performed analytical procedures and inquiries</li>
			<li><strong>Audited:</strong> CPA conducted full audit with opinion (required for larger raises)</li>
		</ul>
	</div>

	<FormField label="Do you have financial projections?" name="hasProjections" required error={errors.hasProjections}>
		<div class="flex gap-6">
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="hasProjections" checked={hasProjections === true} onchange={() => hasProjections = true} class="accent-sp-gold" />
				<span>Yes</span>
			</label>
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="hasProjections" checked={hasProjections === false} onchange={() => hasProjections = false} class="accent-sp-gold" />
				<span>No</span>
			</label>
		</div>
	</FormField>

	{#if hasProjections}
		<FormField label="Summarize your financial projections" name="projectionSummary" required error={errors.projectionSummary} helpText="Include projected revenue, expenses, and timeline. These don't need to be final.">
			<textarea id="projectionSummary" bind:value={projectionSummary} rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="We project $1M revenue in year 1, growing to $3M by year 3..."></textarea>
			<span class="text-xs text-sp-medium-gray">{projectionSummary.length}/50 minimum characters</span>
		</FormField>
	{/if}
</div>
