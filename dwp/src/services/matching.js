import { aStar } from '../algorithms/aStar';
import { solveCSP, same } from '../algorithms/csp';
import { sameSkill } from '../utils/skills';
const MAX_COST = 8;
// Graph: job -> skill -> experience -> location -> worker. Mismatches add cost.
export function pathFor(w, job) {
  const expCost = Math.min(3, Math.max(0, (job.minExp || 0) - w.experience));
  const locCost = same(w.location, job.location) ? 0 : same(w.state, job.state) ? 1 : 2;
  const graph = { job: job.skills.map((s) => ['skill:' + s, w.skills.some((x) => sameSkill(x, s)) ? 0 : 3]), experience: [['location', expCost]], location: [['worker', locCost]], worker: [] };
  job.skills.forEach((s) => (graph['skill:' + s] = [['experience', 0]]));
  const h = (n) => (n === 'worker' ? 0 : n === 'location' ? locCost : n === 'job' ? 0 : expCost + locCost); // never overestimates
  const r = aStar(graph, 'job', 'worker', h);
  return { ...r, percent: Math.round(100 * (1 - r.cost / MAX_COST)), labels: r.path.map((p) => ({ job: 'Job Requirement', experience: 'Experience', location: 'Location', worker: 'Worker' }[p] || p.replace('skill:', ''))) };
}
export function findMatches(workers, job, trustOf) {
  const { compatible, rejected, checked } = solveCSP(workers, job, trustOf);
  const results = compatible.map(({ worker }) => ({ worker, ...pathFor(worker, job), trust: trustOf(worker) }))
    .sort((a, b) => b.percent * 0.6 + b.trust * 0.4 - (a.percent * 0.6 + a.trust * 0.4));
  return { results, rejected, checked };
}
