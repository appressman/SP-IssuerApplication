<script lang="ts">
	import FormField from '../FormField.svelte';
	import { securityTypes, exemptionTargets } from '$lib/schemas/offering.js';

	const SECURITY_LABELS: Record<string, string> = {
		equity: 'Equity', debt: 'Debt', revenue_share: 'Revenue Share',
		safe: 'SAFE', convertible_note: 'Convertible Note', other: 'Other'
	};
	const EXEMPTION_LABELS: Record<string, string> = {
		reg_cf: 'Regulation CF', reg_d_506b: 'Reg D 506(b)', reg_d_506c: 'Reg D 506(c)',
		undecided: 'Undecided', other: 'Other'
	};

	type Props = {
		data: Record<string, any> | undefined;
		onUpdate: (data: Record<string, any>) => void;
		errors: Record<string, string>;
	};

	let { data, onUpdate, errors = $bindable({}) }: Props = $props();

	let securityType = $state(data?.securityType ?? '');
	let securityTypeOther = $state(data?.securityTypeOther ?? '');
	let exemptionTarget = $state(data?.exemptionTarget ?? '');
	let raiseTargetUsd = $state<string>(data?.raiseTargetUsd?.toString() ?? '');
	let minimumRaiseUsd = $state<string>(data?.minimumRaiseUsd?.toString() ?? '');
	let maximumRaiseUsd = $state<string>(data?.maximumRaiseUsd?.toString() ?? '');
	let minimumInvestmentUsd = $state<string>(data?.minimumInvestmentUsd?.toString() ?? '');
	let offeringDescription = $state(data?.offeringDescription ?? '');

	function toNum(v: string): number | null {
		const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
		return isNaN(n) ? null : n;
	}

	function formatCurrency(v: string): string {
		const n = toNum(v);
		if (n === null) return v;
		return n.toLocaleString('en-US');
	}

	$effect(() => {
		onUpdate({
			securityType, securityTypeOther: securityType === 'other' ? securityTypeOther : null,
			exemptionTarget, raiseTargetUsd: toNum(raiseTargetUsd),
			minimumRaiseUsd: toNum(minimumRaiseUsd), maximumRaiseUsd: toNum(maximumRaiseUsd),
			minimumInvestmentUsd: toNum(minimumInvestmentUsd) || null,
			offeringDescription: offeringDescription || null
		});

		const e: Record<string, string> = {};
		if (!securityType) e.securityType = 'Security type is required';
		if (securityType === 'other' && !securityTypeOther) e.securityTypeOther = 'Please describe the security type';
		if (!exemptionTarget) e.exemptionTarget = 'Exemption target is required';
		if (!toNum(raiseTargetUsd)) e.raiseTargetUsd = 'Raise target is required';
		if (!toNum(minimumRaiseUsd)) e.minimumRaiseUsd = 'Minimum raise is required';
		if (!toNum(maximumRaiseUsd)) e.maximumRaiseUsd = 'Maximum raise is required';
		const min = toNum(minimumRaiseUsd), max = toNum(maximumRaiseUsd), target = toNum(raiseTargetUsd);
		if (min && max && max < min) e.maximumRaiseUsd = 'Maximum must be greater than or equal to minimum';
		if (target && min && max && (target < min || target > max)) e.raiseTargetUsd = 'Target must be between minimum and maximum';
		errors = e;
	});
</script>

<div class="space-y-4">
	<FormField label="Security Type" name="securityType" required error={errors.securityType} helpText="What type of security will you offer to investors?">
		<select id="securityType" bind:value={securityType} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select security type</option>
			{#each securityTypes as st}
				<option value={st}>{SECURITY_LABELS[st]}</option>
			{/each}
		</select>
	</FormField>

	{#if securityType === 'other'}
		<FormField label="Describe the security type" name="securityTypeOther" required error={errors.securityTypeOther}>
			<input type="text" id="securityTypeOther" bind:value={securityTypeOther} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" />
		</FormField>
	{/if}

	<FormField label="Exemption Target" name="exemptionTarget" required error={errors.exemptionTarget} helpText="Which securities exemption are you considering? Select 'Undecided' if unsure.">
		<select id="exemptionTarget" bind:value={exemptionTarget} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select exemption</option>
			{#each exemptionTargets as et}
				<option value={et}>{EXEMPTION_LABELS[et]}</option>
			{/each}
		</select>
	</FormField>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<FormField label="Raise Target (USD)" name="raiseTargetUsd" required error={errors.raiseTargetUsd}>
			<div class="relative">
				<span class="absolute left-3 top-2 text-sp-medium-gray">$</span>
				<input type="text" id="raiseTargetUsd" value={formatCurrency(raiseTargetUsd)} oninput={(e) => raiseTargetUsd = (e.target as HTMLInputElement).value} class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="500,000" />
			</div>
		</FormField>

		<FormField label="Minimum Raise (USD)" name="minimumRaiseUsd" required error={errors.minimumRaiseUsd}>
			<div class="relative">
				<span class="absolute left-3 top-2 text-sp-medium-gray">$</span>
				<input type="text" id="minimumRaiseUsd" value={formatCurrency(minimumRaiseUsd)} oninput={(e) => minimumRaiseUsd = (e.target as HTMLInputElement).value} class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="250,000" />
			</div>
		</FormField>

		<FormField label="Maximum Raise (USD)" name="maximumRaiseUsd" required error={errors.maximumRaiseUsd}>
			<div class="relative">
				<span class="absolute left-3 top-2 text-sp-medium-gray">$</span>
				<input type="text" id="maximumRaiseUsd" value={formatCurrency(maximumRaiseUsd)} oninput={(e) => maximumRaiseUsd = (e.target as HTMLInputElement).value} class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="750,000" />
			</div>
		</FormField>
	</div>

	<FormField label="Minimum Investment (USD)" name="minimumInvestmentUsd" helpText="The smallest amount a single investor can invest (optional)">
		<div class="relative">
			<span class="absolute left-3 top-2 text-sp-medium-gray">$</span>
			<input type="text" id="minimumInvestmentUsd" value={formatCurrency(minimumInvestmentUsd)} oninput={(e) => minimumInvestmentUsd = (e.target as HTMLInputElement).value} class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="100" />
		</div>
	</FormField>

	<FormField label="Offering Description" name="offeringDescription" helpText="Brief description of your offering (optional)">
		<textarea id="offeringDescription" bind:value={offeringDescription} rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="Describe what you are offering to investors..."></textarea>
	</FormField>
</div>
