#!/bin/bash

# End-to-End Tests Runner
# This script runs the E2E tests with proper environment setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"

echo -e "${BLUE}🎭 Starting End-to-End Tests${NC}"
echo -e "${BLUE}Project Root: ${PROJECT_ROOT}${NC}"
echo -e "${BLUE}Test Directory: ${SCRIPT_DIR}${NC}"

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_section "Checking Prerequisites"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npx; then
    echo -e "${RED}❌ npx is not available${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js version: ${NODE_VERSION}${NC}"

# Set up environment variables for E2E tests
print_section "Setting Up E2E Test Environment"

export NODE_ENV=test
export E2E_BASE_URL=${E2E_BASE_URL:-http://localhost:3000}
export E2E_API_URL=${E2E_API_URL:-http://localhost:3001}
export CI=${CI:-false}

# Test data configuration
export TEST_USER_EMAIL=${TEST_USER_EMAIL:-test.admin@ceu.edu}
export TEST_USER_PASSWORD=${TEST_USER_PASSWORD:-TestAdmin123!}
export TEST_PROGRAM_ID=${TEST_PROGRAM_ID:-test-cs-bachelor}

echo -e "${GREEN}✅ Environment variables set${NC}"
echo -e "${BLUE}   Base URL: ${E2E_BASE_URL}${NC}"
echo -e "${BLUE}   API URL: ${E2E_API_URL}${NC}"
echo -e "${BLUE}   CI Mode: ${CI}${NC}"

# Install dependencies
print_section "Installing Dependencies"

cd "$SCRIPT_DIR"

if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}📦 Installing E2E test dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/@playwright/test" ]; then
    echo -e "${YELLOW}🌐 Installing Playwright browsers...${NC}"
    npx playwright install
    npx playwright install-deps
else
    echo -e "${GREEN}✅ Playwright browsers available${NC}"
fi

# Parse command line arguments
HEADED=false
DEBUG=false
UI=false
TRACE=false
BROWSER="chromium"
TEST_PATTERN=""
WORKERS=""
RETRIES=""
TIMEOUT=""
UPDATE_SNAPSHOTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            HEADED=true
            shift
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        --ui)
            UI=true
            shift
            ;;
        --trace)
            TRACE=true
            shift
            ;;
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --pattern)
            TEST_PATTERN="$2"
            shift 2
            ;;
        --workers)
            WORKERS="$2"
            shift 2
            ;;
        --retries)
            RETRIES="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --update-snapshots)
            UPDATE_SNAPSHOTS=true
            shift
            ;;
        --smoke)
            TEST_PATTERN="@smoke"
            shift
            ;;
        --regression)
            TEST_PATTERN="@regression"
            shift
            ;;
        --auth)
            TEST_PATTERN="Authentication"
            shift
            ;;
        --programs)
            TEST_PATTERN="Program Management"
            shift
            ;;
        --documents)
            TEST_PATTERN="Document Upload"
            shift
            ;;
        --analysis)
            TEST_PATTERN="Analysis Workflow"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --headed          Run tests in headed mode (show browser)"
            echo "  --debug           Run tests in debug mode"
            echo "  --ui              Run tests with Playwright UI"
            echo "  --trace           Record traces for debugging"
            echo "  --browser <name>  Run tests on specific browser (chromium, firefox, webkit)"
            echo "  --pattern <text>  Run tests matching pattern"
            echo "  --workers <num>   Number of parallel workers"
            echo "  --retries <num>   Number of retries on failure"
            echo "  --timeout <ms>    Test timeout in milliseconds"
            echo "  --update-snapshots Update visual comparison snapshots"
            echo ""
            echo "Test Categories:"
            echo "  --smoke          Run smoke tests only"
            echo "  --regression     Run regression tests only"
            echo "  --auth           Run authentication tests only"
            echo "  --programs       Run program management tests only"
            echo "  --documents      Run document upload tests only"
            echo "  --analysis       Run analysis workflow tests only"
            echo ""
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate application is running (unless in CI)
if [ "$CI" != "true" ]; then
    print_section "Checking Application Status"
    
    echo -e "${BLUE}🔍 Checking if application is running at ${E2E_BASE_URL}...${NC}"
    
    # Try to reach the application
    if curl -s --fail --connect-timeout 5 "$E2E_BASE_URL" > /dev/null; then
        echo -e "${GREEN}✅ Application is responding${NC}"
    else
        echo -e "${YELLOW}⚠️ Application not responding, tests may fail${NC}"
        echo -e "${YELLOW}   Make sure to run 'npm run dev' in the project root${NC}"
    fi
    
    # Check API if configured
    if [ "$E2E_API_URL" != "$E2E_BASE_URL" ]; then
        echo -e "${BLUE}🔍 Checking API at ${E2E_API_URL}...${NC}"
        if curl -s --fail --connect-timeout 5 "${E2E_API_URL}/health" > /dev/null; then
            echo -e "${GREEN}✅ API is responding${NC}"
        else
            echo -e "${YELLOW}⚠️ API not responding${NC}"
        fi
    fi
fi

# Build Playwright command
PLAYWRIGHT_CMD="npx playwright test"

if [ "$HEADED" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --headed"
fi

if [ "$DEBUG" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --debug"
fi

if [ "$UI" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --ui"
fi

if [ "$TRACE" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --trace on"
fi

if [ -n "$BROWSER" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --project=$BROWSER"
fi

if [ -n "$TEST_PATTERN" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --grep=\"$TEST_PATTERN\""
fi

if [ -n "$WORKERS" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --workers=$WORKERS"
fi

if [ -n "$RETRIES" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --retries=$RETRIES"
fi

if [ -n "$TIMEOUT" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --timeout=$TIMEOUT"
fi

if [ "$UPDATE_SNAPSHOTS" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --update-snapshots"
fi

# Add reporter configuration
if [ "$CI" = "true" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --reporter=github"
else
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --reporter=html"
fi

# Run the tests
print_section "Running End-to-End Tests"

echo -e "${BLUE}Command: ${PLAYWRIGHT_CMD}${NC}"
echo ""

# Create results directory
mkdir -p test-results playwright-report

# Run Playwright with error handling
if eval "$PLAYWRIGHT_CMD"; then
    echo ""
    echo -e "${GREEN}✅ All E2E tests passed successfully!${NC}"
    
    # Show report location
    if [ "$CI" != "true" ] && [ -d "playwright-report" ]; then
        echo ""
        echo -e "${BLUE}📊 Test report generated: ${SCRIPT_DIR}/playwright-report/index.html${NC}"
        
        # Offer to open report
        if command_exists open && [ "$UI" != "true" ]; then
            read -p "Open test report in browser? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                open "playwright-report/index.html"
            fi
        fi
    fi
    
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some E2E tests failed${NC}"
    
    # Show debugging information
    if [ -d "test-results" ]; then
        echo -e "${BLUE}🔍 Test artifacts available in: ${SCRIPT_DIR}/test-results${NC}"
    fi
    
    if [ -d "playwright-report" ]; then
        echo -e "${BLUE}📊 Detailed report: ${SCRIPT_DIR}/playwright-report/index.html${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}💡 Debugging tips:${NC}"
    echo -e "${YELLOW}   - Run with --headed to see browser interactions${NC}"
    echo -e "${YELLOW}   - Use --debug to step through tests${NC}"
    echo -e "${YELLOW}   - Check --trace for detailed execution traces${NC}"
    echo -e "${YELLOW}   - Review screenshots and videos in test-results/${NC}"
    
    exit 1
fi