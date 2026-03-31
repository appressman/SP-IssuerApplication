<script lang="ts">
	import { untrack } from 'svelte';
	import FormField from '../FormField.svelte';

	const CATEGORIES = ['Marketing', 'Product Development', 'Working Capital', 'Hiring', 'Legal/Compliance', 'Technology', 'Inventory', 'Operations', 'Other'];

	type ProceedsItem = { category: string; percent: number | string; description: string };

	type Props = {
		data: ProceedsItem[] | undefined;
		onUpdate: (data: ProceedsItem[]) => void;
		errors: Record<string, string>;
	};

	let { data, onUpdate, errors = $bindable({}) }: Props = $props();

	let items = $state<ProceedsItem[]>(
		data && data.length >= 2 ? data : [
			{ category: '', percent: '', description: '' },
			{ category: '', percent: '', description: '' }
		]
	);

	let total = $derived(items.reduce((sum, item) => sum + (Number(item.percent) || 0), 0));

	$effect(() => {
		untrack(() => onUpdate(items.map(i => ({
			...i,
			percent: Number(i.percent) || 0,
			description: i.description || null as any
		}))));

		const e: Record<string, string> = {};
		if (items.length < 2) e.items = 'At least 2 categories required';
		if (total !== 100) e.total = `Percentages must total 100% (currently ${total}%)`;
		const hasDesc = items.some(i => i.description && i.description.length > 0);
		if (!hasDesc) e.description = 'At least one category must include a description';
		items.forEach((item, idx) => {
			if (!item.category) e[`cat_${idx}`] = 'Category required';
			if (!item.percent || Number(item.percent) < 1) e[`pct_${idx}`] = 'Percentage required';
		});
		errors = e;
	});

	function addItem() {
		items = [...items, { category: '', percent: '', description: '' }];
	}

	function removeItem(index: number) {
		if (items.length > 2) {
			items = items.filter((_, i) => i !== index);
		}
	}
</script>

<div class="space-y-4">
	<p class="text-sm text-sp-medium-gray">Describe how you plan to use the funds raised. Add at least 2 categories that total 100%.</p>

	{#each items as item, idx}
		<div class="border border-gray-200 rounded-lg p-4 relative">
			{#if items.length > 2}
				<button type="button" onclick={() => removeItem(idx)} class="absolute top-2 right-2 text-sp-medium-gray hover:text-sp-error text-sm">Remove</button>
			{/if}

			<div class="grid grid-cols-1 md:grid-cols-[1fr_100px] gap-3 mb-3">
				<FormField label="Category" name={`cat_${idx}`} required error={errors[`cat_${idx}`]}>
					<select bind:value={item.category} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
						<option value="">Select</option>
						{#each CATEGORIES as cat}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
				</FormField>

				<FormField label="%" name={`pct_${idx}`} required error={errors[`pct_${idx}`]}>
					<input type="number" bind:value={item.percent} min="1" max="100" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" />
				</FormField>
			</div>

			<FormField label="Description" name={`desc_${idx}`} helpText="Explain what this allocation covers">
				<textarea bind:value={item.description} rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="How will this portion of funds be used?"></textarea>
			</FormField>
		</div>
	{/each}

	<div class="flex items-center justify-between">
		<button type="button" onclick={addItem} class="text-sm text-sp-navy font-medium hover:text-sp-gold transition-colors">
			+ Add Category
		</button>
		<div class="text-sm font-semibold {total === 100 ? 'text-sp-success' : 'text-sp-error'}">
			Total: {total}%
		</div>
	</div>

	{#if errors.total}
		<p class="text-sm text-sp-error" role="alert">{errors.total}</p>
	{/if}
	{#if errors.description}
		<p class="text-sm text-sp-error" role="alert">{errors.description}</p>
	{/if}
</div>
