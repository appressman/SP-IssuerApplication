<script lang="ts">
	import { untrack } from 'svelte';
	import FormField from '../FormField.svelte';

	const SECURITY_HELP: Record<string, string> = {
		equity: 'Describe the class of shares, any preferences, voting rights, and dividend policy.',
		debt: 'Describe the interest rate, term, payment schedule, and any security/collateral.',
		revenue_share: 'Describe the percentage of revenue shared, payment frequency, and any cap.',
		safe: 'Describe the valuation cap, discount rate, and conversion trigger events.',
		convertible_note: 'Describe the valuation cap, discount rate, interest rate, and maturity date.',
		other: 'Describe what investors will receive in exchange for their investment.'
	};

	type Props = { data: Record<string, any> | undefined; securityType?: string; onUpdate: (data: Record<string, any>) => void; errors: Record<string, string> };
	let { data, onUpdate, securityType = '', errors = $bindable({}) }: Props = $props();

	let whatFromInvestors = $state(data?.whatFromInvestors ?? '');
	let principalReturn = $state(data?.principalReturn ?? '');
	let investorConsideration = $state(data?.investorConsideration ?? '');

	let helpText = $derived(SECURITY_HELP[securityType] || SECURITY_HELP.other);

	$effect(() => {
		untrack(() => onUpdate({ whatFromInvestors, principalReturn, investorConsideration }));
		const e: Record<string, string> = {};
		if (!whatFromInvestors) e.whatFromInvestors = 'Please describe what investors will receive';
		if (!principalReturn) e.principalReturn = 'Please describe the principal return mechanism';
		if (!investorConsideration) e.investorConsideration = 'Please describe the total consideration';
		errors = e;
	});
</script>

<div class="space-y-4">
	<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
		The descriptions you provide here are for preliminary assessment only. Your attorney will draft the actual offering terms.
	</div>

	<FormField label="What will investors receive?" name="whatFromInvestors" required error={errors.whatFromInvestors} helpText={helpText}>
		<textarea id="whatFromInvestors" bind:value={whatFromInvestors} rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="Investors will receive..."></textarea>
	</FormField>

	<FormField label="How and when will investors get their principal back?" name="principalReturn" required error={errors.principalReturn} helpText="Describe the mechanism and expected timeline for return of principal.">
		<textarea id="principalReturn" bind:value={principalReturn} rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="Investors can expect to..."></textarea>
	</FormField>

	<FormField label="What is the total consideration investors will receive and when?" name="investorConsideration" required error={errors.investorConsideration} helpText="Summarize the economic return investors can expect.">
		<textarea id="investorConsideration" bind:value={investorConsideration} rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="The total consideration includes..."></textarea>
	</FormField>
</div>
