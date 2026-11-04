#!/usr/bin/env node
// Сверка результата судьи /ticket-check (judge.json) с эвал-кейсом (expected.json).
// must_find: в разделах `in` есть запись, текст которой матчит regex; для ticket_findings
// можно сузить по `tickets` и `kind`, для coverage и uncovered — по `ids` (номера ТЗ).
// must_not: ни одна запись не матчит.
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
// номер тикета без ведущих нулей и имени файла: «07-family…» → «7»
const ticketNo = t => String(t ?? '').match(/\d+/)?.[0]?.replace(/^0+(?=\d)/, '') ?? null;

function entries(sections) {
  return sections.flatMap(name =>
    (judge[name] ?? []).map(e => {
      const text = [
        e.ticket_says, e.detail, e.what_happens, e.risk, e.scenario, e.prd, e.where,
        ...(e.registry ?? []), ...(e.sources ?? []).map(s => s.quote),
      ]
        .filter(Boolean)
        .join(' ');
      return {
        section: name,
        id: e.id ?? null,
        ticket: ticketNo(e.ticket ?? e.nearest_ticket),
        kind: e.kind ?? null,
        registry: e.registry ?? (e.id ? [e.id] : []),
        text: norm(text),
      };
    }),
  );
}

const fits = (item, e) =>
  new RegExp(item.regex, 'i').test(e.text) &&
  (!item.tickets || item.tickets.map(ticketNo).includes(e.ticket)) &&
  (!item.kind || item.kind.includes(e.kind)) &&
  (!item.ids || e.registry.some(id => item.ids.includes(id)));

let failed = 0;
const line = (ok, item, hit) => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${item.id}  ${item.what}${hit ? `  [${hit}]` : ''}`);
};

const label = e => `${e.section} ${e.ticket ?? e.id ?? ''}`.trim();

for (const item of expected.must_find) {
  const hit = entries(item.in).find(e => fits(item, e));
  line(Boolean(hit), item, hit && label(hit));
}

for (const item of expected.must_not ?? []) {
  const hit = entries(item.in).find(e => fits(item, e));
  line(!hit, item, hit ? `нашлось в ${label(hit)}` : '');
}

const total = expected.must_find.length + (expected.must_not ?? []).length;
console.log(`\n${expected.case}: ${total - failed}/${total}`);
process.exit(failed ? 1 : 0);
