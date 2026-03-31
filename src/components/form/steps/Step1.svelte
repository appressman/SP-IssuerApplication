<script lang="ts">
	import FormField from '../FormField.svelte';
	import { entityTypes, employeeCountRanges } from '$lib/schemas/company.js';

	const US_STATES = [
		'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
		'District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
		'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota',
		'Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
		'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon',
		'Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah',
		'Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
		'Puerto Rico','US Virgin Islands','Guam','American Samoa','Northern Mariana Islands'
	];

	const INDUSTRIES = [
		'Agriculture','Biotechnology','Cannabis','Clean Energy','Consumer Products',
		'Education','Entertainment','Fashion','Financial Services','Food & Beverage',
		'Healthcare','Manufacturing','Media','Real Estate','Retail',
		'SaaS / Software','Social Impact','Technology','Transportation','Other'
	];

	type Props = {
		data: Record<string, any> | undefined;
		onUpdate: (data: Record<string, any>) => void;
		errors: Record<string, string>;
	};

	let { data, onUpdate, errors = $bindable({}) }: Props = $props();

	let legalName = $state(data?.legalName ?? '');
	let doingBusinessAs = $state(data?.doingBusinessAs ?? '');
	let website = $state(data?.website ?? '');
	let industry = $state(data?.industry ?? '');
	let stateOfIncorporation = $state(data?.stateOfIncorporation ?? '');
	let entityType = $state(data?.entityType ?? '');
	let yearsOperating = $state<number | string>(data?.yearsOperating ?? '');
	let employeeCountRange = $state(data?.employeeCountRange ?? '');
	let revenueStatus = $state(data?.revenueStatus ?? '');

	$effect(() => {
		const stepData: Record<string, any> = {
			legalName, doingBusinessAs: doingBusinessAs || null,
			website: website || null, industry, stateOfIncorporation,
			entityType, yearsOperating: yearsOperating === '' ? null : Number(yearsOperating),
			employeeCountRange: employeeCountRange || null, revenueStatus
		};
		onUpdate(stepData);

		// Validate
		const e: Record<string, string> = {};
		if (!legalName || legalName.length < 2) e.legalName = 'Company legal name is required';
		if (!industry) e.industry = 'Industry is required';
		if (!stateOfIncorporation) e.stateOfIncorporation = 'State of incorporation is required';
		if (!entityType) e.entityType = 'Entity type is required';
		if (!revenueStatus) e.revenueStatus = 'Revenue status is required';
		if (website && !/^https?:\/\/.+\..+/.test(website)) e.website = 'Must be a valid URL (https://...)';
		errors = e;
	});
</script>

<div class="space-y-4">
	<FormField label="Company Legal Name" name="legalName" required error={errors.legalName}>
		<input type="text" id="legalName" bind:value={legalName} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="Acme Corp Inc." />
	</FormField>

	<FormField label="Doing Business As (DBA)" name="dba" helpText="If your company operates under a different name">
		<input type="text" id="dba" bind:value={doingBusinessAs} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" />
	</FormField>

	<FormField label="Company Website" name="website" error={errors.website} helpText="Include https://">
		<input type="url" id="website" bind:value={website} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" placeholder="https://yourcompany.com" />
	</FormField>

	<FormField label="Industry" name="industry" required error={errors.industry}>
		<select id="industry" bind:value={industry} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select industry</option>
			{#each INDUSTRIES as ind}
				<option value={ind}>{ind}</option>
			{/each}
		</select>
	</FormField>

	<FormField label="State of Incorporation" name="state" required error={errors.stateOfIncorporation}>
		<select id="state" bind:value={stateOfIncorporation} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select state</option>
			{#each US_STATES as st}
				<option value={st}>{st}</option>
			{/each}
		</select>
	</FormField>

	<FormField label="Entity Type" name="entityType" required error={errors.entityType}>
		<select id="entityType" bind:value={entityType} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select entity type</option>
			{#each entityTypes as et}
				<option value={et}>{et}</option>
			{/each}
		</select>
	</FormField>

	<FormField label="Years Operating" name="years" helpText="How many years has the company been in operation?">
		<input type="number" id="years" bind:value={yearsOperating} min="0" max="100" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" />
	</FormField>

	<FormField label="Employee Count" name="employees">
		<select id="employees" bind:value={employeeCountRange} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold bg-white">
			<option value="">Select range</option>
			{#each employeeCountRanges as range}
				<option value={range}>{range}</option>
			{/each}
		</select>
	</FormField>

	<FormField label="Revenue Status" name="revenue" required error={errors.revenueStatus}>
		<div class="flex gap-6">
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="revenueStatus" value="pre_revenue" bind:group={revenueStatus} class="accent-sp-gold" />
				<span>Pre-Revenue</span>
			</label>
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="revenueStatus" value="revenue_generating" bind:group={revenueStatus} class="accent-sp-gold" />
				<span>Revenue Generating</span>
			</label>
		</div>
	</FormField>
</div>
