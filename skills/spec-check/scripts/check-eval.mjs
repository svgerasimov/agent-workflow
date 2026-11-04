#!/usr/bin/env node
// Сверка результата судьи /spec-check (judge.json) с эвал-кейсом (expected.json).
// must_find: в разделах `in` есть запись, текст которой матчит regex; для trace можно
// сузить по `ids` (номера ТЗ) и `status`, у unsupported они не проверяются.
// must_not: ни одна запись не матчит regex.
// Запуск: node check-eval.mjs <judge.json> <expected.json>

import fs from 'node:fs';

const [, , judgePath, expectedPath] = process.argv;
if (!judgePath || !expectedPath) {
  console.error('usage: check-eval.mjs <judge.json> <expected.json>');
  process.exit(2);
}

const judge = JSON.parse(fs.readFileSync(judgePath, 'utf8'));
const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));

const norm = s => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');

function entries(sections) {
  return sections.flatMap(name =>
    (judge[name] ?? []).map(e => {
      const text = [e.claim, e.note, e.prd, e.detail, e.what_happens, e.prd_says, e.risk, ...(e.sources ?? []).map(s => s.quote)]
        .filter(Boolean)
        .join(' ');
      return { section: name, id: e.id ?? null, status: e.status ?? null, text: norm(text) };
    }),
  );
}

const fits = (item, e) =>
  new RegExp(item.regex, 'i').test(e.text) &&
  (e.section !== 'trace' || !item.ids || item.ids.includes(e.id)) &&
  (e.section !== 'trace' || !item.status || item.status.includes(e.status));

let failed = 0;
const line = (ok, item, hit) => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${item.id}  ${item.what}${hit ? `  [${hit}]` : ''}`);
};

for (const item of expected.must_find) {
  const hit = entries(item.in).find(e => fits(item, e));
  line(Boolean(hit), item, hit && `${hit.section} ${hit.id ?? ''}`.trim());
}

for (const item of expected.must_not ?? []) {
  const hit = entries(item.in).find(e => fits(item, e));
  line(!hit, item, hit ? `нашлось в ${hit.section} ${hit.id ?? ''}`.trim() : '');
}

const total = expected.must_find.length + (expected.must_not ?? []).length;
console.log(`\n${expected.case}: ${total - failed}/${total}`);
process.exit(failed ? 1 : 0);
