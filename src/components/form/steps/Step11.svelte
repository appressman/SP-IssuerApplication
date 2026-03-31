<script lang="ts">
	import { untrack } from 'svelte';
	import FormField from '../FormField.svelte';
	import { capacityLevels, onlinePresenceLevels } from '$lib/schemas/readiness.js';

	const CAPACITY_LABELS: Record<string, string> = { low: 'Low', moderate: 'Moderate', high: 'High' };
	const PRESENCE_LABELS: Record<string, string> = { weak: 'Weak', basic: 'Basic', established: 'Established', strong: 'Strong' };

	type Props = { data: Record<string, any> | undefined; onUpdate: (data: Record<string, any>) => void; errors: Record<string, string> };
	let { data, onUpdate, errors = $bindable({}) }: Props = $props();

	let leadershipTimeCapacity = $state(data?.leadershipTimeCapacity ?? '');
	let teamExecutionCapacity = $state(data?.teamExecutionCapacity ?? '');
	let canSupportCampaignFor90Days = $state<boolean | null>(data?.canSupportCampaignFor90Days ?? null);
	let onlinePresence = $state(data?.onlinePresence ?? '');

	$effect(() => {
		untrack(() => onUpdate({ leadershipTimeCapacity: leadershipTimeCapacity || null, teamExecutionCapacity: teamExecutionCapacity || null, canSupportCampaignFor90Days, onlinePresence }));
		const e: Record<string, string> = {};
		if (!leadershipTimeCapacity) e.leadershipTimeCapacity = 'Leadership capacity is required';
		if (!teamExecutionCapacity) e.teamExecutionCapacity = 'Team capacity is required';
		if (canSupportCampaignFor90Days === null) e.canSupportCampaignFor90Days = 'Please answer this question';
		if (!onlinePresence) e.onlinePresence = 'Online presence level is required';
		errors = e;
	});
</script>

<div class="space-y-4">
	<FormField label="Leadership Time Capacity" name="leadershipTimeCapacity" required error={errors.leadershipTimeCapacity} helpText="How much time can your leadership team dedicate to the capital raise over the next 3-6 months?">
		<select id="leadershipTimeCapacity" bind:value={leadershipTimeCapacity} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select capacity</option>
			{#each capacityLevels as level}
				<option value={level}>{CAPACITY_LABELS[level]}</option>
			{/each}
		</select>
	</FormField>

	<FormField label="Team Execution Capacity" name="teamExecutionCapacity" required error={errors.teamExecutionCapacity} helpText="Does your team have bandwidth to manage campaign activities alongside normal operations?">
		<select id="teamExecutionCapacity" bind:value={teamExecutionCapacity} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select capacity</option>
			{#each capacityLevels as level}
				<option value={level}>{CAPACITY_LABELS[level]}</option>
			{/each}
		</select>
	</FormField>

	<FormField label="Can your company support active campaign activity for at least 90 days?" name="canSupportCampaignFor90Days" required error={errors.canSupportCampaignFor90Days} helpText="Regulation CF campaigns typically run 60-90+ days and require active marketing, investor communication, and compliance updates.">
		<div class="flex gap-6">
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="canSupportCampaignFor90Days" checked={canSupportCampaignFor90Days === true} onchange={() => canSupportCampaignFor90Days = true} class="accent-sp-gold" />
				<span>Yes</span>
			</label>
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="canSupportCampaignFor90Days" checked={canSupportCampaignFor90Days === false} onchange={() => canSupportCampaignFor90Days = false} class="accent-sp-gold" />
				<span>No</span>
			</label>
		</div>
	</FormField>

	<FormField label="Online Presence Maturity" name="onlinePresence" required error={errors.onlinePresence}>
		<select id="onlinePresence" bind:value={onlinePresence} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select level</option>
			{#each onlinePresenceLevels as level}
				<option value={level}>{PRESENCE_LABELS[level]}</option>
			{/each}
		</select>
	</FormField>

	<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
		<p class="font-medium mb-1">Online Presence Levels</p>
		<ul class="list-disc ml-4 space-y-1">
			<li><strong>Weak:</strong> No website or minimal social media presence</li>
			<li><strong>Basic:</strong> Simple website, some social media accounts</li>
			<li><strong>Established:</strong> Professional website, active social media, some press or content</li>
			<li><strong>Strong:</strong> Professional website, large following, media coverage, strong brand recognition</li>
		</ul>
	</div>
</div>
