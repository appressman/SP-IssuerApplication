<script lang="ts">
	import FormField from '../FormField.svelte';
	import { professionalStatuses } from '$lib/schemas/readiness.js';

	const STATUS_LABELS: Record<string, string> = { none: 'None', identified: 'Identified', engaged: 'Engaged' };

	type Props = { data: Record<string, any> | undefined; onUpdate: (data: Record<string, any>) => void; errors: Record<string, string> };
	let { data, onUpdate, errors = $bindable({}) }: Props = $props();

	let attorney = $state(data?.attorney ?? '');
	let cpa = $state(data?.cpa ?? '');
	let marketing = $state(data?.marketing ?? '');

	$effect(() => {
		onUpdate({ attorney, cpa, marketing });
		const e: Record<string, string> = {};
		if (!attorney) e.attorney = 'Attorney status is required';
		if (!cpa) e.cpa = 'CPA status is required';
		if (!marketing) e.marketing = 'Marketing support status is required';
		errors = e;
	});
</script>

<div class="space-y-4">
	<FormField label="Securities Attorney Status" name="attorney" required error={errors.attorney} helpText="A securities attorney is required for any securities offering to prepare legal documents and ensure compliance.">
		<select id="attorney" bind:value={attorney} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select status</option>
			{#each professionalStatuses as s}
				<option value={s}>{STATUS_LABELS[s]}</option>
			{/each}
		</select>
	</FormField>

	{#if attorney === 'none'}
		<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
			A securities attorney is required for any offering. SyndicatePath can provide referrals to qualified securities attorneys.
		</div>
	{/if}

	<FormField label="CPA / Accountant Status" name="cpa" required error={errors.cpa} helpText="A CPA prepares financial statements required for your offering (level depends on raise amount).">
		<select id="cpa" bind:value={cpa} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select status</option>
			{#each professionalStatuses as s}
				<option value={s}>{STATUS_LABELS[s]}</option>
			{/each}
		</select>
	</FormField>

	<FormField label="Marketing Support Status" name="marketing" required error={errors.marketing} helpText="Marketing support helps drive investor interest during your campaign.">
		<select id="marketing" bind:value={marketing} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select status</option>
			{#each professionalStatuses as s}
				<option value={s}>{STATUS_LABELS[s]}</option>
			{/each}
		</select>
	</FormField>
</div>
