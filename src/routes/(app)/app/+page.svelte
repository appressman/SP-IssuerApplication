<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Readiness Assessment | SyndicatePath</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-12">
	<div class="bg-white rounded-lg shadow-md p-8 text-center">
		<h1 class="text-2xl font-bold text-sp-navy mb-4">Welcome, {data.user.name}</h1>
		<p class="text-sp-medium-gray mb-6">
			Your readiness assessment wizard will appear here. Form steps are coming in the next build phase.
		</p>
		<p class="text-sm text-sp-medium-gray">
			Logged in as {data.user.email}
		</p>
	</div>
</div>
