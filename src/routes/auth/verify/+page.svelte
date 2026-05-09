<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	let { data, form } = $props();

	$effect(() => {
		if (form?.success) {
			goto('/app');
		}
	});
</script>

<svelte:head>
	<title>Log In | SyndicatePath Readiness Assessment</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center py-12 px-4">
	<div class="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
		<div class="mb-6">
			<h1 class="text-2xl font-bold text-sp-navy">Confirm Login</h1>
			<p class="text-sp-medium-gray mt-2">Click the button below to complete your login.</p>
		</div>

		{#if data.loadError}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
				<p class="text-red-700 text-sm">{decodeURIComponent(data.loadError)}</p>
			</div>
			<a href="/auth/login" class="text-sp-gold hover:underline text-sm">Request a new link</a>
		{:else if form?.error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
				<p class="text-red-700 text-sm">{form.error}</p>
			</div>
			<a href="/auth/login" class="text-sp-gold hover:underline text-sm">Request a new link</a>
		{:else if form?.success}
			<p class="text-sp-medium-gray text-sm">Logging you in...</p>
		{:else}
			<form method="POST" action="?/confirm" use:enhance>
				<input type="hidden" name="token" value={data.token ?? ''} />
				<input type="hidden" name="nonce" value={data.nonce ?? ''} />
				<button
					type="submit"
					class="w-full bg-sp-gold text-sp-navy font-semibold py-3 px-6 rounded-lg hover:bg-sp-gold/90 transition-colors"
				>
					Log In to SyndicatePath
				</button>
			</form>
			<p class="text-sp-light-gray text-xs mt-4">
				Wrong account? <a href="/auth/login" class="text-sp-gold hover:underline">Use a different email</a>
			</p>
		{/if}
	</div>
</div>
