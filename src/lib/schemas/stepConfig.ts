export interface StepConfig {
	stepNumber: number;
	title: string;
	description: string;
	estimatedMinutes: number;
}

export const steps: StepConfig[] = [
	{ stepNumber: 1, title: 'Company Information', description: 'Tell us about your company', estimatedMinutes: 2 },
	{ stepNumber: 2, title: 'Regulatory History', description: 'Previous raises and regulatory background', estimatedMinutes: 2 },
	{ stepNumber: 3, title: 'Offering Structure', description: 'Details about your planned offering', estimatedMinutes: 3 },
	{ stepNumber: 4, title: 'Use of Proceeds', description: 'How you plan to use the funds raised', estimatedMinutes: 3 },
	{ stepNumber: 5, title: 'Financial Condition', description: 'Current financial status and projections', estimatedMinutes: 4 },
	{ stepNumber: 6, title: 'Team & Qualifications', description: 'Your leadership team and their experience', estimatedMinutes: 3 },
	{ stepNumber: 7, title: 'Market & Validation', description: 'Market opportunity and evidence of validation', estimatedMinutes: 3 },
	{ stepNumber: 8, title: 'Investor Returns', description: 'What investors will receive', estimatedMinutes: 3 },
	{ stepNumber: 9, title: 'Documentation Status', description: 'Business plan and pitch deck readiness', estimatedMinutes: 2 },
	{ stepNumber: 10, title: 'Professional Team', description: 'Attorney, CPA, and marketing support', estimatedMinutes: 2 },
	{ stepNumber: 11, title: 'Capacity & Resources', description: 'Your team\'s capacity to run a campaign', estimatedMinutes: 2 },
	{ stepNumber: 12, title: 'Timeline & Awareness', description: 'When you expect to launch', estimatedMinutes: 1 },
	{ stepNumber: 13, title: 'Review & Submit', description: 'Review your answers and submit', estimatedMinutes: 3 }
];

export const TOTAL_FORM_STEPS = 12;
export const TOTAL_STEPS = 13;

export function getStepConfig(stepNumber: number): StepConfig | undefined {
	return steps.find((s) => s.stepNumber === stepNumber);
}
