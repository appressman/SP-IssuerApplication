<script lang="ts">
	let { data } = $props();

	const BAND_LABELS: Record<string, string> = {
		qualified: 'Qualified',
		qualified_with_reservations: 'Qualified with Reservations',
		not_qualified: 'Not Yet Qualified'
	};

	const bandLabel = data.band ? (BAND_LABELS[data.band] ?? 'Under Review') : 'Under Review';

	const submittedDate = data.submittedAt
		? new Date(data.submittedAt).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})
		: null;
</script>

<svelte:head>
	<title>Application Submitted | SyndicatePath Readiness Assessment</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center py-12 px-4">
	<div class="bg-white rounded-lg shadow-md p-8 w-full max-w-lg text-center">
		<div class="mb-6">
			<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<h1 class="text-2xl font-bold text-sp-navy">Application Submitted</h1>
			{#if submittedDate}
				<p class="text-sp-medium-gray mt-1 text-sm">Submitted on {submittedDate}</p>
			{/if}
		</div>

		{#if data.score !== null}
			<div class="bg-gray-50 rounded-lg p-4 mb-6">
				<p class="text-xs text-sp-medium-gray uppercase tracking-wide mb-1">Preliminary Score</p>
				<p class="text-3xl font-bold text-sp-navy">{data.score}</p>
				<p class="text-sm text-sp-medium-gray mt-1">{bandLabel}</p>
			</div>
		{/if}

		<p class="text-sp-medium-gray text-sm leading-relaxed mb-6">
			Thank you for completing the SyndicatePath Readiness Assessment. Our team will review your
			application and reach out within 2&ndash;3 business days with next steps.
		</p>

		<p class="text-xs text-sp-light-gray">
			Questions? Email us at
			<a href="mailto:services@syndicatepath.com" class="text-sp-gold hover:underline">
				services@syndicatepath.com
			</a>
		</p>
	</div>
</div>
