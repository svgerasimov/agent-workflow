#!/bin/sh
# Ставит agent-workflow.
#   ./install.sh                  - глобально только /setup-workflow (в ~/.claude/skills) с архивом остальных
#                                   скиллов внутри. В проекте /setup-workflow сам распакует их в .claude/skills
#                                   и спрячет от git.
#   ./install.sh <путь к проекту> - сразу все скиллы в проект, без /setup-workflow-распаковки
#   ./install.sh --rules          - плюс личные правила общения в ~/.claude/rules
# Остальные скиллы глобально не ставятся: личные скиллы перекрывают проектные с тем же именем,
# и чужой /intake или /implement в каком-то проекте перестал бы работать.
# Повторный запуск обновляет до версии из репозитория.
set -e
here=$(cd "$(dirname "$0")" && pwd)
rules=0
project=""
for a in "$@"; do
  case "$a" in
    --rules) rules=1 ;;
    *) project="$(cd "$a" && pwd)" ;;
  esac
done

if [ -n "$project" ]; then
  target="$project/.claude/skills"
  mkdir -p "$target"
  for s in "$here"/skills/*/; do
    name=$(basename "$s")
    rm -rf "$target/$name"
    cp -R "$s" "$target/$name"
    # кейсы эвалов с внутренними ТЗ остаются только в клоне
    rm -rf "$target/$name/evals/cases"/0* "$target/$name/evals/runs" "$target/$name/evals/LOG.md"
    echo "скилл $name → $target/$name"
  done
  echo "$(cat "$here/VERSION") ($(cd "$here" && git rev-parse --short HEAD 2>/dev/null))" > "$target/.agent-workflow-version"
else
  dst="$HOME/.claude/skills/setup-workflow"
  mkdir -p "$HOME/.claude/skills"
  rm -rf "$dst"
  cp -R "$here/skills/setup-workflow" "$dst"
  # tar, а не папки: SKILL.md внутри архива Claude Code не подхватит как отдельные скиллы
  (cd "$here/skills" && ls -d */ | sed 's#/##' | grep -v '^setup-workflow$' | xargs tar -czf "$dst/bundle.tar.gz" --exclude='*/evals/cases/0*' --exclude='*/evals/runs' --exclude='*/evals/LOG.md')
  echo "$(cat "$here/VERSION") ($(cd "$here" && git rev-parse --short HEAD 2>/dev/null))" > "$dst/bundle.version"
  echo "скилл setup-workflow → $dst"
  echo "в архиве: $(tar -tzf "$dst/bundle.tar.gz" | grep '/SKILL.md$' | sed 's#/SKILL.md##' | tr '\n' ' ')"
fi

if [ $rules = 1 ]; then
  mkdir -p "$HOME/.claude/rules"
  for r in "$here"/rules/*.md; do
    dst="$HOME/.claude/rules/$(basename "$r")"
    if [ -e "$dst" ]; then echo "правило уже есть, не трогаю: $dst"; else cp "$r" "$dst"; echo "правило → $dst"; fi
  done
fi

missing=""
for s in to-spec to-tickets tdd code-review codebase-design to-questionnaire wait-what grill-with-docs; do
  [ -d "$HOME/.claude/skills/$s" ] || missing="$missing $s"
done
if [ -n "$missing" ]; then
  echo
  echo "Не хватает скиллов Покока:$missing"
  for s in $missing; do echo "  npx -y skills add mattpocock/skills -g -y -a claude-code -s $s"; done
fi

echo
echo "Дальше: в корне проекта запусти claude и внутри набери /setup-workflow"
