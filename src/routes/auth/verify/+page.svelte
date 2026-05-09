<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const challengeId = $derived(form?.challengeId ?? data.challengeId);

	$effect(() => {
		if (form?.success) {
			window.location.href = '/app';
		}
	});
</script>

<svelte:head>
	<title>Enter Login Code | SyndicatePath Readiness Assessment</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center py-12 px-4">
	<div class="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
		<div class="text-center mb-6">
			<h1 class="text-2xl font-bold text-sp-navy">Check Your Email</h1>
			<p class="text-sp-medium-gray mt-2">
				Enter the 6-digit code we sent you. It expires in 15 minutes.
			</p>
		</div>

		{#if !challengeId}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-center">
				<p class="text-red-700 text-sm">No login session found.</p>
			</div>
			<div class="text-center">
				<a href="/auth/login" class="text-sp-gold hover:underline text-sm">Request a new code</a>
			</div>
		{:else if form?.success}
			<p class="text-center text-sp-medium-gray text-sm">Logging you in...</p>
		{:else}
			{#if form?.error}
				<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
					{form.error}
				</div>
			{/if}

			<form method="POST" action="?/verify" use:enhance>
				<input type="hidden" name="challenge_id" value={challengeId} />

				<div class="mb-6">
					<label for="code" class="block text-sm font-medium text-sp-dark-text mb-1">
						6-Digit Code <span class="text-sp-error">*</span>
					</label>
					<input
						type="text"
						id="code"
						name="code"
						required
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength="6"
						placeholder="000000"
						class="w-full px-3 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold"
					/>
				</div>

				<button
					type="submit"
					class="w-full bg-sp-gold text-sp-navy font-semibold py-3 rounded-lg hover:bg-sp-gold-light transition-colors"
				>
					Log In
				</button>
			</form>

			<p class="text-xs text-sp-medium-gray text-center mt-4">
				Didn't receive a code?
				<a href="/auth/login" class="text-sp-gold hover:underline">Request a new one</a>
			</p>
		{/if}
	</div>
</div>
