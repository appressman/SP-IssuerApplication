<script lang="ts">
	import { TOTAL_FORM_STEPS } from '$lib/schemas/stepConfig.js';
	import { steps } from '$lib/schemas/stepConfig.js';

	type Props = {
		currentStep: number;
	};

	let { currentStep }: Props = $props();

	let percentage = $derived(Math.round((Math.min(currentStep, TOTAL_FORM_STEPS) / TOTAL_FORM_STEPS) * 100));
	let label = $derived(
		currentStep > TOTAL_FORM_STEPS
			? 'Review & Submit'
			: `Step ${currentStep} of ${TOTAL_FORM_STEPS}`
	);
</script>

<div class="mb-6" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
	<div class="flex items-center justify-between mb-2">
		<span class="text-sm font-medium text-sp-navy">{label}</span>
		<span class="text-sm text-sp-medium-gray">{percentage}%</span>
	</div>
	<div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
		<div
			class="h-full bg-sp-gold rounded-full transition-all duration-300"
			style="width: {percentage}%"
		></div>
	</div>
	<div class="hidden md:flex justify-between mt-2">
		{#each steps.slice(0, TOTAL_FORM_STEPS) as step}
			<div
				class="text-xs text-center w-[7.5%] truncate {step.stepNumber <= currentStep ? 'text-sp-navy font-medium' : 'text-gray-400'}"
				title={step.title}
			>
				{step.stepNumber}
			</div>
		{/each}
	</div>
</div>
