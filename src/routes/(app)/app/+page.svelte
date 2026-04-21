<script lang="ts">
	import ProgressBar from '../../../components/form/ProgressBar.svelte';
	import StepNavigation from '../../../components/form/StepNavigation.svelte';
	import SaveIndicator from '../../../components/form/SaveIndicator.svelte';
	import Step1 from '../../../components/form/steps/Step1.svelte';
	import Step2 from '../../../components/form/steps/Step2.svelte';
	import Step3 from '../../../components/form/steps/Step3.svelte';
	import Step4 from '../../../components/form/steps/Step4.svelte';
	import Step5 from '../../../components/form/steps/Step5.svelte';
	import Step6 from '../../../components/form/steps/Step6.svelte';
	import Step7 from '../../../components/form/steps/Step7.svelte';
	import Step8 from '../../../components/form/steps/Step8.svelte';
	import Step9 from '../../../components/form/steps/Step9.svelte';
	import Step10 from '../../../components/form/steps/Step10.svelte';
	import Step11 from '../../../components/form/steps/Step11.svelte';
	import Step12 from '../../../components/form/steps/Step12.svelte';
	import ReviewStep from '../../../components/review/ReviewStep.svelte';
	import ChatFab from '../../../components/chat/ChatFab.svelte';
	import ChatPanel from '../../../components/chat/ChatPanel.svelte';
	import { getStepConfig } from '$lib/schemas/stepConfig.js';

	let { data } = $props();

	let currentStep = $state(data.application.currentStep);
	let formData = $state<Record<string, any>>(data.application.formData);
	let saving = $state(false);
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let validating = $state(false);
	let errors = $state<Record<string, string>>({});
	let chatOpen = $state(false);

	let stepConfig = $derived(getStepConfig(currentStep));

	const stepComponents = [
		Step1, Step2, Step3, Step4, Step5, Step6,
		Step7, Step8, Step9, Step10, Step11, Step12,
		ReviewStep
	];

	async function saveDraft(step?: number) {
		saving = true;
		saveStatus = 'saving';
		try {
			const res = await fetch('/api/draft', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					applicationId: data.application.id,
					currentStep: step ?? currentStep,
					formData
				})
			});
			if (res.ok) {
				saveStatus = 'saved';
				setTimeout(() => { if (saveStatus === 'saved') saveStatus = 'idle'; }, 2000);
			} else {
				saveStatus = 'error';
			}
		} catch {
			saveStatus = 'error';
		} finally {
			saving = false;
		}
	}

	function handleStepData(stepKey: string, stepData: Record<string, any>) {
		formData = { ...formData, [stepKey]: stepData };
	}

	async function handleNext() {
		// The step component validates via its own onValidated callback
		// which sets errors. If no errors, proceed.
		validating = true;

		// Give step components a tick to validate
		await new Promise(r => setTimeout(r, 50));

		if (Object.keys(errors).length > 0) {
			validating = false;
			return;
		}

		const nextStep = currentStep + 1;
		await saveDraft(nextStep);
		currentStep = nextStep;
		validating = false;
		window.scrollTo(0, 0);
	}

	function handlePrevious() {
		if (currentStep > 1) {
			currentStep = currentStep - 1;
			errors = {};
			window.scrollTo(0, 0);
		}
	}

	function goToStep(step: number) {
		currentStep = step;
		errors = {};
		window.scrollTo(0, 0);
	}
</script>

<svelte:head>
	<title>{stepConfig?.title ?? 'Assessment'} | SyndicatePath</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8">
	<div class="flex items-center justify-between mb-2">
		<h1 class="text-lg font-bold text-sp-navy">Readiness Assessment</h1>
		<SaveIndicator status={saveStatus} onRetry={() => saveDraft()} />
	</div>

	<ProgressBar {currentStep} />

	{#if stepConfig}
		<div class="bg-white rounded-lg shadow-md p-6 md:p-8">
			<h2 class="text-xl font-bold text-sp-navy mb-1">{stepConfig.title}</h2>
			<p class="text-sm text-sp-medium-gray mb-6">{stepConfig.description}</p>

			{#if currentStep === 1}
				<Step1 data={formData.company} onUpdate={(d) => handleStepData('company', d)} bind:errors />
			{:else if currentStep === 2}
				<Step2 data={formData.regulatoryHistory} onUpdate={(d) => handleStepData('regulatoryHistory', d)} bind:errors />
			{:else if currentStep === 3}
				<Step3 data={formData.offering} onUpdate={(d) => handleStepData('offering', d)} bind:errors />
			{:else if currentStep === 4}
				<Step4 data={formData.useOfProceeds} onUpdate={(d) => handleStepData('useOfProceeds', d)} bind:errors />
			{:else if currentStep === 5}
				<Step5 data={formData.financial} onUpdate={(d) => handleStepData('financial', d)} bind:errors />
			{:else if currentStep === 6}
				<Step6 data={formData.team} onUpdate={(d) => handleStepData('team', d)} bind:errors />
			{:else if currentStep === 7}
				<Step7 data={formData.market} onUpdate={(d) => handleStepData('market', d)} bind:errors />
			{:else if currentStep === 8}
				<Step8 data={formData.investorReturns} securityType={formData.offering?.securityType} onUpdate={(d) => handleStepData('investorReturns', d)} bind:errors />
			{:else if currentStep === 9}
				<Step9 data={formData.documentation} onUpdate={(d) => handleStepData('documentation', d)} bind:errors />
			{:else if currentStep === 10}
				<Step10 data={formData.professionals} onUpdate={(d) => handleStepData('professionals', d)} bind:errors />
			{:else if currentStep === 11}
				<Step11 data={formData.capacity} offering={formData.offering} onUpdate={(d) => handleStepData('capacity', d)} bind:errors />
			{:else if currentStep === 12}
				<Step12 data={formData.timeline} onUpdate={(d) => handleStepData('timeline', d)} bind:errors />
			{:else if currentStep === 13}
				<ReviewStep {formData} applicationId={data.application.id} onEdit={goToStep} />
			{/if}

			{#if currentStep <= 12}
				<StepNavigation
					{currentStep}
					{saving}
					{validating}
					onPrevious={handlePrevious}
					onNext={handleNext}
					onSave={() => saveDraft()}
				/>
			{/if}
		</div>
	{/if}
</div>

{#if currentStep !== 13}
	<ChatFab hidden={chatOpen} onClick={() => chatOpen = true} />
	<ChatPanel
		applicationId={data.application.id}
		stepNumber={currentStep}
		open={chatOpen}
		onClose={() => chatOpen = false}
		onOpen={() => chatOpen = true}
	/>
{/if}
