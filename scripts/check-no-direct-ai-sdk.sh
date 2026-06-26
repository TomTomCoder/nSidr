#!/usr/bin/env bash
# D-15-06 Phase exit criterion: no direct AI SDK imports outside the gateway module.
# Run from the repo root. Exits 1 with offending file list if any violation found.
#
# Forbidden tokens (provider construction tokens only):
#   @ai-sdk/openai, @ai-sdk/anthropic, etc. — direct provider SDK package imports
#   createOpenAI — inline OpenAI provider construction
#   createGateway — inline gateway construction outside the gateway module
#
# NOT forbidden:
#   - generateText, generateImage, streamText (legitimate caller use via gateway-returned models)
#   - @ai-sdk/provider (shared error / type primitives like APICallError — not a provider build)
# Excluded: *.spec.ts files, the ai/ gateway module directory itself.

set -euo pipefail

SEARCH_DIR="apps/nestjs-backend/src"
# Match @ai-sdk/<provider> but exclude @ai-sdk/provider (shared types/errors package).
FORBIDDEN_TOKENS=('@ai-sdk/openai' '@ai-sdk/anthropic' '@ai-sdk/google' '@ai-sdk/mistral' '@ai-sdk/cohere' '@ai-sdk/groq' '@ai-sdk/azure' '@ai-sdk/perplexity' '@ai-sdk/togetherai' '@ai-sdk/fireworks' '@ai-sdk/deepinfra' '@ai-sdk/deepseek' '@ai-sdk/cerebras' '@ai-sdk/replicate' '@ai-sdk/xai' '@ai-sdk/amazon-bedrock' '@ai-sdk/google-vertex' '@ai-sdk/openai-compatible' 'createOpenAI' 'createGateway')
EXCLUDE_DIR="ai"

found=0
offending_files=()

for token in "${FORBIDDEN_TOKENS[@]}"; do
  while IFS= read -r line; do
    # Strip comment lines so header prose in this script cannot self-invalidate the gate
    filtered=$(echo "$line" | grep -v '^[[:space:]]*//' || true)
    if [ -n "$filtered" ]; then
      file=$(echo "$line" | cut -d: -f1)
      offending_files+=("$file ($token)")
      found=1
    fi
  done < <(grep -r "$token" "$SEARCH_DIR" \
    --include="*.ts" \
    --exclude="*spec*" \
    --exclude-dir="$EXCLUDE_DIR" \
    -l 2>/dev/null || true)
done

# Deduplicate
if [ ${#offending_files[@]} -gt 0 ]; then
  echo "FAIL: Direct AI SDK imports found outside gateway module (retrofit worklist):"
  printf '  %s\n' "${offending_files[@]}" | sort -u
  exit 1
fi

echo "OK: No direct AI SDK imports outside apps/nestjs-backend/src/features/ai/"
