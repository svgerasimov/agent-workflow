#!/usr/bin/env node
// Проверка цитат аналитиков: каждая цитата должна дословно найтись в source/.
// Сравнение после нормализации (регистр, ё/е, кавычки, тире, переносы, пробелы),
// "..." внутри цитаты = пропуск, части ищутся по порядку.
// Запуск: node check-quotes.mjs <папка source> <analyst-a.json> [analyst-b.json ...] > quote-check.json

import fs from 'node:fs';
import path from 'node:path';

const [, , sourceDir, ...inputs] = process.argv;
if (!sourceDir || inputs.length === 0) {
  console.error('usage: check-quotes.mjs <source-dir> <analyst.json>...');
  process.exit(2);
}

const norm = s =>
  s
    .normalize('NFC')
    .replace(/­/g, '')
    // перенос слова "отпус-\nка" склеиваем, прочерки ячеек таблиц ("-\n-") не трогаем
    .replace(/(\p{L})-[ \t]*\n\s*(\p{L})/gu, '$1$2')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»“”„‟"']/g, '"')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/[\s ]+/g, ' ')
    // одинокие прочерки - пустые ячейки таблиц, в тексте PDF их число плавает
    .replace(/(^| )-+(?= |$)/g, '')
    .replace(/ +/g, ' ')
    .trim();

// Текст из PDF размечен "=== PAGE N"; у остальных файлов страниц нет
function loadSource(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const parts = raw.split(/^=== PAGE (\d+)\s*$/m);
  if (parts.length === 1) return { pages: [{ page: null, text: norm(raw) }] };
  const pages = [];
  for (let i = 1; i < parts.length; i += 2) pages.push({ page: Number(parts[i]), text: norm(parts[i + 1]) });
  return { pages };
}

const sources = {};
for (const name of fs.readdirSync(sourceDir)) {
  if (!/\.(txt|md|json)$/i.test(name)) continue;
  const doc = loadSource(path.join(sourceDir, name));
  // Склейка соседних страниц, чтобы цитата через границу страницы тоже находилась
  doc.joined = doc.pages.map(p => p.text).join(' ');
  doc.offsets = [];
  let at = 0;
  for (const p of doc.pages) {
    doc.offsets.push({ page: p.page, from: at, to: at + p.text.length });
    at += p.text.length + 1;
  }
  sources[name] = doc;
}

function pagesAt(doc, from, to) {
  return doc.offsets.filter(o => o.to >= from && o.from <= to).map(o => o.page);
}

// Все вхождения: одна и та же фраза может стоять на разных страницах
function find(doc, quote) {
  const chunks = norm(quote).split(/\s*(?:\.\.\.|…)\s*/).filter(Boolean);
  if (chunks.length === 0) return null;
  const found = new Set();
  for (let start = doc.joined.indexOf(chunks[0]); start !== -1; start = doc.joined.indexOf(chunks[0], start + 1)) {
    let end = start + chunks[0].length;
    let ok = true;
    for (const c of chunks.slice(1)) {
      const i = doc.joined.indexOf(c, end);
      if (i === -1) {
        ok = false;
        break;
      }
      end = i + c.length;
    }
    if (!ok) break;
    pagesAt(doc, start, end).forEach(p => found.add(p));
  }
  return found.size ? [...found] : null;
}

function resolveFile(file) {
  if (!file) return null;
  const base = path.basename(file);
  if (sources[base]) return base;
  // Аналитик мог сослаться на PDF, а проверяем по извлечённому .txt
  const txt = base.replace(/\.pdf$/i, '.txt');
  return sources[txt] ? txt : undefined;
}

const results = [];
function walk(node, owner, input) {
  if (Array.isArray(node)) return node.forEach(n => walk(n, owner, input));
  if (!node || typeof node !== 'object') return;
  const id = typeof node.id === 'string' ? node.id : owner;
  if (typeof node.quote === 'string') {
    const r = { input, owner: id, file: node.file ?? null, page: node.page ?? null, quote: node.quote };
    const resolved = resolveFile(node.file);
    if (resolved === undefined) {
      r.status = 'file_missing';
    } else {
      const names = resolved ? [resolved] : Object.keys(sources);
      for (const name of names) {
        const pages = find(sources[name], node.quote);
        if (pages) {
          r.found_in = name;
          r.found_pages = pages;
          break;
        }
      }
      if (!r.found_pages) r.status = 'not_found';
      else if (r.page == null || r.found_pages.includes(null) || r.found_pages.includes(Number(r.page))) r.status = 'ok';
      else r.status = 'wrong_page';
    }
    results.push(r);
  }
  for (const [k, v] of Object.entries(node)) if (k !== 'quote') walk(v, id, input);
}

for (const input of inputs) walk(JSON.parse(fs.readFileSync(input, 'utf8')), null, path.basename(input));

const count = s => results.filter(r => r.status === s).length;
const report = {
  summary: {
    total: results.length,
    ok: count('ok'),
    wrong_page: count('wrong_page'),
    not_found: count('not_found'),
    file_missing: count('file_missing'),
  },
  problems: results.filter(r => r.status !== 'ok'),
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(report.problems.length ? 1 : 0);
