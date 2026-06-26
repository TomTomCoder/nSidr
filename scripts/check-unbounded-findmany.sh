#!/usr/bin/env bash
# Performance gate: flag new `findMany(` call sites that have no row cap.
#
# A call is considered SAFE when its argument object (or chained options) contains
# at least one of:
#   - `take:`         explicit row limit
#   - `cursor:`       cursor pagination
#   - `id: { in:`     bounded by a caller-provided id list
#   - `id: { notIn:`  same family
#   - `findMany()`    no options at all (intentional; usually small ref tables)
#
# Run from the repo root. Exits 1 with offending file:line list if NEW
# unsafe call sites appear outside the baseline.
#
# Maintenance: regenerate the baseline by running this script with --baseline
# after a deliberate sweep of legitimate sites. The baseline file is committed.

set -uo pipefail

SEARCH_DIR="apps/nestjs-backend/src"
BASELINE_FILE="scripts/check-unbounded-findmany.baseline"

# Extract candidate findMany call sites (file:line). We look at the next ~15 lines
# of context after `findMany(` to decide whether a cap exists.
collect_candidates() {
  grep -rn --include="*.ts" -E "\.findMany\s*\(" "$SEARCH_DIR" 2>/dev/null \
    | grep -vE "(spec|test)\.ts:" \
    || true
}

is_unbounded() {
  local file="$1"
  local line="$2"
  local end=$((line + 14))
  local window
  window=$(sed -n "${line},${end}p" "$file" 2>/dev/null) || return 1
  # Empty-arg findMany() — typically a small ref table, treat as safe but rare.
  if echo "$window" | head -1 | grep -qE "\.findMany\s*\(\s*\)"; then
    return 1
  fi
  if echo "$window" | grep -qE "(take|cursor)\s*:"; then
    return 1
  fi
  # Any caller-bounded id-style filter: matches `id:`, `xxxId:`, `recordId:`, etc.
  # Conservative: only "*id"/"*Id" suffixes, so we don't accept arbitrary `{ in: [] }`.
  if echo "$window" | grep -qE "(^|[^a-zA-Z])[a-zA-Z_]*[Ii]d\s*:\s*\{\s*(notIn|in)\s*:"; then
    return 1
  fi
  return 0
}

mode="${1:-check}"
unbounded=()

while IFS=: read -r file line _; do
  [ -z "$file" ] && continue
  if is_unbounded "$file" "$line"; then
    unbounded+=("$file:$line")
  fi
done < <(collect_candidates)

if [ "$mode" = "--baseline" ]; then
  printf '%s\n' "${unbounded[@]}" | sort > "$BASELINE_FILE"
  echo "Wrote baseline: $BASELINE_FILE ($(wc -l < "$BASELINE_FILE") sites)"
  exit 0
fi

# Compare current set to baseline. Anything new is a fail; baselined sites are warnings.
if [ ! -f "$BASELINE_FILE" ]; then
  echo "No baseline at $BASELINE_FILE. Run: bash scripts/check-unbounded-findmany.sh --baseline"
  exit 1
fi

current_tmp=$(mktemp)
printf '%s\n' "${unbounded[@]}" | sort > "$current_tmp"
new_sites=$(comm -23 "$current_tmp" "$BASELINE_FILE" || true)
rm -f "$current_tmp"

if [ -n "$new_sites" ]; then
  echo "FAIL: new unbounded findMany sites detected. Add take/cursor, or scope to an id-in list."
  echo "$new_sites" | sed 's/^/  /'
  exit 1
fi

current_count=${#unbounded[@]}
baseline_count=$(wc -l < "$BASELINE_FILE" | tr -d ' ')
echo "OK: no new unbounded findMany calls. ($current_count current vs $baseline_count baselined)"
