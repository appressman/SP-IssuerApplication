<script module lang="ts">
	let chatPanelInstanceCounter = 0;
</script>

<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { ChatTurn } from '$lib/integrations/anthropic.js';

	type Props = {
		applicationId: string;
		stepNumber: number;
		open: boolean;
		onClose: () => void;
	};

	let { applicationId, stepNumber, open, onClose }: Props = $props();

	const MAX_HISTORY_TURNS = 10;
	const AT_BOTTOM_THRESHOLD_PX = 40;
	const headingId = `chat-panel-heading-${++chatPanelInstanceCounter}`;

	let messages = $state<ChatTurn[]>([]);
	let input = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	let drawerEl = $state<HTMLDivElement | null>(null);
	let closeBtnEl = $state<HTMLButtonElement | null>(null);
	let threadEl = $state<HTMLDivElement | null>(null);
	let previousFocus: HTMLElement | null = null;

	$effect(() => {
		stepNumber;
		untrack(() => {
			messages = [];
			input = '';
			error = null;
			loading = false;
		});
	});

	$effect(() => {
		if (open) {
			previousFocus = document.activeElement as HTMLElement | null;
			document.body.style.overflow = 'hidden';
			tick().then(() => {
				closeBtnEl?.focus();
			});
			return () => {
				document.body.style.overflow = '';
				tick().then(() => previousFocus?.focus());
			};
		}
	});

	$effect(() => {
		messages;
		loading;
		tick().then(() => {
			if (!threadEl) return;
			const distanceFromBottom =
				threadEl.scrollHeight - threadEl.scrollTop - threadEl.clientHeight;
			if (distanceFromBottom < AT_BOTTOM_THRESHOLD_PX + threadEl.clientHeight) {
				threadEl.scrollTop = threadEl.scrollHeight;
			}
		});
	});

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
			return;
		}
		if (e.key === 'Tab' && drawerEl) {
			const focusable = drawerEl.querySelectorAll<HTMLElement>(
				'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
			);
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const active = document.activeElement as HTMLElement | null;
			const activeInsideDrawer = active ? drawerEl.contains(active) : false;
			if (!activeInsideDrawer) {
				e.preventDefault();
				first.focus();
			} else if (e.shiftKey && active === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && active === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	async function sendMessage() {
		const trimmed = input.trim();
		if (!trimmed || loading) return;

		const snapshotStep = stepNumber;
		const userTurn: ChatTurn = { role: 'user', content: trimmed };
		const history: ChatTurn[] = messages.slice(-MAX_HISTORY_TURNS);

		messages = [...messages, userTurn];
		input = '';
		error = null;
		loading = true;

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					applicationId,
					stepNumber: snapshotStep,
					message: trimmed,
					history
				})
			});

			// Discard silently if stepNumber changed while we were waiting
			if (snapshotStep !== stepNumber) {
				return;
			}

			if (!res.ok) {
				let errMsg = 'Chat request failed. Please try again.';
				try {
					const body = (await res.json()) as { error?: string };
					if (body?.error) errMsg = body.error;
				} catch {
					// ignore body parse errors
				}
				error = errMsg;
				return;
			}

			const data = (await res.json()) as { text?: string };
			const text = typeof data?.text === 'string' ? data.text : '';
			if (text.length > 0) {
				messages = [...messages, { role: 'assistant', content: text }];
			} else {
				error = 'Received an empty response. Please try again.';
			}
		} catch (err) {
			console.error('[chat] network error', err);
			if (snapshotStep === stepNumber) {
				error = 'Network error. Please check your connection and try again.';
			}
		} finally {
			if (snapshotStep === stepNumber) {
				loading = false;
			}
		}
	}

	function handleInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			void sendMessage();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<button
		type="button"
		aria-hidden="true"
		tabindex="-1"
		class="fixed inset-0 bg-black/40 z-40 lg:hidden"
		onclick={onClose}
	></button>

	<div
		bind:this={drawerEl}
		role="dialog"
		aria-modal="true"
		aria-labelledby={headingId}
		class="fixed top-0 right-0 bottom-0 z-50 w-full lg:w-[420px] bg-white shadow-2xl flex flex-col border-l border-gray-200"
	>
		<header class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-sp-navy text-white">
			<h2 id={headingId} class="text-base font-semibold">Step {stepNumber} Advisor</h2>
			<button
				bind:this={closeBtnEl}
				type="button"
				onclick={onClose}
				aria-label="Close advisor panel"
				class="w-8 h-8 rounded hover:bg-sp-navy-light focus:outline-none focus:ring-2 focus:ring-sp-gold flex items-center justify-center"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M6 18L18 6" />
				</svg>
			</button>
		</header>

		<div
			bind:this={threadEl}
			aria-label="Conversation with advisor"
			class="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-sp-light-gray"
		>
			{#if messages.length === 0 && !loading}
				<p aria-hidden="true" class="text-sm text-sp-dark-text opacity-70">
					Ask the advisor a question about this step.
				</p>
			{/if}

			{#each messages as msg, i (i)}
				{#if msg.role === 'user'}
					<div class="flex justify-end">
						<div class="max-w-[85%] rounded-lg px-3 py-2 bg-sp-navy text-white text-sm whitespace-pre-wrap break-words">
							{msg.content}
						</div>
					</div>
				{:else}
					<div aria-live="polite" class="flex justify-start">
						<div class="max-w-[85%] rounded-lg px-3 py-2 bg-white border border-gray-200 text-sp-dark-text text-sm whitespace-pre-wrap break-words">
							{msg.content}
						</div>
					</div>
				{/if}
			{/each}

			{#if loading}
				<div role="status" aria-live="polite" class="flex justify-start">
					<div class="rounded-lg px-3 py-2 bg-white border border-gray-200 text-sp-dark-text text-sm flex items-center gap-2">
						<span class="inline-block w-3 h-3 border-2 border-sp-navy border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
						<span>Thinking…</span>
					</div>
				</div>
			{/if}
		</div>

		<div class="border-t border-gray-200 px-4 py-3 bg-white">
			{#if error}
				<div role="alert" class="mb-2 rounded border border-red-300 bg-red-50 text-red-800 text-xs px-3 py-2">
					{error}
				</div>
			{/if}

			<div class="flex items-end gap-2">
				<textarea
					bind:value={input}
					onkeydown={handleInputKeydown}
					disabled={loading}
					rows="1"
					aria-label="Message to advisor"
					placeholder="Ask a question…"
					class="flex-1 resize-none max-h-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold disabled:opacity-50"
				></textarea>
				<button
					type="button"
					onclick={sendMessage}
					disabled={loading || input.trim().length === 0}
					aria-label="Send message"
					class="px-4 py-2 rounded-lg bg-sp-navy text-white text-sm font-medium hover:bg-sp-navy-light focus:outline-none focus:ring-2 focus:ring-sp-gold focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Send
				</button>
			</div>
			<p class="mt-1 text-[11px] text-sp-dark-text opacity-60">
				Enter to send, Shift+Enter for newline.
			</p>
		</div>
	</div>
{/if}
