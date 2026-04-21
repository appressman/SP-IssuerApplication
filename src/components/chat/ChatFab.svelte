<script lang="ts">
	type Props = {
		onClick: () => void;
		hidden?: boolean;
	};

	let { onClick, hidden = false }: Props = $props();
</script>

{#if !hidden}
	<button
		type="button"
		onclick={onClick}
		aria-label="Ask the advisor"
		title="Ask the advisor"
		class="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-sp-navy text-sp-gold shadow-lg hover:shadow-xl hover:bg-sp-navy-light focus:outline-none focus:ring-2 focus:ring-sp-gold focus:ring-offset-2 transition-shadow flex items-center justify-center"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			class="w-7 h-7"
			aria-hidden="true"
		>
			<path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2Z" />
		</svg>
	</button>
{/if}
