#!/bin/sh
# Ставит скиллы agent-workflow.
#   ./install.sh                  - глобально, в ~/.claude/skills (работают во всех проектах на этой машине)
#   ./install.sh <путь к проекту> - только в проект, в <проект>/.claude/skills
#   ./install.sh --rules          - плюс личные правила общения в ~/.claude/rules
# Повторный запуск обновляет скиллы до версии из репозитория.
set -e
here=$(cd "$(dirname "$0")" && pwd)
rules=0
target="$HOME/.claude/skills"
for a in "$@"; do
  case "$a" in
    --rules) rules=1 ;;
    *) target="$(cd "$a" && pwd)/.claude/skills" ;;
  esac
done

mkdir -p "$target"
for s in "$here"/skills/*/; do
  name=$(basename "$s")
  rm -rf "$target/$name"
  cp -R "$s" "$target/$name"
  echo "скилл $name → $target/$name"
done

if [ $rules = 1 ]; then
  mkdir -p "$HOME/.claude/rules"
  for r in "$here"/rules/*.md; do
    dst="$HOME/.claude/rules/$(basename "$r")"
    if [ -e "$dst" ]; then echo "правило уже есть, не трогаю: $dst"; else cp "$r" "$dst"; echo "правило → $dst"; fi
  done
fi

missing=""
for s in to-spec to-tickets tdd code-review codebase-design to-questionnaire wait-what; do
  [ -d "$HOME/.claude/skills/$s" ] || [ -d "$target/$s" ] || missing="$missing $s"
done
if [ -d "$HOME/.claude/skills/grill-with-docs" ] || [ -d "$target/grill-with-docs" ]; then :; else missing="$missing grill-with-docs"; fi
if [ -n "$missing" ]; then
  echo
  echo "Не хватает скиллов Покока:$missing"
  for s in $missing; do echo "  npx -y skills add mattpocock/skills -g -y -a claude-code -s $s"; done
fi

echo
echo "Дальше: открой Claude Code в корне проекта и запусти /setup-workflow"
