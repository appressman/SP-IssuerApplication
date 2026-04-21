import { describe, it, expect } from 'vitest';
import { calculateScore, computeSuggestedRaiseBudget } from './engine.js';

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
