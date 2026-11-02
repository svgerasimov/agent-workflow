#!/bin/sh
# Текст PDF постранично, страницы размечены "=== PAGE N" (по ним check-quotes проверяет страницы).
# macOS - через PDFKit (swift), иначе через pdftotext из poppler.
# sh pdf-to-text.sh <in.pdf> > <out.txt>
set -e
here=$(cd "$(dirname "$0")" && pwd)
if command -v swift >/dev/null 2>&1 && [ "$(uname)" = "Darwin" ]; then
  exec swift "$here/pdf-to-text.swift" "$1"
fi
if command -v pdftotext >/dev/null 2>&1; then
  pdftotext -layout "$1" - | awk 'BEGIN { RS = "\f"; n = 0 } { n++; if (length($0) > 0) printf "=== PAGE %d\n%s\n", n, $0 }'
  exit 0
fi
echo "нет ни swift (macOS), ни pdftotext: поставь poppler" >&2
exit 1
