<script lang="ts">
	import { TOTAL_FORM_STEPS } from '$lib/schemas/stepConfig.js';

	type Props = {
		currentStep: number;
		saving: boolean;
		validating: boolean;
		onPrevious: () => void;
		onNext: () => void;
		onSave: () => void;
	};

	let { currentStep, saving, validating, onPrevious, onNext, onSave }: Props = $props();

	let isFirstStep = $derived(currentStep === 1);
	let isLastFormStep = $derived(currentStep === TOTAL_FORM_STEPS);
	let isReview = $derived(currentStep > TOTAL_FORM_STEPS);
</script>

<div class="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
	<div>
		{#if !isFirstStep && !isReview}
			<button
				type="button"
				onclick={onPrevious}
				class="px-6 py-2 text-sp-navy border border-sp-navy rounded-lg hover:bg-sp-navy hover:text-white transition-colors"
			>
				Previous
			</button>
		{/if}
	</div>

	<div class="flex items-center gap-3">
		{#if !isReview}
			<button
				type="button"
				onclick={onSave}
				disabled={saving}
				class="px-4 py-2 text-sm text-sp-medium-gray border border-gray-300 rounded-lg hover:border-sp-navy hover:text-sp-navy transition-colors disabled:opacity-50"
			>
				{saving ? 'Saving...' : 'Save Draft'}
			</button>
		{/if}

		{#if !isReview}
			<button
				type="button"
				onclick={onNext}
				disabled={validating}
				class="px-6 py-2 bg-sp-gold text-sp-navy font-semibold rounded-lg hover:bg-sp-gold-light transition-colors disabled:opacity-50"
			>
				{#if validating}
					Validating...
				{:else if isLastFormStep}
					Review Your Application
				{:else}
					Next
				{/if}
			</button>
		{/if}
	</div>
</div>
