const W = (n, id, loc, st, type, skills, exp, sal, av, age, phone) => ({ gender: G[id], id: `WP-IND-2026-000${id}`, name: n, phone, location: loc, state: st, workType: type, skills, experience: exp, expectedSalary: sal, availability: av, age });
const G = { 582: 'Female', 583: 'Female', 584: 'Male', 585: 'Male', 586: 'Female' };
export const seedWorkers = [
  W('Meena', 582, 'Chennai', 'Tamil Nadu', 'Domestic Worker', ['Cooking', 'Cleaning'], 4, 12000, 'Available', 32, '9000000001'),
  W('Lakshmi', 583, 'Chennai', 'Tamil Nadu', 'Domestic Worker', ['Cooking', 'Childcare'], 6, 14000, 'Available', 38, '9000000011'),
  W('Ravi', 584, 'Madurai', 'Tamil Nadu', 'Electrician', ['Wiring', 'Repairs'], 8, 18000, 'Available', 35, '9000000012'),
  W('Suresh', 585, 'Chennai', 'Tamil Nadu', 'Driver', ['Driving'], 5, 16000, 'Busy', 41, '9000000013'),
  W('Anita', 586, 'Pune', 'Maharashtra', 'Domestic Worker', ['Cleaning', 'Cooking'], 2, 9000, 'Available', 27, '9000000014'),
];
export const seedClients = [{ id: 'OWN-IND-2026-000124', name: 'Priya', phone: '9000000002', location: 'Chennai', state: 'Tamil Nadu', workType: 'Household Services', requiredSkills: ['Cooking', 'Cleaning'] }];
export const seedUsers = [
  { login: '9000000001', password: 'worker123', role: 'worker', profileId: 'WP-IND-2026-000582', name: 'Meena' },
  { login: '9000000002', password: 'client123', role: 'client', profileId: 'OWN-IND-2026-000124', name: 'Priya' },
  { login: 'partner@demo.com', password: 'partner123', role: 'partner', profileId: null, name: 'Demo Bank' },
];
const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
export const seedTxns = months.map((m, i) => ({ id: `TXN-2026-0009${10 + i}`, clientId: 'OWN-IND-2026-000124', workerId: 'WP-IND-2026-000582', amount: 11000 + (i % 3) * 750, type: 'Monthly Salary', date: `${m}-01`, status: 'Recorded' }));
export const seedConnections = [{ id: 'CN-1', clientId: 'OWN-IND-2026-000124', workerId: 'WP-IND-2026-000582', job: 'Cooking', start: '2026-01-01', salary: 12000, status: 'Active', ratings: [{ stars: 5, comment: 'Excellent work and punctual service.', date: '2026-06-30' }] }];
