<script lang="ts">
	type Props = {
		status: 'idle' | 'saving' | 'saved' | 'error';
		onRetry?: () => void;
	};

	let { status, onRetry }: Props = $props();
</script>

{#if status !== 'idle'}
	<div class="text-xs flex items-center gap-1">
		{#if status === 'saving'}
			<span class="text-sp-medium-gray">Saving...</span>
		{:else if status === 'saved'}
			<span class="text-sp-success">All changes saved</span>
		{:else if status === 'error'}
			<span class="text-sp-error">Save failed</span>
			{#if onRetry}
				<button onclick={onRetry} class="text-sp-error underline hover:no-underline">retry</button>
			{/if}
		{/if}
	</div>
{/if}
