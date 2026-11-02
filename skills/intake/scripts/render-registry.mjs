#!/usr/bin/env node
// Реестр требований requirements.md из judge.json (после склейки судей).
// Колонки «Где в PRD» и «Тикет» пустые: их заполняют /spec-check и /ticket-check.
// Запуск: node render-registry.mjs <judge.json> "<заголовок>" > requirements.md

import fs from 'node:fs';

const [, , judgePath, title = 'Реестр требований'] = process.argv;
if (!judgePath) {
  console.error('usage: render-registry.mjs <judge.json> [title]');
  process.exit(2);
}

const j = JSON.parse(fs.readFileSync(judgePath, 'utf8'));
const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const src = e => (e.sources ?? []).map(s => (s.page != null ? `стр. ${s.page}` : s.file)).filter((v, i, a) => a.indexOf(v) === i).join(', ');
const quote = e => cell(e.sources?.[0]?.quote);
const by = { both: 'оба', first: 'один', second: 'один', judge: 'судья' };

const a = j.agreement ?? {};
const lines = [
  `# ${title}`,
  '',
  `Выход \`/intake\`. Номера \`ТЗ-NNN\` не меняются: на них ссылаются PRD, тикеты и тесты. Новое требование — следующим свободным номером.`,
  '',
  `Записей: ${j.registry.length}. Нашли оба аналитика: ${a.both ?? '?'}, один: ${(a.first_only ?? 0) + (a.second_only ?? 0)}, судья сам: ${j.registry.filter(e => e.found_by === 'judge').length}. Формулировку поправил судья: ${a.misread ?? 0}. Отклонено: ${(j.rejected ?? []).length}.`,
  '',
  '| ID | Требование | Источник | Цитата | Нашли | Где в PRD | Тикет |',
  '|---|---|---|---|---|---|---|',
  ...j.registry.map(e => `| ${e.id} | ${cell(e.statement)} | ${src(e)} | «${quote(e)}» | ${by[e.found_by] ?? e.found_by}${e.verdict === 'corrected' ? ', правлено' : ''} |  |  |`),
  '',
];
process.stdout.write(lines.join('\n'));
