<script lang="ts">
	import { untrack } from 'svelte';
	import FormField from '../FormField.svelte';
	import { timelineExpectations } from '$lib/schemas/timeline.js';

	const TIMELINE_LABELS: Record<string, string> = {
		lt_30_days: 'Less than 30 days',
		'1_to_3_months': '1 to 3 months',
		'3_to_6_months': '3 to 6 months',
		'6_plus_months': '6+ months',
		unknown: 'Not sure yet'
	};

	type Props = { data: Record<string, any> | undefined; onUpdate: (data: Record<string, any>) => void; errors: Record<string, string> };
	let { data, onUpdate, errors = $bindable({}) }: Props = $props();

	let desiredLaunchDate = $state(data?.desiredLaunchDate ?? '');
	let timelineExpectation = $state(data?.timelineExpectation ?? '');
	let understandsPreparationTime = $state<boolean | null>(data?.understandsPreparationTime ?? null);

	$effect(() => {
		untrack(() => onUpdate({ desiredLaunchDate: desiredLaunchDate || null, timelineExpectation: timelineExpectation || null, understandsPreparationTime }));
		const e: Record<string, string> = {};
		if (!timelineExpectation) e.timelineExpectation = 'Timeline expectation is required';
		if (understandsPreparationTime === null) e.understandsPreparationTime = 'Please acknowledge preparation requirements';
		if (desiredLaunchDate) {
			const launch = new Date(desiredLaunchDate);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			if (launch < today) e.desiredLaunchDate = 'Launch date cannot be in the past';
		}
		errors = e;
	});
</script>

<div class="space-y-4">
	<FormField label="Desired Launch Date" name="desiredLaunchDate" error={errors.desiredLaunchDate} helpText="When would you ideally like to launch your offering? This is optional and helps us plan.">
		<input type="date" id="desiredLaunchDate" bind:value={desiredLaunchDate} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" />
	</FormField>

	<FormField label="Timeline Expectation" name="timelineExpectation" required error={errors.timelineExpectation} helpText="How soon do you expect to be ready to launch a capital raise?">
		<select id="timelineExpectation" bind:value={timelineExpectation} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select timeline</option>
			{#each timelineExpectations as t}
				<option value={t}>{TIMELINE_LABELS[t]}</option>
			{/each}
		</select>
	</FormField>

	<FormField label="Do you understand that preparing a Regulation CF offering typically takes 60-90 days of active preparation?" name="understandsPreparationTime" required error={errors.understandsPreparationTime}>
		<div class="flex gap-6">
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="understandsPreparationTime" checked={understandsPreparationTime === true} onchange={() => understandsPreparationTime = true} class="accent-sp-gold" />
				<span>Yes, I understand</span>
			</label>
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="understandsPreparationTime" checked={understandsPreparationTime === false} onchange={() => understandsPreparationTime = false} class="accent-sp-gold" />
				<span>No, tell me more</span>
			</label>
		</div>
	</FormField>

	{#if understandsPreparationTime === false}
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
			<p class="font-medium mb-1">Typical Preparation Timeline</p>
			<ul class="list-disc ml-4 space-y-1">
				<li><strong>Weeks 1-2:</strong> Legal entity review, securities attorney engagement, financial statement preparation</li>
				<li><strong>Weeks 3-4:</strong> Offering document drafting (Form C), pitch deck finalization, marketing plan</li>
				<li><strong>Weeks 5-6:</strong> Portal review and compliance checks, campaign page creation</li>
				<li><strong>Weeks 7-8:</strong> Pre-launch marketing, community building, investor outreach preparation</li>
				<li><strong>Launch:</strong> Campaign goes live, active marketing and investor relations for 60-90+ days</li>
			</ul>
		</div>
	{/if}

	{#if timelineExpectation === 'lt_30_days'}
		<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
			A 30-day timeline is very aggressive for most offerings. We recommend at least 60 days of preparation. SyndicatePath can help you assess what is realistic for your situation.
		</div>
	{/if}
</div>
