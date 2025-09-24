#!/bin/bash

# API Integration Tests Runner
# This script runs the API integration tests with proper environment setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"

echo -e "${BLUE}🚀 Starting API Integration Tests${NC}"
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

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js version: ${NODE_VERSION}${NC}"

# Set up environment variables for tests
print_section "Setting Up Test Environment"

export NODE_ENV=test
export AWS_REGION=us-east-1
export LOG_LEVEL=error
export MOCK_EXTERNAL_SERVICES=true

# Mock AWS services
export EVENT_BUS_NAME=test-event-bus
export SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/test-queue
export DLQ_URL=https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq
export STATUS_TABLE_NAME=test-agent-status
export METRICS_NAMESPACE=Test/CurriculumAlignment/Agents

# Mock authentication
export COGNITO_USER_POOL_ID=us-east-1_testpool
export COGNITO_CLIENT_ID=test-client-id

# Mock LLM configuration
export DEFAULT_LLM_MODEL=gpt-4
export OPENAI_API_KEY=test-openai-key
export ANTHROPIC_API_KEY=test-anthropic-key

# Mock cost tracking
export ENABLE_COST_TRACKING=true
export COST_ALERT_THRESHOLD=100

# Mock monitoring
export ENABLE_PERFORMANCE_MONITORING=true
export HEARTBEAT_INTERVAL_MS=60000

echo -e "${GREEN}✅ Environment variables set${NC}"

# Install dependencies if needed
print_section "Installing Dependencies"

cd "$SCRIPT_DIR"

if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}📦 Installing test dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Parse command line arguments
TEST_PATTERN=""
COVERAGE=false
WATCH=false
VERBOSE=false
CI=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --ci)
            CI=true
            COVERAGE=true
            shift
            ;;
        --pattern)
            TEST_PATTERN="$2"
            shift 2
            ;;
        --health)
            TEST_PATTERN="Health API"
            shift
            ;;
        --auth)
            TEST_PATTERN="Authentication API"
            shift
            ;;
        --programs)
            TEST_PATTERN="Programs API"
            shift
            ;;
        --documents)
            TEST_PATTERN="Documents API"
            shift
            ;;
        --analysis)
            TEST_PATTERN="Analysis API"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --coverage     Generate coverage report"
            echo "  --watch        Watch for file changes"
            echo "  --verbose      Verbose output"
            echo "  --ci           CI mode (coverage + no watch)"
            echo "  --pattern      Test pattern to match"
            echo "  --health       Run only health endpoint tests"
            echo "  --auth         Run only authentication tests"
            echo "  --programs     Run only programs API tests"
            echo "  --documents    Run only documents API tests"
            echo "  --analysis     Run only analysis API tests"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Build Jest command
JEST_CMD="npx jest"

if [ "$CI" = true ]; then
    JEST_CMD="$JEST_CMD --ci --watchAll=false"
elif [ "$WATCH" = true ]; then
    JEST_CMD="$JEST_CMD --watch"
fi

if [ "$COVERAGE" = true ]; then
    JEST_CMD="$JEST_CMD --coverage"
fi

if [ "$VERBOSE" = true ]; then
    JEST_CMD="$JEST_CMD --verbose"
fi

if [ -n "$TEST_PATTERN" ]; then
    JEST_CMD="$JEST_CMD --testNamePattern=\"$TEST_PATTERN\""
fi

# Run the tests
print_section "Running API Integration Tests"

echo -e "${BLUE}Command: ${JEST_CMD}${NC}"
echo ""

# Create coverage directory if it doesn't exist
if [ "$COVERAGE" = true ]; then
    mkdir -p coverage
fi

# Run Jest with error handling
if eval "$JEST_CMD"; then
    echo ""
    echo -e "${GREEN}✅ All tests passed successfully!${NC}"
    
    if [ "$COVERAGE" = true ]; then
        echo ""
        echo -e "${BLUE}📊 Coverage report generated in: ${SCRIPT_DIR}/coverage${NC}"
        
        if [ -f "coverage/lcov-report/index.html" ]; then
            echo -e "${BLUE}📈 HTML coverage report: ${SCRIPT_DIR}/coverage/lcov-report/index.html${NC}"
        fi
    fi
    
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi