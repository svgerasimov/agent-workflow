#!/usr/bin/env node
// Нарезка отчётов аналитиков по диапазонам страниц — для нескольких судей на большом ТЗ.
// Запись попадает в диапазон по первой странице среди своих источников;
// записи только с источниками без страниц (JSON, md) — в отдельный кусок "nopage".
// Запуск: node split-by-pages.mjs <out-dir> <1-11,12-29,30-41> <report.json>...
// На выходе: <out-dir>/<имя отчёта>.<диапазон>.json

import fs from 'node:fs';
import path from 'node:path';

const [, , outDir, rangesArg, ...reports] = process.argv;
if (!outDir || !rangesArg || reports.length === 0) {
  console.error('usage: split-by-pages.mjs <out-dir> <ranges> <report.json>...');
  process.exit(2);
}

const ranges = rangesArg.split(',').map(r => {
  const [from, to] = r.split('-').map(Number);
  return { name: r, from, to };
});
const SECTIONS = ['requirements', 'ambiguities', 'conflicts', 'missing_refs'];

const bucketOf = entry => {
  const pages = (entry.sources ?? []).map(s => s.page).filter(p => p != null).map(Number);
  if (pages.length === 0) return 'nopage';
  const first = Math.min(...pages);
  return ranges.find(r => first >= r.from && first <= r.to)?.name ?? 'nopage';
};

fs.mkdirSync(outDir, { recursive: true });
for (const file of reports) {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  const base = path.basename(file, '.json');
  const buckets = Object.fromEntries([...ranges.map(r => r.name), 'nopage'].map(n => [n, {}]));
  for (const section of SECTIONS) {
    for (const b of Object.values(buckets)) b[section] = [];
    for (const entry of report[section] ?? []) buckets[bucketOf(entry)][section].push(entry);
  }
  for (const [name, data] of Object.entries(buckets)) {
    const out = path.join(outDir, `${base}.${name}.json`);
    fs.writeFileSync(out, JSON.stringify(data, null, 1));
    console.log(out, SECTIONS.map(s => `${s}=${data[s].length}`).join(' '));
  }
}
