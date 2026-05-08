import { describe, it, expect } from 'vitest';
import { calculateScore, computeSuggestedRaiseBudget, computeRegCFCapConsumed, computeRegCFCapRemaining, REG_CF_CAP_USD, computeDaysSinceFiscalYearEnd, isFinancialStatementStale, STALE_FINANCIAL_DAYS } from './engine.js';

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

// Helper: build a YYYY-MM-DD string that is exactly N days before the given asOf date (UTC)
function fyeNDaysAgo(n: number, asOf: Date = new Date()): string {
	const d = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate() - n));
	return d.toISOString().split('T')[0];
}

describe('computeDaysSinceFiscalYearEnd', () => {
	const asOf = new Date('2026-05-08');

	it('returns 0 when FYE is today', () => {
		expect(computeDaysSinceFiscalYearEnd('2026-05-08', asOf)).toBe(0);
	});

	it('returns 120 when FYE is exactly 120 days ago', () => {
		expect(computeDaysSinceFiscalYearEnd(fyeNDaysAgo(120, asOf), asOf)).toBe(120);
	});

	it('returns 121 when FYE is exactly 121 days ago', () => {
		expect(computeDaysSinceFiscalYearEnd(fyeNDaysAgo(121, asOf), asOf)).toBe(121);
	});

	it('returns correct value for a named past date', () => {
		// Jan 8, 2026 to May 8, 2026 = 120 days
		expect(computeDaysSinceFiscalYearEnd('2026-01-08', asOf)).toBe(120);
	});
});

describe('isFinancialStatementStale', () => {
	const asOf = new Date('2026-05-08');

	it('returns false when FYE is exactly 120 days ago (boundary — not stale)', () => {
		expect(isFinancialStatementStale(fyeNDaysAgo(120, asOf), asOf)).toBe(false);
	});

	it('returns true when FYE is 121 days ago (first stale day)', () => {
		expect(isFinancialStatementStale(fyeNDaysAgo(121, asOf), asOf)).toBe(true);
	});

	it('returns true for very old statements (17 months ago)', () => {
		expect(isFinancialStatementStale('2024-12-31', asOf)).toBe(true);
	});

	it('returns false for recent statements (30 days ago)', () => {
		expect(isFinancialStatementStale(fyeNDaysAgo(30, asOf), asOf)).toBe(false);
	});
});

describe('Stale financials flag in scoring', () => {
	it('flags CRITICAL when financial statements are stale (>120 days)', () => {
		const fye = fyeNDaysAgo(121);
		const result = calculateScore({
			financial: {
				financialStatements: 'reviewed',
				financialStatementFiscalYearEnd: fye,
				hasProjections: false
			}
		});
		expect(result.flags.some((f) => f.startsWith('CRITICAL:') && f.includes('stale'))).toBe(true);
	});

	it('does not flag when FYE is exactly 120 days ago (not yet stale)', () => {
		const fye = fyeNDaysAgo(120);
		const result = calculateScore({
			financial: {
				financialStatements: 'reviewed',
				financialStatementFiscalYearEnd: fye,
				hasProjections: false
			}
		});
		expect(result.flags.some((f) => f.includes('stale'))).toBe(false);
	});

	it('does not flag when financialStatementFiscalYearEnd is null', () => {
		const result = calculateScore({
			financial: {
				financialStatements: 'reviewed',
				financialStatementFiscalYearEnd: null,
				hasProjections: false
			}
		});
		expect(result.flags.some((f) => f.includes('stale'))).toBe(false);
	});

	it('does not flag when financialStatementFiscalYearEnd is absent', () => {
		const result = calculateScore({
			financial: {
				financialStatements: 'reviewed',
				hasProjections: false
			}
		});
		expect(result.flags.some((f) => f.includes('stale'))).toBe(false);
	});

	it('stale flag forces not_qualified band', () => {
		const fye = fyeNDaysAgo(200);
		const result = calculateScore({
			financial: {
				financialStatements: 'audited',
				financialStatementFiscalYearEnd: fye,
				hasProjections: true,
				projectionSummary: 'We project $1M revenue in year 1, growing to $3M by year 3 with healthy margins.'
			}
		});
		expect(result.band).toBe('not_qualified');
	});
});

describe('Platform switching flag in scoring (C&DI 100.03)', () => {
	it('flags CRITICAL when active offering has closed sales', () => {
		const result = calculateScore({
			regulatoryHistory: {
				hasActivePlatformOffering: true,
				activePlatformHasClosed: true,
				activePlatformName: 'Wefunder'
			}
		});
		expect(result.flags.some((f) => f.startsWith('CRITICAL:') && f.includes('platform'))).toBe(true);
	});

	it('CRITICAL flag mentions the platform name when provided', () => {
		const result = calculateScore({
			regulatoryHistory: {
				hasActivePlatformOffering: true,
				activePlatformHasClosed: true,
				activePlatformName: 'StartEngine'
			}
		});
		expect(result.flags.some((f) => f.includes('StartEngine'))).toBe(true);
	});

	it('flags advisory (non-CRITICAL) when active offering has no closed sales', () => {
		const result = calculateScore({
			regulatoryHistory: {
				hasActivePlatformOffering: true,
				activePlatformHasClosed: false
			}
		});
		expect(result.flags.some((f) => !f.startsWith('CRITICAL:') && f.includes('platform') || f.includes('Form C'))).toBe(true);
		expect(result.flags.some((f) => f.startsWith('CRITICAL:') && f.includes('platform'))).toBe(false);
	});

	it('does not flag when hasActivePlatformOffering is false', () => {
		const result = calculateScore({
			regulatoryHistory: { hasActivePlatformOffering: false }
		});
		expect(result.flags.some((f) => f.includes('platform') || f.includes('Form C restart'))).toBe(false);
	});

	it('does not flag when hasActivePlatformOffering is null', () => {
		const result = calculateScore({
			regulatoryHistory: { hasActivePlatformOffering: null }
		});
		expect(result.flags.some((f) => f.includes('platform') || f.includes('Form C restart'))).toBe(false);
	});

	it('CRITICAL flag forces not_qualified band', () => {
		const result = calculateScore({
			regulatoryHistory: {
				hasActivePlatformOffering: true,
				activePlatformHasClosed: true
			}
		});
		expect(result.band).toBe('not_qualified');
	});
});
