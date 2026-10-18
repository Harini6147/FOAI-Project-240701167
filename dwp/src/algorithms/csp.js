import { sameSkill } from '../utils/skills';
// CSP: each worker is a variable with domain {compatible, rejected}. Hard constraints must all hold.
// Case/space-insensitive comparison, so 'chennai ' matches 'Chennai'.
export const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
export const HARD_CONSTRAINTS = [
  { key: 'category', test: (w, j) => w.skills.some((s) => j.skills.some((k) => sameSkill(s, k))) },
  { key: 'availability', test: (w) => w.availability === 'Available' },
  { key: 'location', test: (w, j) => same(w.state, j.state) },
  { key: 'salary', test: (w, j) => w.expectedSalary <= j.maxSalary },
];
// Soft constraints (experience, trust, ratings) only rank the workers that survive.
export function solveCSP(workers, job, softScore) {
  const compatible = [], rejected = [];
  for (const worker of workers) {
    const failed = HARD_CONSTRAINTS.filter((c) => !c.test(worker, job)).map((c) => c.key);
    if (failed.length) rejected.push({ worker, failed });
    else compatible.push({ worker, soft: softScore(worker) });
  }
  compatible.sort((a, b) => b.soft - a.soft);
  return { compatible, rejected, checked: HARD_CONSTRAINTS.length };
}
