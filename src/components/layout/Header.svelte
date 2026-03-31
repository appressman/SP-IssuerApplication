<script lang="ts">
	type Props = {
		user: { id: string; email: string; name: string } | null;
	};

	let { user }: Props = $props();
</script>

<header class="bg-sp-navy text-sp-white shadow-md">
	<div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
		<a href="/" class="flex items-center gap-2">
			<div class="w-1 h-8 bg-sp-gold rounded-full"></div>
			<span class="text-xl font-bold tracking-tight">SyndicatePath</span>
		</a>

		{#if user}
			<div class="flex items-center gap-4 text-sm">
				<span class="hidden sm:inline text-sp-medium-gray">{user.email}</span>
				<form method="POST" action="/auth/logout">
					<button
						type="submit"
						class="text-sp-gold hover:text-sp-gold-light transition-colors"
					>
						Log out
					</button>
				</form>
			</div>
		{/if}
	</div>
</header>
