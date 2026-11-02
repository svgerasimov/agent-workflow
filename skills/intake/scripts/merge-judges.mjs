#!/usr/bin/env node
// Склейка результатов нескольких судей (по диапазонам страниц) в один judge.json.
// Реестр перенумеровывается сквозными ТЗ-NNN по первой странице источника
// (записи без страниц — в конец), ссылки gaps.registry_id переписываются.
// Запуск: node merge-judges.mjs <judge-1.json> <judge-2.json>... > judge.json

import fs from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: merge-judges.mjs <judge-N.json>...');
  process.exit(2);
}

const judges = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const firstPage = e => {
  const pages = (e.sources ?? []).map(s => s.page).filter(p => p != null).map(Number);
  return pages.length ? Math.min(...pages) : Infinity;
};

const registry = judges
  .flatMap((j, ji) => (j.registry ?? []).map((e, i) => ({ e, ji, i })))
  .sort((a, b) => firstPage(a.e) - firstPage(b.e) || a.ji - b.ji || a.i - b.i);

const renamed = {};
registry.forEach(({ e }, n) => {
  const id = `ТЗ-${String(n + 1).padStart(3, '0')}`;
  renamed[e.id] = id;
  e.local_id = e.id;
  e.id = id;
});

const concat = key => judges.flatMap(j => j[key] ?? []);
const agreement = {};
for (const j of judges)
  for (const [k, v] of Object.entries(j.agreement ?? {})) if (typeof v === 'number') agreement[k] = (agreement[k] ?? 0) + v;

const merged = {
  registry: registry.map(r => r.e),
  rejected: concat('rejected'),
  ambiguities: concat('ambiguities'),
  conflicts: concat('conflicts'),
  gaps: concat('gaps').map(g => ({ ...g, registry_id: renamed[g.registry_id] ?? g.registry_id })),
  missing_refs: concat('missing_refs'),
  agreement,
  uncovered: concat('uncovered'),
};
process.stdout.write(JSON.stringify(merged, null, 1) + '\n');
