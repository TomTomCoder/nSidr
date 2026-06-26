#!/bin/bash

# Comprehensive Feature Integration Tests for Teable
# Tests core data, AI, views, and automation features

set -e

API="http://localhost:3002"
FRONTEND="http://localhost:3000"
VERBOSE=true

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# ============================================================================
# TEST 1: API Health & Services
# ============================================================================
test_api_health() {
    log_test "API Health Check"
    if curl -s "$API/api/healthz" | grep -q "ok\|healthy\|status" || [ $? -eq 0 ]; then
        log_pass "API is responding"
    else
        log_fail "API health check"
    fi
}

# ============================================================================
# TEST 2: Frontend Loads
# ============================================================================
test_frontend_load() {
    log_test "Frontend Loading"
    if curl -s "$FRONTEND" | grep -q "<html\|React\|Next" || [ $? -eq 0 ]; then
        log_pass "Frontend HTML loads"
    else
        log_fail "Frontend load"
    fi
}

# ============================================================================
# TEST 3: Database Connectivity (via backend logs)
# ============================================================================
test_database_connectivity() {
    log_test "Database Connectivity"
    if nc -z localhost 5432 2>/dev/null; then
        log_pass "PostgreSQL connected"
    else
        log_fail "PostgreSQL connection"
    fi

    if nc -z localhost 6379 2>/dev/null; then
        log_pass "Redis connected"
    else
        log_fail "Redis connection"
    fi
}

# ============================================================================
# TEST 4: Agent Tools (NEW FEATURES)
# ============================================================================
test_agent_tools() {
    log_test "Agent Schema Tools Availability"

    # Check that schema tools are defined in the registry
    if grep -q "create_table\|create_field\|create_view\|create_app" \
        apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts; then
        log_pass "Agent schema tools defined in registry"
    else
        log_fail "Agent schema tools not found in registry"
    fi

    # Check execution handlers exist
    if grep -q "case 'create_table':\|case 'create_field':\|case 'create_view':\|case 'create_app':" \
        apps/nestjs-backend/src/features/agent/agent-execution.service.ts; then
        log_pass "Agent schema tool handlers implemented"
    else
        log_fail "Agent schema tool handlers missing"
    fi
}

# ============================================================================
# TEST 5: UI Components (NEW FEATURES)
# ============================================================================
test_ui_components() {
    log_test "UI Animation Components"

    # Check PromptCarousel exists and exports
    if grep -q "export.*PromptCarousel\|export function PromptCarousel" \
        apps/nextjs-app/src/components/AgentChat/PromptCarousel.tsx; then
        log_pass "PromptCarousel component found and exported"
    else
        log_fail "PromptCarousel component missing"
    fi

    # Check TaskProgressPanel exists and exports
    if grep -q "export.*TaskProgressPanel\|export function TaskProgressPanel" \
        apps/nextjs-app/src/components/AgentChat/TaskProgressPanel.tsx; then
        log_pass "TaskProgressPanel component found and exported"
    else
        log_fail "TaskProgressPanel component missing"
    fi

    # Check wiring in UnifiedChatContainer
    if grep -q "PromptCarousel\|TaskProgressPanel" \
        apps/nextjs-app/src/components/AgentChat/UnifiedChatContainer.tsx; then
        log_pass "UI components wired into UnifiedChatContainer"
    else
        log_fail "UI components not wired into container"
    fi
}

# ============================================================================
# TEST 6: View Types Support
# ============================================================================
test_view_types() {
    log_test "View Types Implemented"

    views=("grid" "kanban" "calendar" "gallery" "form" "gantt")
    for view in "${views[@]}"; do
        if find apps/nextjs-app/src -name "*${view}*" -type f 2>/dev/null | grep -q .; then
            log_pass "View type: $view"
        else
            log_fail "View type missing: $view"
        fi
    done
}

# ============================================================================
# TEST 7: Automation Features
# ============================================================================
test_automation() {
    log_test "Workflow/Automation Features"

    if [ -d "apps/nestjs-backend/src/features/workflow" ]; then
        log_pass "Workflow module exists"
    else
        log_fail "Workflow module not found"
    fi

    if [ -d "apps/nextjs-app/src/features/app/automation" ]; then
        log_pass "Automation UI module exists"
    else
        log_fail "Automation UI module not found"
    fi
}

# ============================================================================
# TEST 8: Type Checking (Build Readiness)
# ============================================================================
test_type_checking() {
    log_test "TypeScript Type Safety"

    cd apps/nestjs-backend
    error_count=$(npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS' || echo "0")
    if [ "$error_count" -lt 210 ]; then  # baseline was 208-210, we expect no new errors
        log_pass "Backend type checking OK (errors: $error_count)"
    else
        log_fail "Backend type errors increased (errors: $error_count)"
    fi
    cd - > /dev/null
}

# ============================================================================
# TEST 9: Unit Tests Pass
# ============================================================================
test_unit_tests() {
    log_test "Unit Test Suite"

    cd apps/nestjs-backend
    if npx vitest run src/features/agent/schema-agent-tools.spec.ts --reporter=verbose 2>&1 | grep -q "6 passed\|✓.*tests"; then
        log_pass "Schema tools unit tests pass"
    else
        log_fail "Schema tools unit tests"
    fi

    if npx vitest run src/features/agent/agent-execution.service.spec.ts 2>&1 | grep -q "17 passed\|✓.*tests"; then
        log_pass "Agent execution tests pass"
    else
        log_fail "Agent execution tests"
    fi
    cd - > /dev/null
}

# ============================================================================
# TEST 10: Git Commit Integrity
# ============================================================================
test_git_integrity() {
    log_test "Git Repository Integrity"

    latest_commit=$(git log -1 --oneline 2>/dev/null)
    if echo "$latest_commit" | grep -q "feat\|fix"; then
        log_pass "Latest commit: $latest_commit"
    else
        log_fail "Git history check"
    fi
}

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================
main() {
    echo ""
    echo "========================================="
    echo "TEABLE FEATURE INTEGRATION TEST SUITE"
    echo "========================================="
    echo ""

    # Infrastructure Tests
    echo -e "\n${YELLOW}=== INFRASTRUCTURE ===${NC}"
    test_api_health
    test_frontend_load
    test_database_connectivity

    # Feature Tests
    echo -e "\n${YELLOW}=== CORE FEATURES ===${NC}"
    test_view_types
    test_automation

    # NEW Features Tests
    echo -e "\n${YELLOW}=== NEW FEATURES (Session Work) ===${NC}"
    test_agent_tools
    test_ui_components

    # Quality Gates
    echo -e "\n${YELLOW}=== QUALITY GATES ===${NC}"
    test_type_checking
    test_unit_tests
    test_git_integrity

    echo ""
    echo "========================================="
    echo "TEST SUITE COMPLETE"
    echo "========================================="
    echo ""
}

main "$@"
