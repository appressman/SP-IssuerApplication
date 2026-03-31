<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<svelte:head>
	<title>Log In | SyndicatePath Readiness Assessment</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center py-12 px-4">
	<div class="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
		<div class="text-center mb-6">
			<h1 class="text-2xl font-bold text-sp-navy">Welcome</h1>
			<p class="text-sp-medium-gray mt-2">
				Enter your email to receive a login link. No password needed.
			</p>
		</div>

		{#if form?.success}
			<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
				<p class="text-green-800 font-semibold">Check your email</p>
				<p class="text-green-700 text-sm mt-1">
					We sent a login link to <strong>{form.email}</strong>. Click the link to continue.
				</p>
				<p class="text-green-600 text-xs mt-2">
					The link expires in 15 minutes.
				</p>
			</div>
		{:else}
			{#if form?.error}
				<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
					{form.error}
				</div>
			{/if}

			<form method="POST" use:enhance>
				<div class="mb-4">
					<label for="name" class="block text-sm font-medium text-sp-dark-text mb-1">
						Your Name <span class="text-sp-error">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						required
						minlength="2"
						value={form?.name ?? ''}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold"
						placeholder="Jane Smith"
					/>
				</div>

				<div class="mb-6">
					<label for="email" class="block text-sm font-medium text-sp-dark-text mb-1">
						Email Address <span class="text-sp-error">*</span>
					</label>
					<input
						type="email"
						id="email"
						name="email"
						required
						value={form?.email ?? ''}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold"
						placeholder="jane@company.com"
					/>
				</div>

				<button
					type="submit"
					class="w-full bg-sp-gold text-sp-navy font-semibold py-3 rounded-lg hover:bg-sp-gold-light transition-colors"
				>
					Send Login Link
				</button>
			</form>

			<p class="text-xs text-sp-medium-gray text-center mt-4">
				By continuing, you agree to our terms of use and privacy policy.
			</p>
		{/if}
	</div>
</div>
