#!/usr/bin/env node
// Сверка результата судьи (judge.json) с эвал-кейсом (expected.json).
// must_find: в указанных разделах есть запись со ссылкой на одну из страниц, текст которой матчит regex.
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
  return sections.flatMap(name => judge[name] ?? []).map(e => {
    const sources = e.sources ?? [];
    const text = [e.statement, e.note, e.what, e.why_it_matters, ...(e.readings ?? []), ...sources.map(s => s.quote)]
      .filter(Boolean)
      .join(' ');
    return { id: e.id, text: norm(text), pages: sources.map(s => Number(s.page)) };
  });
}

let failed = 0;
const line = (ok, item, hit) => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${item.id}  ${item.what}${hit ? `  [${hit}]` : ''}`);
};

for (const item of expected.must_find) {
  const re = new RegExp(item.regex, 'i');
  const hit = entries(item.in).find(e => re.test(e.text) && (!item.pages || e.pages.some(p => item.pages.includes(p))));
  line(Boolean(hit), item, hit?.id);
}

for (const item of expected.must_not ?? []) {
  const re = new RegExp(item.regex, 'i');
  const hit = entries(item.in).find(e => re.test(e.text));
  line(!hit, item, hit ? `нашлось в ${hit.id}` : '');
}

const total = expected.must_find.length + (expected.must_not ?? []).length;
console.log(`\n${expected.case}: ${total - failed}/${total}`);
process.exit(failed ? 1 : 0);
