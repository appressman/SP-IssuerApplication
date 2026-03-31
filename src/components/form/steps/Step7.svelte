<script lang="ts">
	import FormField from '../FormField.svelte';

	type Props = { data: Record<string, any> | undefined; onUpdate: (data: Record<string, any>) => void; errors: Record<string, string> };
	let { data, onUpdate, errors = $bindable({}) }: Props = $props();

	let assumptions = $state(data?.assumptions ?? '');

	$effect(() => {
		onUpdate({ assumptions });
		const e: Record<string, string> = {};
		if (!assumptions || assumptions.length < 100) e.assumptions = `Please provide more detail (${assumptions.length}/100 characters minimum)`;
		errors = e;
	});
</script>

<div class="space-y-4">
	<FormField label="Describe your market opportunity and validation" name="assumptions" required error={errors.assumptions} helpText="What evidence do you have that the market wants your product or service?">
		<textarea id="assumptions" bind:value={assumptions} rows="6" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="Our target market is $X billion. We have validated demand through..."></textarea>
		<span class="text-xs text-sp-medium-gray">{assumptions.length}/100 minimum characters</span>
	</FormField>

	<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
		<p class="font-medium mb-1">Include evidence such as:</p>
		<ul class="list-disc ml-4 space-y-1">
			<li>Paying customers or revenue traction</li>
			<li>Pilots, LOIs, or partnership agreements</li>
			<li>Audience size or community engagement</li>
			<li>Market research or comparable companies</li>
			<li>Competitive landscape and your positioning</li>
		</ul>
	</div>
</div>
