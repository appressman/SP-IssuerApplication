<script lang="ts">
	import { untrack } from 'svelte';
	import FormField from '../FormField.svelte';

	type Props = { data: Record<string, any> | undefined; onUpdate: (data: Record<string, any>) => void; errors: Record<string, string> };
	let { data, onUpdate, errors = $bindable({}) }: Props = $props();

	let teamQualifications = $state(data?.teamQualifications ?? '');

	$effect(() => {
		untrack(() => onUpdate({ teamQualifications }));
		const e: Record<string, string> = {};
		if (!teamQualifications || teamQualifications.length < 100) e.teamQualifications = `Please provide more detail (${teamQualifications.length}/100 characters minimum)`;
		errors = e;
	});
</script>

<div class="space-y-4">
	<FormField label="Describe your leadership team and their relevant qualifications" name="teamQualifications" required error={errors.teamQualifications} helpText="Include key team members, their roles, relevant experience, and why they are the right people to execute this plan.">
		<textarea id="teamQualifications" bind:value={teamQualifications} rows="6" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="Our CEO, Jane Smith, has 15 years in fintech and previously served as VP at..."></textarea>
		<span class="text-xs text-sp-medium-gray">{teamQualifications.length}/100 minimum characters</span>
	</FormField>

	<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
		<p class="font-medium mb-1">What we look for in a team</p>
		<ul class="list-disc ml-4 space-y-1">
			<li>Domain expertise relevant to the business</li>
			<li>Prior leadership or entrepreneurial experience</li>
			<li>Technical skills needed to deliver the product/service</li>
			<li>Industry credentials, certifications, or track record</li>
			<li>Complementary skills across the team</li>
		</ul>
	</div>
</div>
