import { describe, it, expect } from 'vitest';
import { calculateScore, computeSuggestedRaiseBudget, computeRegCFCapConsumed, computeRegCFCapRemaining, REG_CF_CAP_USD } from './engine.js';

describe('computeRegCFCapConsumed', () => {
	const asOf = new Date('2026-05-08');

	it('returns 0 for empty array', () => {
		expect(computeRegCFCapConsumed([], asOf)).toBe(0);
	});

	it('sums closings within the rolling 12-month window', () => {
		const raises = [
			{ closingDate: '2025-06-01', amountRaisedUsd: 1_000_000 },
			{ closingDate: '2026-01-15', amountRaisedUsd: 500_000 }
		];
		expect(computeRegCFCapConsumed(raises, asOf)).toBe(1_500_000);
	});

	it('excludes closings older than 12 months from asOf', () => {
		const raises = [
			{ closingDate: '2025-05-07', amountRaisedUsd: 2_000_000 }, // exactly 12 months + 1 day before asOf
			{ closingDate: '2025-06-01', amountRaisedUsd: 500_000 }    // within window
		];
		expect(computeRegCFCapConsumed(raises, asOf)).toBe(500_000);
	});

	it('includes a closing on the day exactly 12 months ago (boundary)', () => {
		// May 8 2025 is exactly 12 months before May 8 2026
		// Rule: > twelveMonthsAgo, so the exact boundary date is excluded
		const raises = [{ closingDate: '2025-05-08', amountRaisedUsd: 1_000_000 }];
		expect(computeRegCFCapConsumed(raises, asOf)).toBe(0);
	});

	it('handles multiple closings correctly summing only those in window', () => {
		const raises = [
			{ closingDate: '2024-01-01', amountRaisedUsd: 2_000_000 }, // outside window
			{ closingDate: '2025-07-01', amountRaisedUsd: 1_000_000 }, // inside
			{ closingDate: '2026-02-01', amountRaisedUsd: 1_500_000 }  // inside
		];
		expect(computeRegCFCapConsumed(raises, asOf)).toBe(2_500_000);
	});
});

describe('computeRegCFCapRemaining', () => {
	const asOf = new Date('2026-05-08');

	it('returns full $5M cap when no prior closings', () => {
		expect(computeRegCFCapRemaining([], asOf)).toBe(REG_CF_CAP_USD);
	});

	it('returns correct remaining after partial consumption', () => {
		const raises = [{ closingDate: '2026-01-01', amountRaisedUsd: 2_000_000 }];
		expect(computeRegCFCapRemaining(raises, asOf)).toBe(3_000_000);
	});

	it('returns 0 when cap is exactly consumed', () => {
		const raises = [{ closingDate: '2026-01-01', amountRaisedUsd: 5_000_000 }];
		expect(computeRegCFCapRemaining(raises, asOf)).toBe(0);
	});

	it('floors at 0 when raises exceed cap', () => {
		const raises = [{ closingDate: '2026-01-01', amountRaisedUsd: 6_000_000 }];
		expect(computeRegCFCapRemaining(raises, asOf)).toBe(0);
	});
});

describe('Reg CF cap flag in scoring', () => {
	it('flags CRITICAL when cap is fully consumed', () => {
		const result = calculateScore({
			regulatoryHistory: {
				previousRegCFRaises: [
					{ closingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], amountRaisedUsd: 5_000_000 }
				]
			},
			offering: { maxRaiseAmount: 500_000 }
		});
		expect(result.flags.some((f) => f.startsWith('CRITICAL:') && f.includes('cap'))).toBe(true);
	});

	it('flags CRITICAL when remaining capacity is less than proposed raise', () => {
		const result = calculateScore({
			regulatoryHistory: {
				previousRegCFRaises: [
					{ closingDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], amountRaisedUsd: 4_000_000 }
				]
			},
			offering: { maxRaiseAmount: 1_500_000 } // wants $1.5M but only $1M left
		});
		expect(result.flags.some((f) => f.startsWith('CRITICAL:') && f.includes('headroom'))).toBe(true);
	});

	it('does not flag when sufficient capacity is available', () => {
		const result = calculateScore({
			regulatoryHistory: {
				previousRegCFRaises: [
					{ closingDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], amountRaisedUsd: 1_000_000 }
				]
			},
			offering: { maxRaiseAmount: 500_000 } // $500K proposed, $4M available
		});
		expect(result.flags.some((f) => f.startsWith('CRITICAL:') && f.includes('cap'))).toBe(false);
		expect(result.flags.some((f) => f.startsWith('CRITICAL:') && f.includes('headroom'))).toBe(false);
	});

	it('does not flag when previousRegCFRaises is null', () => {
		const result = calculateScore({
			regulatoryHistory: { previousRegCFRaises: null },
			offering: { maxRaiseAmount: 1_000_000 }
		});
		expect(result.flags.some((f) => f.includes('cap'))).toBe(false);
	});

	it('does not flag when previousRegCFRaises is empty', () => {
		const result = calculateScore({
			regulatoryHistory: { previousRegCFRaises: [] },
			offering: { maxRaiseAmount: 1_000_000 }
		});
		expect(result.flags.some((f) => f.includes('cap'))).toBe(false);
	});
});

describe('computeSuggestedRaiseBudget', () => {
	it('returns 50,000 for raises at or below $1M', () => {
		expect(computeSuggestedRaiseBudget(500_000)).toBe(50_000);
		expect(computeSuggestedRaiseBudget(1_000_000)).toBe(50_000);
	});

	it('adds $10,000 per additional $1M above $1M', () => {
		expect(computeSuggestedRaiseBudget(2_000_000)).toBe(60_000);
		expect(computeSuggestedRaiseBudget(3_500_000)).toBe(70_000);
		expect(computeSuggestedRaiseBudget(5_000_000)).toBe(90_000);
	});

	it('floors partial million increments', () => {
		expect(computeSuggestedRaiseBudget(1_999_999)).toBe(50_000);
		expect(computeSuggestedRaiseBudget(2_000_000)).toBe(60_000);
	});

	it('clamps to a $50,000 minimum for zero or negative targets', () => {
		expect(computeSuggestedRaiseBudget(0)).toBe(50_000);
		expect(computeSuggestedRaiseBudget(-100)).toBe(50_000);
	});
});

describe('Funding budget scoring flags', () => {
	it('flags when capacity step is touched but raiseBudgetUsd is null', () => {
		const result = calculateScore({
			capacity: {
				leadershipTimeCapacity: 'high',
				teamExecutionCapacity: 'moderate',
				canSupportCampaignFor90Days: true,
				onlinePresence: 'established',
				raiseBudgetUsd: null
			}
		});
		expect(result.flags).toContain('Funding budget not provided');
	});

	it('does not flag missing budget when capacity has no other values', () => {
		const result = calculateScore({
			capacity: {
				leadershipTimeCapacity: null,
				teamExecutionCapacity: null,
				canSupportCampaignFor90Days: null,
				onlinePresence: '',
				raiseBudgetUsd: null
			}
		});
		expect(result.flags).not.toContain('Funding budget not provided');
	});

	it('flags when budget is below the suggested rule-of-thumb for the target raise', () => {
		const result = calculateScore({
			offering: { raiseTargetUsd: 3_000_000 },
			capacity: {
				leadershipTimeCapacity: 'high',
				teamExecutionCapacity: 'high',
				canSupportCampaignFor90Days: true,
				onlinePresence: 'established',
				raiseBudgetUsd: 40_000
			}
		});
		expect(result.flags).toContain('Funding budget appears low for target raise');
	});

	it('does not flag a sufficient budget', () => {
		const result = calculateScore({
			offering: { raiseTargetUsd: 2_000_000 },
			capacity: {
				leadershipTimeCapacity: 'high',
				teamExecutionCapacity: 'high',
				canSupportCampaignFor90Days: true,
				onlinePresence: 'established',
				raiseBudgetUsd: 60_000
			}
		});
		expect(result.flags).not.toContain('Funding budget appears low for target raise');
		expect(result.flags).not.toContain('Funding budget not provided');
	});

	it('does not flag low budget when offering.raiseTargetUsd is missing', () => {
		const result = calculateScore({
			capacity: {
				leadershipTimeCapacity: 'high',
				teamExecutionCapacity: 'high',
				canSupportCampaignFor90Days: true,
				onlinePresence: 'established',
				raiseBudgetUsd: 10_000
			}
		});
		expect(result.flags).not.toContain('Funding budget appears low for target raise');
	});
});
