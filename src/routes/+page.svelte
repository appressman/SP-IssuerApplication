<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Readiness Assessment | SyndicatePath</title>
	<meta name="description" content="Evaluate your company's readiness to raise capital through SyndicatePath." />
</svelte:head>

<section class="bg-sp-navy text-sp-white py-16 md:py-24">
	<div class="max-w-3xl mx-auto px-4 text-center">
		<h1 class="text-3xl md:text-4xl font-bold mb-4">
			Issuer Readiness Assessment
		</h1>
		<p class="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
			This readiness assessment helps SyndicatePath understand your company, capital goals,
			and current preparation level so we can determine fit and identify next steps.
			It is a preliminary intake tool only and does not provide legal, financial, or investment advice.
		</p>
		<a
			href={data.user ? '/app' : '/auth/login'}
			class="inline-block bg-sp-gold text-sp-navy font-semibold px-8 py-3 rounded-lg hover:bg-sp-gold-light transition-colors text-lg"
		>
			Begin Your Readiness Assessment
		</a>
	</div>
</section>

<section class="py-12 md:py-16">
	<div class="max-w-4xl mx-auto px-4">
		<h2 class="text-2xl font-bold text-center mb-8">What to Expect</h2>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
			<div class="bg-white rounded-lg p-6 shadow-sm text-center">
				<div class="text-3xl font-bold text-sp-gold mb-2">12</div>
				<div class="font-semibold mb-1">Sections</div>
				<p class="text-sm text-sp-medium-gray">Covering your company, offering, team, and readiness</p>
			</div>
			<div class="bg-white rounded-lg p-6 shadow-sm text-center">
				<div class="text-3xl font-bold text-sp-gold mb-2">20-30</div>
				<div class="font-semibold mb-1">Minutes</div>
				<p class="text-sm text-sp-medium-gray">Estimated time to complete the assessment</p>
			</div>
			<div class="bg-white rounded-lg p-6 shadow-sm text-center">
				<div class="text-3xl font-bold text-sp-gold mb-2">&infin;</div>
				<div class="font-semibold mb-1">Save & Resume</div>
				<p class="text-sm text-sp-medium-gray">Your progress is saved automatically</p>
			</div>
			<div class="bg-white rounded-lg p-6 shadow-sm text-center">
				<div class="text-3xl font-bold text-sp-gold mb-2">Score</div>
				<div class="font-semibold mb-1">Readiness Score</div>
				<p class="text-sm text-sp-medium-gray">Get a preliminary readiness assessment</p>
			</div>
		</div>
	</div>
</section>

<section class="bg-white py-12 border-t">
	<div class="max-w-3xl mx-auto px-4 text-center text-sm text-sp-medium-gray space-y-2">
		<p>This is a prequalification tool, not a securities offering.</p>
		<p>No legal, investment, or financial advice is provided.</p>
		<p>All assessments are preliminary and subject to full review by the SyndicatePath team.</p>
		<p>SyndicatePath will conduct independent due diligence on all applicants.</p>
	</div>
</section>
