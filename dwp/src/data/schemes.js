import { same } from '../algorithms/csp';
// Scheme rules below were checked against official sources on VERIFIED_ON.
// Production plan: replace this file with a call to an official data source / your own curated API.
export const VERIFIED_ON = '3 October 2026';
const DISCLAIMER_RULES = 'Rules can change. Confirm on the official site before applying.';
export const SCHEMES = [
  { id: 'eshram', level: 'Central', name: 'e-Shram (National Database of Unorganised Workers)', dept: 'Ministry of Labour & Employment',
    benefit: 'Free e-Shram card (UAN) and a ₹2 lakh accident insurance cover (PMSBY) for the first year for eligible registrants.',
    rules: { minAge: 16, maxAge: 59 },
    manual: ['You are not a member of EPFO / ESIC (or government-funded NPS)'],
    docs: ['Aadhaar number', 'Mobile number linked to Aadhaar', 'Savings bank account details (IFSC)'],
    apply: 'Self-register online on the e-Shram portal, or at any Common Service Centre (CSC). No income limit is set for registration.',
    link: 'https://eshram.gov.in', source: 'eshram.gov.in FAQs; PIB' },
  { id: 'pmsym', level: 'Central', name: 'Pradhan Mantri Shram Yogi Maan-dhan (PM-SYM) pension', dept: 'Ministry of Labour & Employment',
    benefit: 'Assured pension of ₹3,000 per month after age 60, with matching contribution from the Government.',
    rules: { minAge: 18, maxAge: 40, maxMonthlyIncome: 15000 },
    manual: ['You are not an income tax payer', 'You are not a member of EPFO / ESIC / NPS'],
    docs: ['Aadhaar card', 'Savings bank / Jan Dhan account number with IFSC (passbook, cheque book or statement)'],
    apply: 'Enrol at a nearest Common Service Centre using self-certification, or self-register on the PM-SYM portal / app.',
    link: 'https://labour.gov.in/enrolment-process', source: 'labour.gov.in (PM-SYM enrolment process)' },
  { id: 'pmsby', level: 'Central', name: 'Pradhan Mantri Suraksha Bima Yojana (PMSBY)', dept: 'Ministry of Finance',
    benefit: '₹2 lakh for accidental death or full disability, ₹1 lakh for partial disability. Premium ₹20 per year (may be revised).',
    rules: { minAge: 18, maxAge: 70 },
    manual: ['You have a savings bank / post office account and give consent for yearly auto-debit', 'You enrol through only one account'],
    docs: ['Savings bank or post office account', 'Aadhaar (primary KYC)', 'Nominee details'],
    apply: 'Apply through your bank or post office branch, or online via the Jan Suraksha portal.',
    link: 'https://jansuraksha.gov.in', source: 'jansuraksha.gov.in; PIB' },
  { id: 'pmjjby', level: 'Central', name: 'Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)', dept: 'Ministry of Finance',
    benefit: '₹2 lakh life cover on death due to any cause. Premium ₹436 per year (may be revised).',
    rules: { minAge: 18, maxAge: 50 },
    manual: ['You have a savings bank account and give consent for yearly auto-debit'],
    docs: ['Savings bank account', 'Aadhaar (KYC)', 'Nominee details'],
    apply: 'Apply through your bank branch or the Jan Suraksha portal. Cover can continue to age 55 if you join before 50.',
    link: 'https://jansuraksha.gov.in', source: 'jansuraksha.gov.in; bank scheme pages' },
  { id: 'apy', level: 'Central', name: 'Atal Pension Yojana (APY)', dept: 'PFRDA, Ministry of Finance',
    benefit: 'Guaranteed pension of ₹1,000 to ₹5,000 per month after age 60, based on the contribution you choose.',
    rules: { minAge: 18, maxAge: 40 },
    manual: ['You are an Indian citizen', 'You are not, and have not been, an income tax payer (new accounts since 1 Oct 2022)', 'You have a savings bank account'],
    docs: ['Aadhaar', 'Mobile number', 'Savings bank account'],
    apply: 'Open through your bank or post office branch. Monthly contribution depends on the age you join and the pension you choose.',
    link: 'https://www.pfrda.org.in', source: 'PFRDA APY FAQs and scheme page' },
  { id: 'tnwb', level: 'Tamil Nadu', name: 'Tamil Nadu Unorganised Workers Welfare Boards (includes Domestic Workers Welfare Board)', dept: 'Labour Welfare & Skill Development Department, Government of Tamil Nadu',
    benefit: 'Board membership with welfare assistance such as accident and disability assistance and pension. Amounts differ by board, so check current rates.',
    rules: { state: 'Tamil Nadu', minAge: 18, maxAge: 59 },
    manual: ['Your occupation is covered by one of the 18 boards (for example domestic work, driving, tailoring, cooking and catering)'],
    docs: ['Registration application form', 'Passport-size photographs', 'Certificate of employment (from employer, trade union or a Labour Department officer)', 'Age proof'],
    apply: 'Register on the Tamil Nadu Unorganised Workers Welfare Board portal or through the District Labour Officer (Social Security Scheme). Registration is for ages 18 to under 60.',
    link: 'https://tnuwwb.tn.gov.in', source: 'labour.tn.gov.in; district labour department pages' },
  { id: 'pmmvy', level: 'Central (women)', name: 'Pradhan Mantri Matru Vandana Yojana (PMMVY)', dept: 'Ministry of Women & Child Development',
    benefit: '₹5,000 for the first living child (two instalments). ₹6,000 for a second child if she is a girl.',
    rules: { gender: 'Female', minAge: 18 },
    manual: ['You are pregnant, or registering within 270 days of childbirth', 'You qualify under at least one category, such as e-Shram card holder, BPL / NFSA ration card, SC/ST, disability of 40% or more, PM-JAY beneficiary, or family income below ₹8 lakh a year', 'You are not a regular government / PSU employee and not already receiving similar maternity benefit under any law'],
    docs: ['Aadhaar', 'Mother and Child Protection (MCP) card', 'Bank or post office account', 'Proof of the category you qualify under (for example e-Shram card or ration card)'],
    apply: 'Register through your Anganwadi worker / ASHA, or directly on the PMMVY portal. Registration during pregnancy is mandatory for the second-child girl benefit.',
    link: 'https://pmmvy.wcd.gov.in', source: 'Ministry of WCD; PMMVY guidelines' },
  { id: 'kmut', level: 'Tamil Nadu (women)', name: 'Magalir Urimai Thogai (Kalaignar Magalir Urimai Thittam)', dept: 'Government of Tamil Nadu',
    benefit: '₹1,000 per month to the woman head of the family (as reported for 2026). The scheme is being restructured, so the name and amount may change.',
    rules: { gender: 'Female', state: 'Tamil Nadu', minAge: 21, maxAnnualIncome: 250000 },
    manual: ['You are the woman head of the family as per the ration card', 'Your family income is below ₹2.5 lakh a year, you are not an income tax payer, and your family land and household electricity use are within the limits set in the scheme rules'],
    docs: ['Aadhaar', 'Family (ration) card', 'Bank passbook'],
    apply: 'Apply through the Tamil Nadu government channels announced for the scheme (Taluk / ration shop camps or the state e-services portal).',
    link: 'https://www.tn.gov.in', source: 'Tamil Nadu government statements via news reports (official portal not directly checked)',
    caution: 'Status check: the new state government (2026) says it is restructuring this scheme. Confirm the current name, amount and rules before applying.' },
];
export function matchSchemes(p, monthlyIncome) {
  return SCHEMES.map((s) => {
    const r = s.rules, why = [], ok = [];
    const add = (pass, text) => { ok.push(pass); if (pass) why.push(text); };
    if (r.minAge != null) add(p.age >= r.minAge && (r.maxAge == null || p.age <= r.maxAge), { k: 'whyAge', p: { age: p.age, range: `${r.minAge}${r.maxAge ? '–' + r.maxAge : '+'}` } });
    if (r.gender) add(p.gender && same(p.gender, r.gender), { k: 'whyGender', p: { gender: p.gender } });
    if (r.state) add(same(p.state || '', r.state), { k: 'whyState', p: { state: p.state } });
    if (r.maxMonthlyIncome) add(monthlyIncome <= r.maxMonthlyIncome, { k: 'whyIncomeM', p: { income: Math.round(monthlyIncome), limit: r.maxMonthlyIncome } });
    if (r.maxAnnualIncome) add(monthlyIncome * 12 < r.maxAnnualIncome, { k: 'whyIncomeY', p: { income: Math.round(monthlyIncome * 12), limit: r.maxAnnualIncome } });
    return { ...s, why, likely: ok.every(Boolean) };
  }).filter((s) => s.likely);
}
