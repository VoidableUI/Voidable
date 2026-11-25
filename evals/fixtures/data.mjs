// SPDX-License-Identifier: MIT
// Shared fixture data for tasks (not a task: no default export).
const FIRST = ['Ada', 'Grace', 'Alan', 'Katherine', 'Linus', 'Margaret', 'Dennis', 'Barbara', 'Ken', 'Radia', 'Edsger', 'Frances', 'Donald', 'Hedy', 'John', 'Sophie', 'Tim', 'Adele', 'Vint', 'Mary', 'Bjarne', 'Lynn', 'Guido'];
const LAST = ['Lovelace', 'Hopper', 'Turing', 'Johnson', 'Torvalds', 'Hamilton', 'Ritchie', 'Liskov', 'Thompson', 'Perlman', 'Dijkstra', 'Allen', 'Knuth', 'Lamarr', 'McCarthy', 'Wilson', 'Berners-Lee', 'Goldberg', 'Cerf', 'Keller', 'Stroustrup', 'Conway', 'van Rossum'];
const ROLES = ['Admin', 'Editor', 'Viewer'];
const STATUS = ['active', 'invited', 'suspended'];

export const USERS = FIRST.map((f, i) => ({
  id: i + 1,
  name: `${f} ${LAST[i]}`,
  email: `${f.toLowerCase()}@example.com`,
  role: ROLES[i % 3],
  status: STATUS[i % 5 === 4 ? 2 : i % 4 === 3 ? 1 : 0],
}));

export const TEAM = USERS.map(({ id, name }) => ({ id: `u${id}`, name }));

export const COUNTRIES = [
  ['AR', 'Argentina'], ['AU', 'Australia'], ['AT', 'Austria'], ['BE', 'Belgium'], ['BR', 'Brazil'], ['CA', 'Canada'],
  ['CL', 'Chile'], ['CN', 'China'], ['CO', 'Colombia'], ['CZ', 'Czechia'], ['DK', 'Denmark'], ['EG', 'Egypt'],
  ['FI', 'Finland'], ['FR', 'France'], ['DE', 'Germany'], ['GH', 'Ghana'], ['GR', 'Greece'], ['HU', 'Hungary'],
  ['IN', 'India'], ['ID', 'Indonesia'], ['IE', 'Ireland'], ['IL', 'Israel'], ['IT', 'Italy'], ['JP', 'Japan'],
  ['KE', 'Kenya'], ['MX', 'Mexico'], ['NL', 'Netherlands'], ['NZ', 'New Zealand'], ['NG', 'Nigeria'], ['NO', 'Norway'],
  ['PE', 'Peru'], ['PH', 'Philippines'], ['PL', 'Poland'], ['PT', 'Portugal'], ['RO', 'Romania'], ['SA', 'Saudi Arabia'],
  ['SG', 'Singapore'], ['ZA', 'South Africa'], ['KR', 'South Korea'], ['ES', 'Spain'], ['SE', 'Sweden'], ['CH', 'Switzerland'],
  ['TW', 'Taiwan'], ['TH', 'Thailand'], ['TR', 'Turkey'], ['UA', 'Ukraine'], ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'],
  ['US', 'United States'], ['VN', 'Vietnam'],
].map(([code, name]) => ({ code, name }));
