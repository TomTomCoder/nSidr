# Teable universal launcher for Windows (PowerShell)
# Usage: .\launch.ps1 [-ForceDock] [-ForceNative] [-Help]

param(
    [switch]$ForceDocker,
    [switch]$ForceNative,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$REPO_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

# Colors
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$BLUE = "`e[36m"
$RED = "`e[31m"
$NC = "`e[0m"

# ============================================================================
# HELP
# ============================================================================

if ($Help) {
    Write-Host "Teable Universal Launcher (Windows)"
    Write-Host ""
    Write-Host "Usage: .\launch.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -ForceDocker    Force full Docker stack"
    Write-Host "  -ForceNative    Force native app (requires PostgreSQL + Redis)"
    Write-Host "  -Help           Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\launch.ps1                 # Auto-detect and launch"
    Write-Host "  .\launch.ps1 -ForceDocker    # Always use Docker"
    Write-Host ""
    exit 0
}

# ============================================================================
# DETECTION
# ============================================================================

function Test-Command($Name) {
    $null = Get-Command $Name -ErrorAction SilentlyContinue
    if ($?) { return "yes" } else { return "no" }
}

function Test-Postgres {
    try {
        $null = & "pg_isready" -h localhost -p 5432 -q 2>$null
        if ($?) { return "yes" }
    } catch {}
    return "no"
}

function Test-Redis {
    try {
        $null = & "redis-cli" ping 2>$null
        if ($?) { return "yes" }
    } catch {}
    return "no"
}

function Print-Status([string]$Label, [string]$Status) {
    if ($Status -eq "yes" -or $Status -eq "✓") {
        Write-Host "$GREEN✓$NC $Label" -NoNewline
        Write-Host ""
    }
    else {
        Write-Host "$YELLOW✗$NC $Label"
    }
}

Write-Host "$BLUE━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$NC"
Write-Host "$BLUE Teable Universal Launcher (Windows)$NC"
Write-Host "$BLUE━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$NC"
Write-Host ""

$HAS_PNPM = Test-Command "pnpm"
$HAS_DOCKER = Test-Command "docker"
$HAS_DOCKER_COMPOSE = Test-Command "docker-compose"
$HAS_PG = Test-Postgres
$HAS_REDIS = Test-Redis

Write-Host "System Detection:"
Print-Status "Windows (WSL2 recommended)" "yes"
Print-Status "pnpm" $HAS_PNPM
Print-Status "Docker" $HAS_DOCKER
Print-Status "Docker Compose" $HAS_DOCKER_COMPOSE
Print-Status "PostgreSQL (localhost:5432)" $HAS_PG
Print-Status "Redis (localhost:6379)" $HAS_REDIS
Write-Host ""

# ============================================================================
# OPTION SELECTION
# ============================================================================

$HasNative = $false
$HasServices = $false
$HasDocker = $false

if ($HAS_PNPM -eq "yes" -and ($ForceNative -or ($HAS_PG -eq "yes" -and $HAS_REDIS -eq "yes"))) {
    $HasNative = $true
}

if ($HAS_PNPM -eq "yes" -and $HAS_DOCKER -eq "yes" -and $HAS_DOCKER_COMPOSE -eq "yes") {
    $HasServices = $true
}

if ($HAS_DOCKER -eq "yes" -and $HAS_DOCKER_COMPOSE -eq "yes") {
    $HasDocker = $true
}

# Select option
$Selected = "none"
if ($ForceDocker -and $HasDocker) {
    $Selected = "docker"
}
elseif ($HasNative) {
    $Selected = "native"
}
elseif ($HasServices) {
    $Selected = "services"
}
elseif ($HasDocker) {
    $Selected = "docker"
}

# ============================================================================
# LAUNCH
# ============================================================================

switch ($Selected) {
    "native" {
        Write-Host "$GREEN✓ Native Launch Available$NC (pnpm + PostgreSQL + Redis)"
        Write-Host ""
        Write-Host "Fastest option - runs everything natively."
        Write-Host "Requires PostgreSQL + Redis running on localhost."
        Write-Host ""
        Write-Host "Requirements:"
        Write-Host "  • PostgreSQL: https://www.postgresql.org/download/windows/"
        Write-Host "  • Redis: https://github.com/microsoftarchive/redis/releases"
        Write-Host ""
        Set-Location $REPO_ROOT
        & pnpm start:local
        break
    }

    "services" {
        Write-Host "$GREEN✓ Docker Services Available$NC (pnpm + Docker Compose)"
        Write-Host ""
        Write-Host "Docker handles PostgreSQL + Redis, app runs natively."
        Write-Host "Best compromise between setup complexity and speed."
        Write-Host ""
        Set-Location $REPO_ROOT
        Write-Host "Starting Docker services..."
        & pnpm start:services
        Start-Sleep -Seconds 2
        Write-Host "$GREEN✓ Services started$NC"
        Write-Host ""
        Write-Host "Starting application..."
        & pnpm start:local
        break
    }

    "docker" {
        Write-Host "$GREEN✓ Full Docker Stack Available$NC"
        Write-Host ""
        Write-Host "Everything runs in Docker - no local setup required."
        Write-Host "Slower than native but most portable."
        Write-Host ""
        Set-Location $REPO_ROOT
        Write-Host "Building Docker image..."
        & pnpm start:docker:build
        Write-Host ""
        Write-Host "Starting containers..."
        & pnpm start:docker
        Write-Host ""
        Write-Host "$GREEN✓ Teable is running!$NC"
        Write-Host ""
        Write-Host "Web UI:  http://localhost:3000"
        Write-Host "API:     http://localhost:3002"
        Write-Host ""
        Write-Host "To stop: pnpm stop:docker"
        break
    }

    default {
        Write-Host "$RED✗ No launch option available$NC"
        Write-Host ""
        Write-Host "You need one of:"
        Write-Host "  1. PostgreSQL + Redis (native option)"
        Write-Host "  2. Docker Desktop (all options)"
        Write-Host ""
        Write-Host "Recommended: Install Docker Desktop from https://docker.com"
        Write-Host "Then run: .\launch.ps1"
        Write-Host ""
        exit 1
    }
}
