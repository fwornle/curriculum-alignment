#!/bin/bash

# Load Testing Suite Runner
# Comprehensive k6 load testing orchestration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K6_SCRIPTS_DIR="$SCRIPT_DIR/k6-scripts"
RESULTS_DIR="$SCRIPT_DIR/results"
ENVIRONMENT="${ENVIRONMENT:-test}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Test configuration
SMOKE_VUS="${SMOKE_VUS:-2}"
LOAD_VUS="${LOAD_VUS:-50}"
STRESS_VUS="${STRESS_VUS:-100}"
SPIKE_VUS="${SPIKE_VUS:-150}"
VOLUME_VUS="${VOLUME_VUS:-40}"
SOAK_VUS="${SOAK_VUS:-15}"

# Ensure k6 is installed
check_k6() {
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}❌ k6 is not installed. Please install k6 first.${NC}"
        echo "Visit: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    echo -e "${GREEN}✅ k6 is available: $(k6 version | head -n1)${NC}"
}

# Create results directory
setup_results_dir() {
    mkdir -p "$RESULTS_DIR"
    rm -f "$RESULTS_DIR"/*.json "$RESULTS_DIR"/*.html 2>/dev/null || true
    echo -e "${BLUE}📁 Results directory prepared: $RESULTS_DIR${NC}"
}

# Function to run a specific test
run_test() {
    local test_name="$1"
    local script_file="$2"
    local description="$3"
    local vus="$4"
    
    echo ""
    echo -e "${CYAN}🚀 Starting $test_name${NC}"
    echo -e "${BLUE}📋 $description${NC}"
    echo -e "${YELLOW}🎯 Target: $BASE_URL${NC}"
    echo -e "${YELLOW}👥 VUs: $vus${NC}"
    echo ""
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local results_file="$RESULTS_DIR/${test_name,,}_${timestamp}.json"
    local summary_file="$RESULTS_DIR/${test_name,,}_${timestamp}_summary.json"
    
    # Set environment variables for k6
    export K6_VUS="$vus"
    export BASE_URL="$BASE_URL"
    export ENVIRONMENT="$ENVIRONMENT"
    
    # Run the test with JSON output and summary
    if k6 run \
        --out json="$results_file" \
        --summary-export="$summary_file" \
        "$K6_SCRIPTS_DIR/$script_file"; then
        
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
        echo -e "${BLUE}📊 Results saved to: $(basename "$results_file")${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Function to run smoke test
run_smoke_test() {
    run_test "Smoke Test" "smoke-test.js" "Basic functionality verification with minimal load" "$SMOKE_VUS"
}

# Function to run load test
run_load_test() {
    run_test "Load Test" "api-load-test.js" "Comprehensive API load testing under expected traffic" "$LOAD_VUS"
}

# Function to run stress test
run_stress_test() {
    run_test "Stress Test" "stress-test.js" "System behavior under extreme load conditions" "$STRESS_VUS"
}

# Function to run spike test
run_spike_test() {
    run_test "Spike Test" "spike-test.js" "System response to sudden traffic spikes" "$SPIKE_VUS"
}

# Function to run volume test
run_volume_test() {
    run_test "Volume Test" "volume-test.js" "High data volume processing capabilities" "$VOLUME_VUS"
}

# Function to run soak test
run_soak_test() {
    run_test "Soak Test" "soak-test.js" "Extended stability and endurance testing (4+ hours)" "$SOAK_VUS"
}

# Function to run analysis-specific load test
run_analysis_load_test() {
    run_test "Analysis Load Test" "analysis-load-test.js" "Analysis workflow performance under load" "$LOAD_VUS"
}

# Function to show usage
show_usage() {
    echo -e "${PURPLE}Load Testing Suite - k6 Test Runner${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 [test_type] [options]"
    echo ""
    echo -e "${YELLOW}Test Types:${NC}"
    echo "  smoke      - Quick functionality check (2 VUs, ~2 minutes)"
    echo "  load       - Standard load test (50 VUs, ~20 minutes)"
    echo "  stress     - Stress test (100 VUs, ~15 minutes)" 
    echo "  spike      - Traffic spike test (150 VUs, ~15 minutes)"
    echo "  volume     - High data volume test (40 VUs, ~55 minutes)"
    echo "  soak       - Extended stability test (15 VUs, 4+ hours)"
    echo "  analysis   - Analysis workflow load test (50 VUs, ~20 minutes)"
    echo "  all        - Run all tests except soak"
    echo "  suite      - Run recommended test suite (smoke → load → stress)"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  --base-url URL     Set base URL (default: http://localhost:3000)"
    echo "  --environment ENV  Set environment (default: test)"
    echo "  --results-only     Only generate results, skip test execution"
    echo "  --clean           Clean results directory before running"
    echo "  --help            Show this help message"
    echo ""
    echo -e "${YELLOW}Environment Variables:${NC}"
    echo "  BASE_URL          Target system base URL"
    echo "  ENVIRONMENT       Test environment (test, staging, prod)"
    echo "  SMOKE_VUS         Virtual users for smoke test (default: 2)"
    echo "  LOAD_VUS          Virtual users for load test (default: 50)"
    echo "  STRESS_VUS        Virtual users for stress test (default: 100)"
    echo "  SPIKE_VUS         Virtual users for spike test (default: 150)"
    echo "  VOLUME_VUS        Virtual users for volume test (default: 40)"
    echo "  SOAK_VUS          Virtual users for soak test (default: 15)"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 smoke                              # Quick smoke test"
    echo "  $0 load --base-url http://staging     # Load test against staging"
    echo "  $0 suite --environment production     # Full test suite"
    echo "  BASE_URL=http://prod $0 stress        # Stress test with env var"
}

# Function to generate summary report
generate_summary_report() {
    echo ""
    echo -e "${PURPLE}📊 Generating Test Summary Report${NC}"
    
    local report_file="$RESULTS_DIR/load_test_summary_$(date +"%Y%m%d_%H%M%S").md"
    
    cat > "$report_file" << EOF
# Load Testing Summary Report

**Generated:** $(date)
**Target System:** $BASE_URL
**Environment:** $ENVIRONMENT

## Test Results Overview

EOF
    
    # Process JSON summary files if they exist
    for summary_file in "$RESULTS_DIR"/*_summary.json; do
        if [[ -f "$summary_file" ]]; then
            local test_name=$(basename "$summary_file" _summary.json)
            echo "### $test_name" >> "$report_file"
            echo "" >> "$report_file"
            
            # Extract key metrics using jq if available
            if command -v jq &> /dev/null && [[ -s "$summary_file" ]]; then
                local avg_duration=$(jq -r '.metrics.http_req_duration.avg // "N/A"' "$summary_file")
                local p95_duration=$(jq -r '.metrics.http_req_duration.p95 // "N/A"' "$summary_file")
                local error_rate=$(jq -r '.metrics.http_req_failed.rate // "N/A"' "$summary_file")
                local total_requests=$(jq -r '.metrics.http_reqs.count // "N/A"' "$summary_file")
                
                cat >> "$report_file" << EOF
- **Average Response Time:** ${avg_duration}ms
- **95th Percentile:** ${p95_duration}ms  
- **Error Rate:** ${error_rate}
- **Total Requests:** ${total_requests}

EOF
            else
                echo "- Summary data not available" >> "$report_file"
                echo "" >> "$report_file"
            fi
        fi
    done
    
    cat >> "$report_file" << EOF

## Test Files Generated

EOF
    
    # List all result files
    for result_file in "$RESULTS_DIR"/*.json; do
        if [[ -f "$result_file" ]]; then
            echo "- $(basename "$result_file")" >> "$report_file"
        fi
    done
    
    echo "" >> "$report_file"
    echo "---" >> "$report_file"
    echo "*Report generated by k6 Load Testing Suite*" >> "$report_file"
    
    echo -e "${GREEN}✅ Summary report generated: $(basename "$report_file")${NC}"
}

# Main execution
main() {
    echo -e "${PURPLE}🎯 k6 Load Testing Suite${NC}"
    echo -e "${BLUE}Target: $BASE_URL${NC}"
    echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
    echo ""
    
    # Parse command line arguments
    local test_type=""
    local clean_results=false
    local results_only=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --base-url)
                BASE_URL="$2"
                shift 2
                ;;
            --environment)
                ENVIRONMENT="$2" 
                shift 2
                ;;
            --clean)
                clean_results=true
                shift
                ;;
            --results-only)
                results_only=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            smoke|load|stress|spike|volume|soak|analysis|all|suite)
                test_type="$1"
                shift
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Check prerequisites
    check_k6
    
    # Setup results directory
    if [[ "$clean_results" == true ]]; then
        rm -rf "$RESULTS_DIR"
    fi
    setup_results_dir
    
    # Handle results-only mode
    if [[ "$results_only" == true ]]; then
        generate_summary_report
        exit 0
    fi
    
    # Execute tests based on type
    case "$test_type" in
        smoke)
            run_smoke_test
            ;;
        load)
            run_load_test
            ;;
        stress) 
            run_stress_test
            ;;
        spike)
            run_spike_test
            ;;
        volume)
            run_volume_test
            ;;
        soak)
            echo -e "${YELLOW}⚠️  Warning: Soak test will run for 4+ hours${NC}"
            echo -e "${YELLOW}Press Ctrl+C within 10 seconds to cancel...${NC}"
            sleep 10
            run_soak_test
            ;;
        analysis)
            run_analysis_load_test
            ;;
        all)
            echo -e "${CYAN}🎯 Running All Tests (except soak)${NC}"
            run_smoke_test && \
            run_load_test && \
            run_stress_test && \
            run_spike_test && \
            run_volume_test && \
            run_analysis_load_test
            ;;
        suite)
            echo -e "${CYAN}🎯 Running Recommended Test Suite${NC}"
            run_smoke_test && \
            run_load_test && \
            run_stress_test
            ;;
        "")
            echo -e "${YELLOW}No test type specified. Running smoke test...${NC}"
            run_smoke_test
            ;;
        *)
            echo -e "${RED}❌ Invalid test type: $test_type${NC}"
            show_usage
            exit 1
            ;;
    esac
    
    # Generate summary report
    generate_summary_report
    
    echo ""
    echo -e "${GREEN}🎉 Load testing completed!${NC}"
    echo -e "${BLUE}📂 Results available in: $RESULTS_DIR${NC}"
    echo ""
}

# Run main function with all arguments
main "$@"