<script lang="ts">
	import { untrack } from 'svelte';
	import FormField from '../FormField.svelte';

	type RegCFClosing = { closingDate: string; amountRaisedUsd: string | number; platformName: string };

	type Props = {
		data: Record<string, any> | undefined;
		onUpdate: (data: Record<string, any>) => void;
		errors: Record<string, string>;
	};

	let { data, onUpdate, errors = $bindable({}) }: Props = $props();

	let previousRaise = $state<boolean | null>(data?.previousRaise ?? null);
	let previousRaiseDetails = $state(data?.previousRaiseDetails ?? '');
	let previousRegCFRaises = $state<RegCFClosing[]>(
		Array.isArray(data?.previousRegCFRaises) && data.previousRegCFRaises.length > 0
			? data.previousRegCFRaises.map((r: any) => ({
					closingDate: r.closingDate ?? '',
					amountRaisedUsd: r.amountRaisedUsd ?? '',
					platformName: r.platformName ?? ''
				}))
			: []
	);
	let regulatoryOrders = $state<boolean | null>(data?.regulatoryOrders ?? null);
	let regulatoryOrdersDetails = $state(data?.regulatoryOrdersDetails ?? '');
	let badActorIndicators = $state<boolean | null>(data?.badActorIndicators ?? null);
	let badActorDetails = $state(data?.badActorDetails ?? '');
	let isFormerExchangeActReporter = $state<boolean | null>(data?.isFormerExchangeActReporter ?? null);
	let exchangeActReportingTerminated = $state<boolean | null>(data?.exchangeActReportingTerminated ?? null);
	let exchangeActTerminationDate = $state(data?.exchangeActTerminationDate ?? '');
	let hasActivePlatformOffering = $state<boolean | null>(data?.hasActivePlatformOffering ?? null);
	let activePlatformHasClosed = $state<boolean | null>(data?.activePlatformHasClosed ?? null);
	let activePlatformName = $state(data?.activePlatformName ?? '');

	const today = new Date().toISOString().split('T')[0];

	$effect(() => {
		const normalizedRaises =
			previousRaise && previousRegCFRaises.length > 0
				? previousRegCFRaises
						.filter((r) => r.closingDate && r.amountRaisedUsd)
						.map((r) => ({
							closingDate: r.closingDate,
							amountRaisedUsd: Number(r.amountRaisedUsd) || 0,
							platformName: r.platformName || null
						}))
				: null;

		untrack(() =>
			onUpdate({
				previousRaise,
				previousRaiseDetails: previousRaise ? previousRaiseDetails : null,
				previousRegCFRaises: normalizedRaises,
				regulatoryOrders,
				regulatoryOrdersDetails: regulatoryOrders ? regulatoryOrdersDetails : null,
				badActorIndicators,
				badActorDetails: badActorIndicators ? badActorDetails : null,
				isFormerExchangeActReporter,
				exchangeActReportingTerminated: isFormerExchangeActReporter ? exchangeActReportingTerminated : null,
				exchangeActTerminationDate: (isFormerExchangeActReporter && exchangeActReportingTerminated) ? (exchangeActTerminationDate || null) : null,
				hasActivePlatformOffering,
				activePlatformHasClosed: hasActivePlatformOffering ? activePlatformHasClosed : null,
				activePlatformName: hasActivePlatformOffering ? (activePlatformName || null) : null
			})
		);

		const e: Record<string, string> = {};
		if (previousRaise === null) e.previousRaise = 'Please answer this question';
		if (previousRaise && (!previousRaiseDetails || previousRaiseDetails.length < 20))
			e.previousRaiseDetails = 'Please describe your previous raises (at least 20 characters)';
		if (isFormerExchangeActReporter === null) e.isFormerExchangeActReporter = 'Please answer this question';
		if (isFormerExchangeActReporter === true && exchangeActReportingTerminated === null)
			e.exchangeActReportingTerminated = 'Please indicate whether the reporting obligation has been terminated';
		if (exchangeActTerminationDate && exchangeActTerminationDate >= today)
			e.exchangeActTerminationDate = 'Termination date must be in the past';

		if (hasActivePlatformOffering === null) e.hasActivePlatformOffering = 'Please answer this question';
		if (hasActivePlatformOffering === true && activePlatformHasClosed === null)
			e.activePlatformHasClosed = 'Please indicate whether any investments have closed';

		if (regulatoryOrders === null) e.regulatoryOrders = 'Please answer this question';
		if (regulatoryOrders && (!regulatoryOrdersDetails || regulatoryOrdersDetails.length < 20))
			e.regulatoryOrdersDetails = 'Please describe the regulatory orders (at least 20 characters)';
		if (badActorIndicators === null) e.badActorIndicators = 'Please answer this question';
		if (badActorIndicators && (!badActorDetails || badActorDetails.length < 20))
			e.badActorDetails = 'Please describe the events (at least 20 characters)';

		// Validate each Reg CF closing entry
		previousRegCFRaises.forEach((r, idx) => {
			if (r.closingDate && r.closingDate > today) {
				e[`cfDate_${idx}`] = 'Closing date cannot be in the future';
			}
			if (r.amountRaisedUsd !== '' && (isNaN(Number(r.amountRaisedUsd)) || Number(r.amountRaisedUsd) <= 0)) {
				e[`cfAmount_${idx}`] = 'Enter a positive dollar amount';
			}
		});

		errors = e;
	});

	function addCFClosing() {
		previousRegCFRaises = [...previousRegCFRaises, { closingDate: '', amountRaisedUsd: '', platformName: '' }];
	}

	function removeCFClosing(index: number) {
		previousRegCFRaises = previousRegCFRaises.filter((_, i) => i !== index);
	}
</script>

<div class="space-y-6">
	<FormField label="Has your company previously raised capital from investors?" name="previousRaise" required error={errors.previousRaise}>
		<div class="flex gap-6">
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="previousRaise" value="true" checked={previousRaise === true} onchange={() => previousRaise = true} class="accent-sp-gold" />
				<span>Yes</span>
			</label>
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="previousRaise" value="false" checked={previousRaise === false} onchange={() => previousRaise = false} class="accent-sp-gold" />
				<span>No</span>
			</label>
		</div>
	</FormField>

	{#if previousRaise}
		<FormField label="Please describe your previous capital raises" name="previousRaiseDetails" required error={errors.previousRaiseDetails} helpText="Include type of raise, amount, and year">
			<textarea id="previousRaiseDetails" bind:value={previousRaiseDetails} rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold"></textarea>
		</FormField>

		<!-- Reg CF Closings — structured data for rolling cap verification -->
		<div class="border border-gray-200 rounded-lg p-4 space-y-3">
			<div>
				<p class="text-sm font-medium text-sp-navy">Regulation Crowdfunding (Reg CF) Closings</p>
				<p class="text-xs text-sp-medium-gray mt-1">
					If any previous raises used the Reg CF exemption, list each closing below. SyndicatePath uses this to verify available capacity under the SEC's $5M annual limit before onboarding.
				</p>
			</div>

			{#each previousRegCFRaises as closing, idx}
				<div class="border border-gray-100 rounded-lg p-3 bg-gray-50 relative">
					<button type="button" onclick={() => removeCFClosing(idx)} class="absolute top-2 right-2 text-sp-medium-gray hover:text-sp-error text-xs">
						Remove
					</button>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
						<FormField label="Closing Date" name={`cfDate_${idx}`} required error={errors[`cfDate_${idx}`]}>
							<input
								type="date"
								bind:value={closing.closingDate}
								max={today}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold"
							/>
						</FormField>

						<FormField label="Amount Raised ($)" name={`cfAmount_${idx}`} required error={errors[`cfAmount_${idx}`]}>
							<input
								type="number"
								bind:value={closing.amountRaisedUsd}
								min="1"
								step="1"
								placeholder="e.g. 500000"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold"
							/>
						</FormField>

						<FormField label="Platform Name" name={`cfPlatform_${idx}`} helpText="e.g. Wefunder, StartEngine">
							<input
								type="text"
								bind:value={closing.platformName}
								placeholder="Platform name"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold"
							/>
						</FormField>
					</div>
				</div>
			{/each}

			<button type="button" onclick={addCFClosing} class="text-sm text-sp-navy font-medium hover:text-sp-gold transition-colors">
				+ Add Reg CF Closing
			</button>
		</div>
	{/if}

	<FormField label="Is or was your company required to file reports under the Exchange Act (Section 12 or Section 15(d))?" name="isFormerExchangeActReporter" required error={errors.isFormerExchangeActReporter} helpText="This applies to companies that were listed on a national securities exchange or had more than $10M in assets and a large number of shareholders">
		<div class="flex gap-6">
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="isFormerExchangeActReporter" value="true" checked={isFormerExchangeActReporter === true} onchange={() => { isFormerExchangeActReporter = true; exchangeActReportingTerminated = null; exchangeActTerminationDate = ''; }} class="accent-sp-gold" />
				<span>Yes</span>
			</label>
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="isFormerExchangeActReporter" value="false" checked={isFormerExchangeActReporter === false} onchange={() => { isFormerExchangeActReporter = false; exchangeActReportingTerminated = null; exchangeActTerminationDate = ''; }} class="accent-sp-gold" />
				<span>No</span>
			</label>
		</div>
	</FormField>

	{#if isFormerExchangeActReporter}
		<FormField label="Has the SEC formally accepted termination of that reporting obligation?" name="exchangeActReportingTerminated" required error={errors.exchangeActReportingTerminated} helpText="Termination occurs when the SEC accepts your Form 15 filing — not when you file it">
			<div class="flex gap-6">
				<label class="flex items-center gap-2 cursor-pointer">
					<input type="radio" name="exchangeActReportingTerminated" value="true" checked={exchangeActReportingTerminated === true} onchange={() => exchangeActReportingTerminated = true} class="accent-sp-gold" />
					<span>Yes — termination accepted by SEC</span>
				</label>
				<label class="flex items-center gap-2 cursor-pointer">
					<input type="radio" name="exchangeActReportingTerminated" value="false" checked={exchangeActReportingTerminated === false} onchange={() => exchangeActReportingTerminated = false} class="accent-sp-gold" />
					<span>No — still reporting or termination pending</span>
				</label>
			</div>
		</FormField>

		{#if exchangeActReportingTerminated === false}
			<div class="bg-red-50 border border-red-200 rounded-lg p-3">
				<p class="text-red-800 text-sm font-medium">Reg CF Disqualification Active</p>
				<p class="text-red-700 text-sm mt-1">Under SEC C&DI 100.04, companies that are or were Exchange Act reporting companies are disqualified from Reg CF until the SEC formally accepts termination of the reporting obligation. Filing Form 15 alone is not sufficient — SEC acceptance is required. Please consult your securities counsel about your eligibility timeline.</p>
			</div>
		{:else if exchangeActReportingTerminated === true}
			<FormField label="Date SEC accepted termination" name="exchangeActTerminationDate" helpText="The date your Form 15 termination was accepted (YYYY-MM-DD)" error={errors.exchangeActTerminationDate}>
				<input
					type="date"
					bind:value={exchangeActTerminationDate}
					max={today}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold"
				/>
			</FormField>
		{/if}
	{/if}

	<FormField label="Does your company currently have an active Reg CF offering on another funding portal?" name="hasActivePlatformOffering" required error={errors.hasActivePlatformOffering} helpText="e.g., Wefunder, StartEngine, Republic, or any other FINRA-registered portal">
		<div class="flex gap-6">
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="hasActivePlatformOffering" value="true" checked={hasActivePlatformOffering === true} onchange={() => { hasActivePlatformOffering = true; activePlatformHasClosed = null; }} class="accent-sp-gold" />
				<span>Yes</span>
			</label>
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="hasActivePlatformOffering" value="false" checked={hasActivePlatformOffering === false} onchange={() => { hasActivePlatformOffering = false; activePlatformHasClosed = null; }} class="accent-sp-gold" />
				<span>No</span>
			</label>
		</div>
	</FormField>

	{#if hasActivePlatformOffering}
		<FormField label="Have any investments closed on that offering?" name="activePlatformHasClosed" required error={errors.activePlatformHasClosed} helpText="An investment 'closes' when funds are accepted and the offering deadline has passed for that tranche">
			<div class="flex gap-6">
				<label class="flex items-center gap-2 cursor-pointer">
					<input type="radio" name="activePlatformHasClosed" value="true" checked={activePlatformHasClosed === true} onchange={() => activePlatformHasClosed = true} class="accent-sp-gold" />
					<span>Yes — sales have closed</span>
				</label>
				<label class="flex items-center gap-2 cursor-pointer">
					<input type="radio" name="activePlatformHasClosed" value="false" checked={activePlatformHasClosed === false} onchange={() => activePlatformHasClosed = false} class="accent-sp-gold" />
					<span>No — still open, no closings yet</span>
				</label>
			</div>
		</FormField>

		{#if activePlatformHasClosed === true}
			<div class="bg-red-50 border border-red-200 rounded-lg p-3">
				<p class="text-red-800 text-sm font-medium">Platform Switch Blocked</p>
				<p class="text-red-700 text-sm mt-1">Under SEC C&DI 100.03, a funding portal switch is only permitted before any sales close. Because your current offering has closed sales, you must complete or formally terminate that raise before onboarding to Miventure. Please consult your securities counsel.</p>
			</div>
		{:else if activePlatformHasClosed === false}
			<div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
				<p class="text-amber-800 text-sm font-medium">Form C Restart Required</p>
				<p class="text-amber-700 text-sm mt-1">Because no sales have closed yet, a platform switch to Miventure is permitted. However, you will need to formally withdraw the current Form C filing and file a new Form C on Miventure before the offering can go live. SyndicatePath will coordinate this with your securities counsel.</p>
			</div>
		{/if}

		<FormField label="Current portal name" name="activePlatformName" helpText="e.g., Wefunder, StartEngine, Republic">
			<input type="text" bind:value={activePlatformName} placeholder="Portal name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold" />
		</FormField>
	{/if}

	<FormField label="Has your company or any officer/director been subject to any regulatory orders or actions?" name="regulatoryOrders" required error={errors.regulatoryOrders}>
		<div class="flex gap-6">
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="regulatoryOrders" value="true" checked={regulatoryOrders === true} onchange={() => regulatoryOrders = true} class="accent-sp-gold" />
				<span>Yes</span>
			</label>
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="regulatoryOrders" value="false" checked={regulatoryOrders === false} onchange={() => regulatoryOrders = false} class="accent-sp-gold" />
				<span>No</span>
			</label>
		</div>
	</FormField>

	{#if regulatoryOrders}
		<FormField label="Please describe the regulatory orders or actions" name="regulatoryOrdersDetails" required error={errors.regulatoryOrdersDetails}>
			<textarea id="regulatoryOrdersDetails" bind:value={regulatoryOrdersDetails} rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold"></textarea>
		</FormField>
	{/if}

	<FormField label="Are there any bad actor disqualification events that may apply to your company, its officers, directors, or significant shareholders?" name="badActorIndicators" required error={errors.badActorIndicators}>
		<div class="flex gap-6">
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="badActorIndicators" value="true" checked={badActorIndicators === true} onchange={() => badActorIndicators = true} class="accent-sp-gold" />
				<span>Yes</span>
			</label>
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="radio" name="badActorIndicators" value="false" checked={badActorIndicators === false} onchange={() => badActorIndicators = false} class="accent-sp-gold" />
				<span>No</span>
			</label>
		</div>
	</FormField>

	{#if badActorIndicators}
		<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
			<p class="text-red-800 text-sm font-medium">Important Notice</p>
			<p class="text-red-700 text-sm">Bad actor disqualification events may prevent participation in certain securities exemptions. This will be reviewed by our compliance team.</p>
		</div>
		<FormField label="Please describe the events" name="badActorDetails" required error={errors.badActorDetails}>
			<textarea id="badActorDetails" bind:value={badActorDetails} rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sp-gold focus:border-sp-gold"></textarea>
		</FormField>
	{/if}

	<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
		<p class="font-medium mb-1">What is a "bad actor" disqualification?</p>
		<p>Under SEC rules, certain individuals involved in securities law violations, court injunctions, disciplinary orders, or criminal convictions may be disqualified from participating in certain securities exemptions (such as Reg D or Reg CF). This is a preliminary screening question only.</p>
	</div>
</div>
