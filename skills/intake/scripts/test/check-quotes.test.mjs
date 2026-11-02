// Контрольный тест скрипта проверки цитат: синтетическое ТЗ с известными ответами.
// Каждая починка скрипта - новый случай в cases.json, чтобы ошибка не вернулась.
// Запуск: node --test <папка скилла intake>/scripts/test/check-quotes.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, '..', 'check-quotes.mjs');
const casesFile = path.join(here, 'cases.json');
const cases = JSON.parse(fs.readFileSync(casesFile, 'utf8')).requirements;

const run = spawnSync('node', [script, path.join(here, 'source'), casesFile], { encoding: 'utf8' });
const report = JSON.parse(run.stdout);
const statusOf = id => report.problems.find(p => p.owner === id)?.status ?? 'ok';

for (const c of cases) {
  test(c.id, () => assert.equal(statusOf(c.id), c.expect));
}
