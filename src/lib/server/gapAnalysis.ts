/**
 * Gap Analysis document generator.
 * Maps IssuerApplication form data + scoring result to a .docx Gap Analysis report
 * matching the SP Gap_Analysis_TEMPLATE.docx structure.
 */

import { computeRegCFCapConsumed, REG_CF_CAP_USD, computeDaysSinceFiscalYearEnd, STALE_FINANCIAL_DAYS } from '$lib/scoring/engine.js';
import {
	AlignmentType,
	Document,
	HeadingLevel,
	Packer,
	Paragraph,
	ShadingType,
	Table,
	TableCell,
	TableRow,
	TextRun,
	VerticalAlign,
	WidthType,
	convertInchesToTwip
} from 'docx';

import type { ScoringResult } from '$lib/schemas/index.js';

// ── palette ─────────────────────────────────────────────────────────────────
const C = {
	navy: '1F3964',
	teal: '1F7A8C',
	red: 'C00000',
	orange: 'C56511',
	blue: '0070C0',
	green: '378621',
	gray: '595959',
	lightGray: 'F2F2F2',
	white: 'FFFFFF'
} as const;

// ── severity ─────────────────────────────────────────────────────────────────
type Severity = 'Critical' | 'Important' | 'Nice to Have' | 'N/A';

const SEV_COLOR: Record<Severity, string> = {
	Critical: C.red,
	Important: C.orange,
	'Nice to Have': C.blue,
	'N/A': C.gray
};

// ── gap row data ─────────────────────────────────────────────────────────────
interface GapRow {
	num: string;
	item: string;
	status: string;
	severity: Severity;
	owner: string;
	deadline: string;
	notes: string;
}

// ── form data shape (matches scoring engine + app schemas) ──────────────────
interface FormData {
	company?: Record<string, any>;
	regulatoryHistory?: Record<string, any>;
	offering?: Record<string, any>;
	useOfProceeds?: Record<string, any>;
	financial?: Record<string, any>;
	team?: Record<string, any>;
	market?: Record<string, any>;
	investorReturns?: Record<string, any>;
	documentation?: Record<string, any>;
	professionals?: Record<string, any>;
	capacity?: Record<string, any>;
	timeline?: Record<string, any>;
	contact?: Record<string, any>;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function run(text: string, opts: { bold?: boolean; color?: string; size?: number; italic?: boolean } = {}): TextRun {
	return new TextRun({
		text,
		bold: opts.bold,
		color: opts.color,
		size: opts.size ?? 18, // half-points; 18 = 9pt
		italics: opts.italic
	});
}

function para(children: TextRun[], opts: { alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacing?: number } = {}): Paragraph {
	return new Paragraph({
		children,
		alignment: opts.alignment,
		spacing: opts.spacing !== undefined ? { after: opts.spacing } : { after: 100 }
	});
}

function heading(text: string, level: 1 | 2, color = C.navy): Paragraph {
	return new Paragraph({
		children: [new TextRun({ text, bold: true, color, size: level === 1 ? 28 : 22 })],
		heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
		spacing: { before: 200, after: 80 }
	});
}

function hdrCell(text: string): TableCell {
	return new TableCell({
		children: [new Paragraph({ children: [run(text, { bold: true, color: C.white, size: 16 })], spacing: { after: 0 } })],
		shading: { type: ShadingType.SOLID, color: C.navy, fill: C.navy },
		verticalAlign: VerticalAlign.CENTER,
		margins: { top: 60, bottom: 60, left: 80, right: 80 }
	});
}

function dataCell(text: string, opts: { color?: string; bold?: boolean } = {}): TableCell {
	return new TableCell({
		children: [new Paragraph({
			children: [run(text, { color: opts.color, bold: opts.bold, size: 16 })],
			spacing: { after: 0 }
		})],
		verticalAlign: VerticalAlign.CENTER,
		margins: { top: 60, bottom: 60, left: 80, right: 80 }
	});
}

const GAP_COL_WIDTHS = [400, 2200, 1400, 1200, 1300, 1000, 1700]; // twips, sum ~9200

function gapTable(rows: GapRow[]): Table {
	const headers = ['#', 'Item', 'Status', 'Severity', 'Owner', 'Deadline', 'Notes'];
	const headerRow = new TableRow({
		children: headers.map(hdrCell),
		tableHeader: true
	});

	const dataRows = rows.map((r) => {
		const statusColor = r.status.includes('CRITICAL GAP')
			? C.red
			: r.status.includes('IMPORTANT GAP')
				? C.orange
				: r.status.includes('PRESENT') || r.status === 'OK'
					? C.green
					: C.gray;

		return new TableRow({
			children: [
				dataCell(r.num),
				dataCell(r.item),
				dataCell(r.status, { color: statusColor, bold: r.status.includes('GAP') }),
				dataCell(r.severity, { color: SEV_COLOR[r.severity], bold: r.severity === 'Critical' || r.severity === 'Important' }),
				dataCell(r.owner),
				dataCell(r.deadline),
				dataCell(r.notes)
			]
		});
	});

	return new Table({
		rows: [headerRow, ...dataRows],
		width: { size: 9200, type: WidthType.DXA },
		columnWidths: GAP_COL_WIDTHS
	});
}

// ── severity classifier ──────────────────────────────────────────────────────
function classifyFlag(flag: string): Severity {
	if (flag.startsWith('CRITICAL:')) return 'Critical';
	const criticalKeywords = ['Bad actor', 'No securities attorney', 'No financial statements'];
	if (criticalKeywords.some((k) => flag.includes(k))) return 'Critical';
	return 'Important';
}

// ── section builders ─────────────────────────────────────────────────────────
function buildLegalRows(fd: FormData, flags: string[]): GapRow[] {
	const rows: GapRow[] = [];
	let n = 1;

	const reg = fd.regulatoryHistory ?? {};
	const pros = fd.professionals ?? {};

	// Bad actor history
	if (reg.hasBadActorHistory === false) {
		rows.push({ num: String(n++), item: 'Bad Actor Disclosure', status: 'PRESENT', severity: 'N/A', owner: '—', deadline: '—', notes: 'No bad actor history reported' });
	} else if (reg.hasBadActorHistory === true) {
		rows.push({ num: String(n++), item: 'Bad Actor Disclosure', status: 'CRITICAL GAP', severity: 'Critical', owner: 'Issuer + Counsel', deadline: 'Immediate', notes: 'CRITICAL: Bad actor disqualification may apply — securities counsel required immediately' });
	}

	// Prior regulatory issues
	if (reg.hasPriorRegulatoryIssues === true) {
		rows.push({ num: String(n++), item: 'Prior Regulatory Issues', status: 'IMPORTANT GAP', severity: 'Important', owner: 'Issuer + Counsel', deadline: 'TBD', notes: 'Prior regulatory issues reported — disclosure required on Form C' });
	}

	// Prior securities offering
	rows.push({
		num: String(n++),
		item: 'Prior Securities Offering History',
		status: reg.hasPriorSecuritiesOffering === true ? 'PRESENT' : 'N/A',
		severity: 'N/A',
		owner: '—',
		deadline: '—',
		notes: reg.hasPriorSecuritiesOffering === true ? 'Prior offering experience reported' : 'First-time issuer'
	});

	// Attorney
	const attyStatus: Record<string, { status: string; severity: Severity; notes: string }> = {
		engaged:    { status: 'PRESENT', severity: 'N/A', notes: 'Securities attorney engaged' },
		identified: { status: 'IMPORTANT GAP', severity: 'Important', notes: 'Attorney identified but not yet formally engaged. Formalize engagement before Form C filing.' },
		none:       { status: 'CRITICAL GAP', severity: 'Critical', notes: 'No securities attorney. Required for any offering — must be engaged before Form C filing. See Appendix A.3' }
	};
	const atty = attyStatus[pros.attorney ?? 'none'] ?? attyStatus['none'];
	rows.push({ num: String(n++), item: 'Securities Attorney', status: atty.status, severity: atty.severity, owner: 'Issuer', deadline: atty.severity === 'Critical' ? 'Immediate' : 'TBD', notes: atty.notes });

	// CPA
	const cpaStatus: Record<string, { status: string; severity: Severity; notes: string }> = {
		engaged:    { status: 'PRESENT', severity: 'N/A', notes: 'CPA / accountant engaged' },
		identified: { status: 'IMPORTANT GAP', severity: 'Important', notes: 'CPA identified but not yet engaged. Formalize for financial statement preparation.' },
		none:       { status: 'IMPORTANT GAP', severity: 'Important', notes: 'No CPA engaged. Required for financial statement review for raises over $124K. See Appendix A.5' }
	};
	const cpa = cpaStatus[pros.cpa ?? 'none'] ?? cpaStatus['none'];
	rows.push({ num: String(n++), item: 'CPA / Independent Accountant', status: cpa.status, severity: cpa.severity, owner: 'Issuer', deadline: 'TBD', notes: cpa.notes });

	// Exchange Act reporting company check (C&DI 100.04 — disqualification lifts only on SEC-accepted termination)
	if (reg.isFormerExchangeActReporter === true) {
		if (reg.exchangeActReportingTerminated !== true) {
			rows.push({
				num: String(n++), item: 'Exchange Act Reporting Status (C&DI 100.04)',
				status: 'CRITICAL GAP', severity: 'Critical',
				owner: 'Issuer + Counsel', deadline: 'Immediate',
				notes: 'Company is or was an Exchange Act reporting company and the reporting obligation has not been formally terminated. Per C&DI 100.04, Reg CF disqualification lifts only when the SEC accepts the Form 15 termination — not upon filing. Consult securities counsel before proceeding.'
			});
		} else {
			const dateNote = reg.exchangeActTerminationDate ? ` (termination date: ${reg.exchangeActTerminationDate})` : '';
			rows.push({
				num: String(n++), item: 'Exchange Act Reporting Status (C&DI 100.04)',
				status: 'PRESENT', severity: 'N/A',
				owner: 'SP Compliance', deadline: 'Before Onboarding',
				notes: `Exchange Act reporting obligation terminated${dateNote}. Verify SEC-accepted Form 15 as part of onboarding due diligence per C&DI 100.04.`
			});
		}
	}

	// Active platform offering check (C&DI 100.03 — switching only permitted before any sales close)
	if (reg.hasActivePlatformOffering === true) {
		const platform = reg.activePlatformName ? ` (${reg.activePlatformName})` : '';
		if (reg.activePlatformHasClosed === true) {
			rows.push({
				num: String(n++), item: `Active Reg CF Offering on Another Portal${platform}`,
				status: 'CRITICAL GAP', severity: 'Critical',
				owner: 'Issuer + Counsel', deadline: 'Immediate',
				notes: `Issuer has an active Reg CF offering${platform} with closed sales. Per C&DI 100.03, platform switching is blocked once any sales close. Issuer must complete or terminate the existing raise before onboarding to Miventure. Consult securities counsel.`
			});
		} else {
			rows.push({
				num: String(n++), item: `Active Reg CF Offering on Another Portal${platform}`,
				status: 'IMPORTANT GAP', severity: 'Important',
				owner: 'Issuer + Counsel', deadline: 'Before Onboarding',
				notes: `Issuer has an active Reg CF offering${platform} with no closed sales. Per C&DI 100.03, a platform switch is still permitted at this stage, but requires formal Form C withdrawal from the current portal and a full Form C restart on Miventure. Coordinate with securities counsel before proceeding.`
			});
		}
	}

	// Reg CF rolling cap check (C&DI 100.05)
	const regCFRaises = reg.previousRegCFRaises;
	if (Array.isArray(regCFRaises) && regCFRaises.length > 0) {
		const consumed = computeRegCFCapConsumed(regCFRaises);
		const remaining = Math.max(0, REG_CF_CAP_USD - consumed);
		const proposedRaise = Number((fd.offering as any)?.maxRaiseAmount ?? (fd.offering as any)?.targetRaiseAmount ?? 0);
		if (remaining === 0) {
			rows.push({
				num: String(n++), item: 'Reg CF Annual Offering Capacity',
				status: 'CRITICAL GAP', severity: 'Critical',
				owner: 'Issuer + Counsel', deadline: 'Immediate',
				notes: `Rolling 12-month cap fully consumed ($${consumed.toLocaleString()} of $5M used). No Reg CF raises permitted until prior closings roll off. Consult securities counsel on timing.`
			});
		} else if (proposedRaise > 0 && remaining < proposedRaise) {
			rows.push({
				num: String(n++), item: 'Reg CF Annual Offering Capacity',
				status: 'CRITICAL GAP', severity: 'Critical',
				owner: 'Issuer + Counsel', deadline: 'Immediate',
				notes: `Prior Reg CF closings consumed $${consumed.toLocaleString()} of $5M cap. Only $${remaining.toLocaleString()} available — insufficient for proposed raise of $${proposedRaise.toLocaleString()}. Reduce target or wait for prior closings to roll off.`
			});
		} else {
			rows.push({
				num: String(n++), item: 'Reg CF Annual Offering Capacity',
				status: 'OK', severity: 'N/A',
				owner: '—', deadline: '—',
				notes: `Prior Reg CF closings: $${consumed.toLocaleString()} consumed. $${remaining.toLocaleString()} available under rolling 12-month $5M cap.`
			});
		}
	}

	// Investor annual income definition — informational disclosure (C&DI 100.06)
	// No issuer input required; this governs investor-facing questionnaire on the Miventure portal
	rows.push({
		num: String(n++),
		item: 'Investor Annual Income Definition (C&DI 100.06)',
		status: 'Platform Managed',
		severity: 'N/A',
		owner: 'Miventure Platform',
		deadline: '—',
		notes: "Per SEC C&DI 100.06, 'annual income' for Reg CF investor investment limits equals the investor's most recently completed calendar year (Jan 1 - Dec 31), not a trailing 12-month window. The Miventure investor questionnaire reflects this definition. No issuer action required."
	});

	// Surface any remaining regulatory flags not already captured
	const regFlags = flags.filter(f => f.includes('regulatory') || f.includes('attorney') || f.includes('Bad actor') || f.includes('Regulatory'));
	for (const f of regFlags) {
		rows.push({ num: String(n++), item: 'Regulatory Flag', status: 'FLAG', severity: classifyFlag(f), owner: 'Issuer + Counsel', deadline: 'TBD', notes: f });
	}

	return rows;
}

function buildFinancialRows(fd: FormData, flags: string[]): GapRow[] {
	const rows: GapRow[] = [];
	let n = 1;
	const fin = fd.financial ?? {};

	// Financial statements
	const stmtMap: Record<string, { status: string; severity: Severity; notes: string }> = {
		audited:  { status: 'PRESENT', severity: 'N/A', notes: 'Audited financial statements available' },
		reviewed: { status: 'PRESENT', severity: 'N/A', notes: 'CPA-reviewed financial statements available. Meets Reg CF $124K-$618K requirement.' },
		compiled: { status: 'IMPORTANT GAP', severity: 'Important', notes: 'Compiled statements only. CPA review required for raises over $124K. See Appendix A.5' },
		none:     { status: 'CRITICAL GAP', severity: 'Critical', notes: 'No financial statements prepared. Required before Form C filing. Engage CPA immediately — allow 3-6 weeks. See Appendix A.5' }
	};
	const stmt = stmtMap[fin.financialStatements ?? 'none'] ?? stmtMap['none'];
	rows.push({ num: String(n++), item: 'Financial Statements (balance sheet, P&L, cash flow)', status: stmt.status, severity: stmt.severity, owner: 'Issuer + CPA', deadline: stmt.severity === 'Critical' ? 'Immediate' : 'TBD', notes: stmt.notes });

	// Projections
	if (fin.hasProjections === true) {
		rows.push({ num: String(n++), item: 'Financial Projections', status: 'PRESENT', severity: 'N/A', owner: '—', deadline: '—', notes: fin.projectionSummary ? `Summary provided: ${String(fin.projectionSummary).slice(0, 80)}…` : 'Projections noted' });
	} else {
		rows.push({ num: String(n++), item: 'Financial Projections', status: 'IMPORTANT GAP', severity: 'Important', owner: 'Issuer', deadline: 'TBD', notes: 'No financial projections provided. Required for Form C disclosures and investor confidence.' });
	}

	// Financial statement freshness (C&DI 201.03 — >120 days past fiscal year-end requires Form C update)
	const fye = fin.financialStatementFiscalYearEnd;
	if (typeof fye === 'string' && fye.length > 0) {
		const days = computeDaysSinceFiscalYearEnd(fye);
		const staleDeadline = new Date(fye);
		staleDeadline.setDate(staleDeadline.getDate() + STALE_FINANCIAL_DAYS + 1);
		const deadlineStr = staleDeadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
		if (days > STALE_FINANCIAL_DAYS) {
			rows.push({
				num: String(n++), item: 'Financial Statement Freshness (C&DI 201.03)',
				status: 'CRITICAL GAP', severity: 'Critical',
				owner: 'Issuer + CPA', deadline: 'Before Form C Filing',
				notes: `Statements dated ${fye} are ${days} days old — exceeded the ${STALE_FINANCIAL_DAYS}-day Form C freshness limit on ${deadlineStr}. Updated financials required before filing per SEC C&DI 201.03.`
			});
		} else {
			const daysRemaining = STALE_FINANCIAL_DAYS - days;
			rows.push({
				num: String(n++), item: 'Financial Statement Freshness (C&DI 201.03)',
				status: 'PRESENT', severity: 'N/A',
				owner: '—', deadline: '—',
				notes: `Statements dated ${fye} are ${days} days old. ${daysRemaining} days remaining before ${STALE_FINANCIAL_DAYS}-day Form C freshness limit (${deadlineStr}).`
			});
		}
	}

	// Surface financial flags
	const finFlags = flags.filter(f => f.includes('financial') || f.includes('statements') || f.includes('projections'));
	for (const f of finFlags) {
		rows.push({ num: String(n++), item: 'Financial Flag', status: 'FLAG', severity: classifyFlag(f), owner: 'Issuer', deadline: 'TBD', notes: f });
	}

	return rows;
}

function buildOperationalRows(fd: FormData, flags: string[]): GapRow[] {
	const rows: GapRow[] = [];
	let n = 1;
	const docs = fd.documentation ?? {};
	const team = fd.team ?? {};
	const cap = fd.capacity ?? {};

	// Business plan
	const bpMap: Record<string, { status: string; severity: Severity; notes: string }> = {
		complete: { status: 'PRESENT', severity: 'N/A', notes: 'Complete business plan available' },
		draft:    { status: 'IMPORTANT GAP', severity: 'Important', notes: 'Business plan in draft — finalize before Form C filing. See Appendix A.7' },
		none:     { status: 'IMPORTANT GAP', severity: 'Important', notes: 'No business plan. Required for Form C disclosures and investor outreach. See Appendix A.7' }
	};
	const bp = bpMap[docs.businessPlan ?? 'none'] ?? bpMap['none'];
	rows.push({ num: String(n++), item: 'Business Plan / Use of Proceeds', status: bp.status, severity: bp.severity, owner: 'Issuer', deadline: 'TBD', notes: bp.notes });

	// Pitch deck
	const pdMap: Record<string, { status: string; severity: Severity; notes: string }> = {
		complete: { status: 'PRESENT', severity: 'N/A', notes: 'Complete pitch deck available' },
		draft:    { status: 'IMPORTANT GAP', severity: 'Important', notes: 'Pitch deck in draft — finalize before campaign launch' },
		none:     { status: 'IMPORTANT GAP', severity: 'Important', notes: 'No pitch deck. Strongly recommended for investor outreach' }
	};
	const pd = pdMap[docs.pitchDeck ?? 'none'] ?? pdMap['none'];
	rows.push({ num: String(n++), item: 'Pitch Deck / Investor Presentation', status: pd.status, severity: pd.severity, owner: 'Issuer', deadline: 'TBD', notes: pd.notes });

	// Team qualifications
	if (team.qualifications && String(team.qualifications).length > 20) {
		rows.push({ num: String(n++), item: 'Team Qualifications', status: 'PRESENT', severity: 'N/A', owner: '—', deadline: '—', notes: `Summary: ${String(team.qualifications).slice(0, 80)}…` });
	} else {
		rows.push({ num: String(n++), item: 'Team Qualifications / Bios', status: 'IMPORTANT GAP', severity: 'Important', owner: 'Issuer', deadline: 'TBD', notes: 'Team qualifications not described. Form C requires disclosure of all directors, officers, and 20%+ owners.' });
	}

	// 90-day campaign capacity
	if (cap.canSupportCampaignFor90Days === false) {
		rows.push({ num: String(n++), item: '90-Day Campaign Capacity', status: 'IMPORTANT GAP', severity: 'Important', owner: 'Issuer', deadline: 'TBD', notes: 'Team indicates insufficient capacity for 90-day campaign activity. Crowdfunding requires sustained outreach.' });
	} else if (cap.canSupportCampaignFor90Days === true) {
		rows.push({ num: String(n++), item: '90-Day Campaign Capacity', status: 'PRESENT', severity: 'N/A', owner: '—', deadline: '—', notes: 'Team confirms capacity to support 90-day campaign' });
	}

	// Raise budget
	if (cap.raiseBudgetUsd) {
		rows.push({ num: String(n++), item: 'Raise Campaign Budget', status: 'PRESENT', severity: 'N/A', owner: '—', deadline: '—', notes: `Budget noted: $${Number(cap.raiseBudgetUsd).toLocaleString()}` });
	}

	// Operational flags
	const opsFlags = flags.filter(f =>
		f.includes('budget') || f.includes('capacity') || f.includes('campaign') ||
		f.includes('plan') || f.includes('90-day')
	);
	for (const f of opsFlags) {
		rows.push({ num: String(n++), item: 'Operational Flag', status: 'FLAG', severity: classifyFlag(f), owner: 'Issuer', deadline: 'TBD', notes: f });
	}

	return rows;
}

function buildMarketingRows(fd: FormData, flags: string[]): GapRow[] {
	const rows: GapRow[] = [];
	let n = 1;
	const cap = fd.capacity ?? {};
	const co = fd.company ?? {};

	// Website
	if (co.website) {
		rows.push({ num: String(n++), item: 'Company Website', status: 'PRESENT', severity: 'N/A', owner: '—', deadline: '—', notes: co.website });
	} else {
		rows.push({ num: String(n++), item: 'Company Website', status: 'IMPORTANT GAP', severity: 'Important', owner: 'Issuer', deadline: 'TBD', notes: 'No website provided. A professional web presence is expected by investors.' });
	}

	// Online presence
	const opMap: Record<string, { status: string; severity: Severity; notes: string }> = {
		strong:      { status: 'PRESENT', severity: 'N/A', notes: 'Strong online presence reported' },
		established: { status: 'PRESENT', severity: 'N/A', notes: 'Established online presence reported' },
		basic:       { status: 'IMPORTANT GAP', severity: 'Important', notes: 'Basic online presence only. Crowdfunding success correlates strongly with digital reach. Invest in social and content before launch.' },
		weak:        { status: 'IMPORTANT GAP', severity: 'Important', notes: 'Weak online presence. This is a significant risk factor for crowdfunding campaigns. Priority: build audience before launch.' }
	};
	const op = opMap[cap.onlinePresence ?? 'basic'] ?? opMap['basic'];
	rows.push({ num: String(n++), item: 'Online Presence / Digital Reach', status: op.status, severity: op.severity, owner: 'Issuer', deadline: 'TBD', notes: op.notes });

	// Campaign materials
	rows.push({ num: String(n++), item: 'Campaign Page Copy', status: 'NICE TO HAVE GAP', severity: 'Nice to Have', owner: 'SP Campaign Manager', deadline: 'TBD', notes: 'Campaign copy developed during onboarding with SP campaign team' });
	rows.push({ num: String(n++), item: 'Founder Pitch Video', status: 'NICE TO HAVE GAP', severity: 'Nice to Have', owner: 'Issuer', deadline: 'TBD', notes: 'Strongly recommended for Reg CF — not blocking but significantly increases conversion rates' });

	// Marketing flags
	const mktFlags = flags.filter(f => f.includes('online') || f.includes('presence') || f.includes('digital') || f.includes('reach'));
	for (const f of mktFlags) {
		rows.push({ num: String(n++), item: 'Marketing Flag', status: 'FLAG', severity: classifyFlag(f), owner: 'Issuer', deadline: 'TBD', notes: f });
	}

	return rows;
}

// ── exemption section ─────────────────────────────────────────────────────────
function buildExemptionParagraphs(fd: FormData): Paragraph[] {
	const offering = fd.offering ?? {};
	const fin = fd.financial ?? {};

	const exemption = offering.exemptionTarget ?? 'Not specified';
	const maxRaise = offering.maxRaiseAmount ?? offering.targetRaiseAmount ?? null;
	const stmtTier = fin.financialStatements ?? 'none';

	let finReq = 'Consult securities counsel for applicable financial statement requirements.';
	if (exemption.toLowerCase().includes('cf') || exemption === 'reg_cf') {
		if (maxRaise && Number(maxRaise) <= 124000) finReq = 'CEO-certified financials (no CPA required for raises up to $124,000).';
		else if (!maxRaise || Number(maxRaise) <= 618000) finReq = 'CPA-REVIEWED financial statements required (raises $124,001-$618,000). Full audit NOT required.';
		else finReq = 'CPA-AUDITED financial statements required (raises over $618,000).';
	}

	const raiseStr = maxRaise ? `$${Number(maxRaise).toLocaleString()}` : '(not specified)';

	const lines: [string, string][] = [
		['Selected Exemption', exemption.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())],
		['Target Raise Amount', raiseStr],
		['Financial Statement Requirement', finReq],
		['Current Statement Status', stmtTier.charAt(0).toUpperCase() + stmtTier.slice(1)]
	];

	return lines.map(([label, value]) =>
		para([
			run(`${label}: `, { bold: true, color: C.navy, size: 18 }),
			run(value, { size: 18 })
		])
	);
}

// ── action items ──────────────────────────────────────────────────────────────
function buildActionTable(allRows: GapRow[]): Table {
	const actionItems = allRows.filter(r => r.severity === 'Critical' || r.severity === 'Important');

	const headers = ['#', 'Gap Item', 'Severity', 'Owner', 'Deadline'];
	const colWidths = [400, 3800, 1200, 1800, 2000];

	const headerRow = new TableRow({
		children: headers.map(hdrCell),
		tableHeader: true
	});

	const dataRows = actionItems.map((r, i) =>
		new TableRow({
			children: [
				dataCell(String(i + 1)),
				dataCell(r.item),
				dataCell(r.severity, { color: SEV_COLOR[r.severity], bold: true }),
				dataCell(r.owner),
				dataCell(r.deadline)
			]
		})
	);

	return new Table({
		rows: [headerRow, ...dataRows],
		width: { size: 9200, type: WidthType.DXA },
		columnWidths: colWidths
	});
}

// ── appendix A ────────────────────────────────────────────────────────────────
const APPENDIX_ITEMS = [
	{
		id: 'A.1', title: 'Operating Agreement',
		what: 'The governing document of the LLC, defining ownership, management authority, member rights, capital contributions, and dissolution procedures.',
		required: [
			'Full legal entity name matches the state filing exactly',
			'Manager-managed or member-managed designation clearly stated',
			'Capital contribution table showing each member\'s contribution and ownership percentage',
			'Voting rights and decision thresholds defined',
			'Transfer restriction provisions',
			'Signature block executed by all required parties with date of execution'
		],
		defects: [
			'Signature line present but blank — document is not legally executed',
			'Template boilerplate not replaced (e.g., "[STATE]", "[MEMBER NAME]" still present)',
			'Multiple versions submitted — only the most recent signed version should be provided'
		]
	},
	{
		id: 'A.2', title: 'Cap Table (Equity Ledger)',
		what: 'A structured record of all equity ownership showing who owns what, when it was issued, at what price, and on what terms.',
		required: [
			'Date of each unit/share issuance',
			'Unit/share class designation (e.g., Class A, Class B, common, preferred)',
			'Number of units/shares issued per transaction with consideration paid',
			'Owner name and percentage ownership after each issuance',
			'Any outstanding options, warrants, or convertible instruments listed separately',
			'Total authorized vs. issued units shown'
		],
		defects: [
			'Narrative paragraph format instead of tabular ledger',
			'No issuance dates — undated equity records create ambiguity for Form C disclosure',
			'SAFE or convertible notes referenced but no instrument document provided'
		]
	},
	{
		id: 'A.3', title: 'Investor Subscription / Terms Agreement',
		what: 'The contract between the issuer and investors defining the security being offered, investment terms, representations, and the subscription mechanics.',
		required: [
			'Issuer legal entity name matches the Form C issuer (the operating company)',
			'Security type clearly defined (revenue participation, SAFE, equity units, convertible note, etc.)',
			'Investment terms: return structure, payout priority, timeline',
			'Investor representations and warranties',
			'Signature blocks for both issuer and investor',
			'Governing law and jurisdiction clause'
		],
		defects: [
			'Agreement names a holding entity or affiliate instead of the actual issuer',
			'Terms reference a raise amount that differs from the Form C target',
			'No investor representations section',
			'Unsigned template with placeholder text'
		]
	},
	{
		id: 'A.4', title: 'SAFE / Convertible Instrument',
		what: 'A Simple Agreement for Future Equity (SAFE) or convertible note granting the right to receive equity upon a triggering event.',
		required: [
			'Issuer entity name and investor name with investment amount',
			'Valuation cap and/or discount rate clearly stated',
			'Triggering event definitions (equity financing, liquidity event, dissolution)',
			'Conversion mechanics clearly described',
			'Signatures of both parties with dates'
		],
		defects: [
			'SAFE referenced in cap table or other documents but no SAFE agreement document provided',
			'Valuation cap and discount rate stated in narrative but no executed instrument',
			'YC SAFE template used but key fields left blank (investment amount, valuation cap)'
		]
	},
	{
		id: 'A.5', title: 'CPA-Reviewed Financial Statements',
		what: 'Financial statements prepared in accordance with GAAP or OCBOA and reviewed (not audited) by an independent public accountant. Required for Reg CF raises of $124,001-$618,000.',
		required: [
			'Balance sheet as of fiscal year-end',
			'Income statement for the most recent fiscal year',
			'Statement of cash flows for the most recent fiscal year',
			'Notes to financial statements (accounting policies, related-party transactions)',
			'CPA review report on the letterhead of the CPA firm with signature and date',
			'CPA must be independent — cannot be a related party to the issuer'
		],
		defects: [
			'Tax returns (Schedule C, Form 1120) submitted instead of CPA-reviewed statements — these do not satisfy the Reg CF requirement',
			'Internally-prepared financials without CPA review engagement',
			'Only one statement provided (e.g., income statement only) — all three required'
		]
	},
	{
		id: 'A.6', title: 'Background Check Authorization',
		what: 'A signed consent form allowing SyndicatePath to conduct background and credit checks on each principal of the issuer.',
		required: [
			'Full legal name, date of birth, SSN, and current address of each principal',
			'FCRA-compliant disclosure and authorization language',
			'Signature of each principal with date signed',
			'Separate form per principal (do not combine multiple principals on one form)'
		],
		defects: [
			'Form not provided for all principals — required for every director, officer, and 20%+ owner',
			'Unsigned form submitted',
			'Missing date of birth or SSN — form cannot be processed without these fields'
		]
	},
	{
		id: 'A.7', title: 'Business Plan / Use of Proceeds',
		what: 'A narrative document describing what the business does, how it makes money, and exactly how the capital raised will be deployed.',
		required: [
			'Executive summary (company overview, mission, market opportunity)',
			'Product or service description with pricing',
			'Revenue model and key assumptions',
			'Use of proceeds table: line-item breakdown with dollar amounts and percentages totaling 100%',
			'Financial projections with key assumptions stated',
			'Management team summary'
		],
		defects: [
			'Financial projections provided without a narrative business plan',
			'Use of proceeds is vague (e.g., "working capital" with no further breakdown)',
			'Use of proceeds does not add to 100% of the raise target',
			'No competitive landscape or differentiation section'
		]
	}
] as const;

function buildAppendix(): Paragraph[] {
	const children: Paragraph[] = [
		heading('Appendix A: Document Standards Reference', 1),
		para([run(
			'This appendix describes what a complete and correct version of each key submission document looks like, ' +
			'and lists the most common defects found in issuer submissions. ' +
			'Gap table Notes cells reference these entries as "See Appendix A.N".',
			{ size: 18 }
		)])
	];

	for (const item of APPENDIX_ITEMS) {
		children.push(heading(`${item.id}  ${item.title}`, 2, C.teal));
		children.push(para([
			run('What it is: ', { bold: true, color: C.navy, size: 18 }),
			run(item.what, { size: 18 })
		]));
		children.push(para([run('Required elements:', { bold: true, color: C.navy, size: 18 })]));
		for (const req of item.required) {
			children.push(new Paragraph({
				children: [run(`• ${req}`, { size: 16 })],
				indent: { left: convertInchesToTwip(0.25) },
				spacing: { after: 40 }
			}));
		}
		children.push(para([run('Common defects in submissions:', { bold: true, color: C.red, size: 18 })]));
		for (const def of item.defects) {
			children.push(new Paragraph({
				children: [run(`• ${def}`, { size: 16, color: C.gray })],
				indent: { left: convertInchesToTwip(0.25) },
				spacing: { after: 40 }
			}));
		}
	}

	return children;
}

// ── main export ───────────────────────────────────────────────────────────────
export async function generateGapAnalysis(formData: FormData, scoring: ScoringResult): Promise<Buffer> {
	const company = formData.company ?? {};
	const offering = formData.offering ?? {};
	const flags = scoring.flags ?? [];

	const companyName = (company.legalName as string | undefined) ?? 'Issuer';
	const dba = (company.dba as string | undefined) ?? '';
	const displayName = dba ? `${companyName} (DBA: ${dba})` : companyName;
	const raiseTarget = offering.maxRaiseAmount ?? offering.targetRaiseAmount;
	const raiseStr = raiseTarget ? `$${Number(raiseTarget).toLocaleString()}` : '(not specified)';
	const exemption = ((offering.exemptionTarget as string | undefined) ?? 'Not specified')
		.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

	const bandLabel = scoring.band === 'qualified' ? 'Qualified'
		: scoring.band === 'qualified_with_reservations' ? 'Qualified with Reservations'
		: 'Not Currently Qualified';
	const overallStatus = scoring.band === 'qualified'
		? 'READY — Proceed to Onboarding'
		: scoring.band === 'qualified_with_reservations'
			? 'CONDITIONAL — Gaps Must Be Addressed'
			: 'NOT READY — Critical Gaps Outstanding';

	// Build section rows
	const legalRows = buildLegalRows(formData, flags);
	const finRows = buildFinancialRows(formData, flags);
	const opsRows = buildOperationalRows(formData, flags);
	const mktRows = buildMarketingRows(formData, flags);
	const allRows = [...legalRows, ...finRows, ...opsRows, ...mktRows];

	const docChildren: (Paragraph | Table)[] = [
		// ── title ──
		new Paragraph({
			children: [new TextRun({ text: 'ISSUER READINESS GAP ANALYSIS', bold: true, color: C.navy, size: 36 })],
			alignment: AlignmentType.CENTER,
			spacing: { after: 60 }
		}),
		new Paragraph({
			children: [new TextRun({ text: 'SyndicatePath — Onboarding Program  |  Confidential', color: C.teal, size: 18 })],
			alignment: AlignmentType.CENTER,
			spacing: { after: 200 }
		}),

		// ── meta ──
		para([run('Company: ', { bold: true, color: C.navy }), run(displayName)]),
		para([run('Date Prepared: ', { bold: true, color: C.navy }), run(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))]),
		para([run('Exemption: ', { bold: true, color: C.navy }), run(exemption)]),
		para([run('Target Raise: ', { bold: true, color: C.navy }), run(raiseStr)]),
		para([run('Readiness Score: ', { bold: true, color: C.navy }), run(`${scoring.totalScore} / 100  —  ${bandLabel}`, { color: scoring.band === 'qualified' ? C.green : scoring.band === 'qualified_with_reservations' ? C.orange : C.red, bold: true })]),
		para([run('Overall Status: ', { bold: true, color: C.navy }), run(overallStatus, { bold: true, color: scoring.band === 'qualified' ? C.green : scoring.band === 'qualified_with_reservations' ? C.orange : C.red })]),

		// ── executive summary ──
		heading('Executive Summary', 1),
		para([run(
			`${companyName} is a${company.yearsOperating !== undefined && Number(company.yearsOperating) < 1 ? ' newly formed' : ''} ` +
			`${(company.entityType as string | undefined) ?? 'company'} ` +
			`${company.state ? `registered in ${company.state} ` : ''}` +
			`pursuing a ${raiseStr} ${exemption} raise. ` +
			`Based on the readiness assessment, the issuer has received a preliminary score of ${scoring.totalScore}/100 (${bandLabel}). ` +
			(flags.length > 0
				? `The assessment identified ${flags.filter(f => f.startsWith('CRITICAL:')).length} critical and ${flags.filter(f => !f.startsWith('CRITICAL:')).length} advisory item(s) requiring attention. `
				: 'No flags were raised. ') +
			`This report details gaps by dimension and provides document standards references in Appendix A.`,
			{ size: 18 }
		)]),

		// ── section 1: legal ──
		heading('1. Legal / Regulatory Readiness', 2, C.teal),
		gapTable(legalRows),

		// ── section 2: financial ──
		heading('2. Financial Readiness', 2, C.teal),
		gapTable(finRows),

		// ── section 3: operational ──
		heading('3. Operational / Business Readiness', 2, C.teal),
		gapTable(opsRows),

		// ── section 4: marketing ──
		heading('4. Marketing / Campaign Readiness', 2, C.teal),
		gapTable(mktRows),

		// ── section 5: exemption ──
		heading('5. Exemption Selection', 2, C.teal),
		...buildExemptionParagraphs(formData),

		// ── section 6: action items ──
		heading('6. Action Item Summary', 2, C.teal),
		para([run(
			'All Critical and Important items below must be resolved before Form C filing or campaign launch.',
			{ size: 18 }
		)]),
		buildActionTable(allRows),

		// ── appendix ──
		new Paragraph({ children: [], pageBreakBefore: true }),
		...buildAppendix(),

		// ── footer ──
		new Paragraph({ children: [], pageBreakBefore: true }),
		para([run(
			'This document is confidential and prepared by SyndicatePath for program management purposes only. ' +
			'It does not constitute legal or securities advice. Consult qualified securities counsel before filing.',
			{ size: 14, color: C.gray, italic: true }
		)])
	];

	const doc = new Document({
		sections: [{ properties: {}, children: docChildren }]
	});

	return Packer.toBuffer(doc);
}
