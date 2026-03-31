<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		label: string;
		name: string;
		required?: boolean;
		helpText?: string;
		error?: string;
		children: Snippet;
	};

	let { label, name, required = false, helpText, error, children }: Props = $props();

	let helpId = $derived(`${name}-help`);
	let errorId = $derived(`${name}-error`);
</script>

<div class="mb-4">
	<label for={name} class="block text-sm font-medium text-sp-dark-text mb-1">
		{label}
		{#if required}<span class="text-sp-error">*</span>{/if}
	</label>

	<div
		aria-describedby="{helpText ? helpId : ''} {error ? errorId : ''}"
	>
		{@render children()}
	</div>

	{#if helpText}
		<p id={helpId} class="mt-1 text-xs text-sp-medium-gray">{helpText}</p>
	{/if}

	{#if error}
		<p id={errorId} class="mt-1 text-sm text-sp-error" role="alert">{error}</p>
	{/if}
</div>
