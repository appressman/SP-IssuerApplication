<script lang="ts">
	import { untrack } from 'svelte';
	import FormField from '../FormField.svelte';
	import { documentStatuses } from '$lib/schemas/readiness.js';

	const STATUS_LABELS: Record<string, string> = { none: 'None', draft: 'Draft', complete: 'Complete' };

	type Props = { data: Record<string, any> | undefined; onUpdate: (data: Record<string, any>) => void; errors: Record<string, string> };
	let { data, onUpdate, errors = $bindable({}) }: Props = $props();

	let businessPlan = $state(data?.businessPlan ?? '');
	let pitchDeck = $state(data?.pitchDeck ?? '');

	$effect(() => {
		untrack(() => onUpdate({ businessPlan, pitchDeck }));
		const e: Record<string, string> = {};
		if (!businessPlan) e.businessPlan = 'Business plan status is required';
		if (!pitchDeck) e.pitchDeck = 'Pitch deck status is required';
		errors = e;
	});
</script>

<div class="space-y-4">
	<FormField label="Business Plan Status" name="businessPlan" required error={errors.businessPlan} helpText="A business plan demonstrates how you will use the capital and generate returns.">
		<select id="businessPlan" bind:value={businessPlan} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select status</option>
			{#each documentStatuses as s}
				<option value={s}>{STATUS_LABELS[s]}</option>
			{/each}
		</select>
	</FormField>

	<FormField label="Pitch Deck Status" name="pitchDeck" required error={errors.pitchDeck} helpText="A pitch deck is a visual presentation used to communicate your offering to potential investors.">
		<select id="pitchDeck" bind:value={pitchDeck} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select status</option>
			{#each documentStatuses as s}
				<option value={s}>{STATUS_LABELS[s]}</option>
			{/each}
		</select>
	</FormField>

	{#if businessPlan === 'none' && pitchDeck === 'none'}
		<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
			Both a business plan and pitch deck are typically needed before launching a capital raise. Consider starting these documents as you proceed with this assessment.
		</div>
	{/if}
</div>
