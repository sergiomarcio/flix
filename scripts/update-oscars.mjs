import { mkdir, writeFile } from 'node:fs/promises';

// Pin the reviewed snapshot; pass a newer commit as an argument when updating.
const revision = process.argv[2] || 'c5e9716b7e020e70205d6b95f5a5678526c1b45f';
const base = `https://raw.githubusercontent.com/DLu/oscar_data/${revision}`;
async function download(file) {
  const response = await fetch(`${base}/${file}`);
  if (!response.ok) throw new Error(`Cannot download ${file}: ${response.status}`);
  return response.text();
}
const [tsv, license] = await Promise.all([download('oscars.csv'), download('LICENSE')]);
const lines = tsv.replace(/\r/g, '').trimEnd().split('\n');
const headers = lines.shift().split('\t');
const ceremonies = new Map();
const winners = {};
const split = value => (value || '').split('|').filter(Boolean);
for (const line of lines) {
  const fields = line.split('\t');
  const row = Object.fromEntries(headers.map((key, i) => [key, fields[i] || '']));
  const ceremony = Number(row.Ceremony);
  if (!Number.isInteger(ceremony) || ceremony < 1) throw new Error('Invalid ceremony');
  // Two ceremonies took place in 1930; there was no ceremony in 1933.
  const year = ({ 1: 1929, 2: 1930, 3: 1930, 4: 1931, 5: 1932 })[ceremony] || ceremony + 1928;
  if (!ceremonies.has(ceremony)) ceremonies.set(ceremony, { ceremony, year, categories: [] });
  const data = ceremonies.get(ceremony);
  // Keep the historical category, including separate color / black-and-white awards.
  let category = data.categories.find(item => item.category === row.Category);
  if (!category) {
    category = { id: `${ceremony}-${data.categories.length}`, category: row.Category,
      canonicalCategory: row.CanonicalCategory, nominees: [] };
    data.categories.push(category);
  }
  const imdbIds = split(row.FilmId).filter(id => /^tt\d+$/.test(id));
  const winner = row.Winner === 'True';
  category.nominees.push({ films: split(row.Film), imdbIds,
    name: row.Name || split(row.Nominees).join(', '), detail: row.Detail,
    winner });
  if (winner) for (const id of imdbIds) {
    winners[id] = [...new Set([...(winners[id] || []), ceremony])];
  }
}
const latest = Math.max(...[...ceremonies.values()].map(item => item.year));
if (latest < 2026 || !winners.tt15398776) throw new Error('Incomplete Oscar snapshot');
const output = new URL('../src/assets/oscars/', import.meta.url);
await mkdir(output, { recursive: true });
for (const data of ceremonies.values()) {
  await writeFile(new URL(`${data.ceremony}.json`, output), JSON.stringify(data));
}
await writeFile(new URL('index.json', output), JSON.stringify({
  source: 'https://github.com/DLu/oscar_data', revision, throughYear: latest, winners
}));
await writeFile(new URL('LICENSE.txt', output), license);
console.log(`Generated ${ceremonies.size} ceremonies through ${latest}; ${Object.keys(winners).length} winning films.`);
