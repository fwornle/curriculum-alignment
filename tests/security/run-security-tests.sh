#!/bin/bash

# Security Testing Suite Runner
# Comprehensive security vulnerability testing

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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
ENVIRONMENT="${ENVIRONMENT:-test}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Security test configuration
PARALLEL_TESTS="${PARALLEL_TESTS:-false}"
COVERAGE_THRESHOLD="${COVERAGE_THRESHOLD:-70}"
MAX_WORKERS="${MAX_WORKERS:-4}"

# Ensure required tools are available
check_dependencies() {
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v jest &> /dev/null && ! npx jest --version &> /dev/null; then
        missing_deps+=("Jest")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing dependencies: ${missing_deps[*]}${NC}"
        echo "Please install the missing dependencies and try again."
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies are available${NC}"
}

# Create results directory
setup_results_dir() {
    mkdir -p "$RESULTS_DIR"
    rm -f "$RESULTS_DIR"/*.json "$RESULTS_DIR"/*.html "$RESULTS_DIR"/*.xml 2>/dev/null || true
    echo -e "${BLUE}📁 Results directory prepared: $RESULTS_DIR${NC}"
}

# Verify test environment safety
verify_test_environment() {
    echo -e "${YELLOW}🔒 Verifying test environment safety...${NC}"
    
    # Check if running against production
    if [[ "$BASE_URL" =~ (production|prod) ]] || [[ "$ENVIRONMENT" == "production" ]]; then
        echo -e "${RED}🚨 CRITICAL: Security tests cannot run against production!${NC}"
        echo -e "${RED}🚨 Target URL: $BASE_URL${NC}"
        echo -e "${RED}🚨 Environment: $ENVIRONMENT${NC}"
        exit 1
    fi
    
    # Check if running against live system
    if [[ "$BASE_URL" =~ ^https?://[^/]*\.(com|org|net|edu|gov) ]]; then
        echo -e "${YELLOW}⚠️  Warning: Running against external domain: $BASE_URL${NC}"
        echo -e "${YELLOW}⚠️  Are you sure this is a test environment? (y/N)${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo "Aborting for safety."
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Test environment verified as safe${NC}"
}

# Run specific security test suite
run_security_test_suite() {
    local test_suite="$1"
    local description="$2"
    
    echo ""
    echo -e "${CYAN}🔒 Running $test_suite${NC}"
    echo -e "${BLUE}📋 $description${NC}"
    echo -e "${YELLOW}🎯 Target: $BASE_URL${NC}"
    echo ""
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local results_file="$RESULTS_DIR/security_${test_suite,,}_${timestamp}.json"
    local coverage_file="$RESULTS_DIR/coverage_${test_suite,,}_${timestamp}.html"
    
    # Set environment variables for security tests
    export NODE_ENV=test
    export TEST_BASE_URL="$BASE_URL"
    export ENVIRONMENT="$ENVIRONMENT"
    export DISABLE_REAL_AUTH=true
    export MOCK_EXTERNAL_APIS=true
    
    # Run the security test suite
    local jest_config="$SCRIPT_DIR/jest.config.js"
    local test_pattern="$SCRIPT_DIR/${test_suite,,}.security.test.ts"
    
    if npx jest --config="$jest_config" \
        --testPathPattern="$test_pattern" \
        --outputFile="$results_file" \
        --collectCoverage \
        --coverageDirectory="$(dirname "$coverage_file")" \
        --coverageReporters=html,json,text \
        --coverageThreshold="{\"global\":{\"branches\":${COVERAGE_THRESHOLD},\"functions\":${COVERAGE_THRESHOLD},\"lines\":${COVERAGE_THRESHOLD},\"statements\":${COVERAGE_THRESHOLD}}}" \
        --verbose \
        --forceExit \
        --detectOpenHandles; then
        
        echo -e "${GREEN}✅ $test_suite completed successfully${NC}"
        echo -e "${BLUE}📊 Results saved to: $(basename "$results_file")${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_suite failed${NC}"
        return 1
    fi
}

# Run all security test suites
run_all_security_tests() {
    local test_suites=(
        "Authentication:Authentication and session management security tests"
        "Authorization:Role-based access control and permission security tests"
        "Injection:SQL injection, NoSQL injection, and command injection tests"
        "Input-Validation:Input validation, XSS, and CSRF protection tests"
        "API-Security:API-specific security vulnerabilities and protections"
    )
    
    local passed_tests=0
    local failed_tests=0
    local total_tests=${#test_suites[@]}
    
    echo -e "${PURPLE}🔒 Running Complete Security Test Suite${NC}"
    echo -e "${BLUE}📊 Total test suites: $total_tests${NC}"
    echo ""
    
    for test_suite_info in "${test_suites[@]}"; do
        IFS=':' read -r test_suite description <<< "$test_suite_info"
        
        if run_security_test_suite "$test_suite" "$description"; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
        
        # Brief pause between test suites
        sleep 2
    done
    
    echo ""
    echo -e "${PURPLE}🔒 Security Test Suite Summary${NC}"
    echo -e "${GREEN}✅ Passed: $passed_tests${NC}"
    echo -e "${RED}❌ Failed: $failed_tests${NC}"
    echo -e "${BLUE}📊 Total: $total_tests${NC}"
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 All security tests passed!${NC}"
        return 0
    else
        echo -e "${RED}🚨 Some security tests failed!${NC}"
        return 1
    fi
}

# Generate security assessment report
generate_security_report() {
    echo ""
    echo -e "${PURPLE}📊 Generating Security Assessment Report${NC}"
    
    local report_file="$RESULTS_DIR/security_assessment_$(date +"%Y%m%d_%H%M%S").md"
    
    cat > "$report_file" << EOF
# Security Assessment Report

**Generated:** $(date)
**Target System:** $BASE_URL  
**Environment:** $ENVIRONMENT
**Test Framework:** Jest with Security Extensions

## Executive Summary

This report contains the results of comprehensive security testing performed against the Curriculum Alignment System. The tests cover the OWASP Top 10 vulnerabilities and additional security concerns specific to multi-agent AI systems.

## Test Coverage Areas

### 1. Authentication Security
- JWT token validation and expiration
- Password policy enforcement  
- Multi-factor authentication
- Session management
- Brute force protection

### 2. Authorization Security  
- Role-based access control (RBAC)
- Resource-level permissions
- Privilege escalation prevention
- API key authorization
- Cross-origin resource sharing (CORS)

### 3. Injection Vulnerabilities
- SQL injection protection
- NoSQL injection prevention
- Command injection security
- LDAP injection prevention
- XML/XXE attack protection
- JNDI injection security
- Template injection prevention

### 4. Input Validation Security
- Cross-site scripting (XSS) protection
- CSRF token validation
- File upload security
- Input length and format validation
- Data type validation
- Business logic validation

### 5. API Security
- HTTP method security
- Rate limiting and throttling
- Content type validation
- Response security headers
- API versioning security
- Mass assignment protection

## Test Results Summary

EOF

    # Process test result files if they exist
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    for results_file in "$RESULTS_DIR"/security_*_*.json; do
        if [[ -f "$results_file" ]]; then
            local test_name=$(basename "$results_file" .json)
            echo "### $test_name" >> "$report_file"
            echo "" >> "$report_file"
            
            # Extract basic metrics (would need jq for detailed parsing)
            if command -v jq &> /dev/null && [[ -s "$results_file" ]]; then
                local tests_run=$(jq -r '.numTotalTests // "N/A"' "$results_file")
                local tests_passed=$(jq -r '.numPassedTests // "N/A"' "$results_file")
                local tests_failed=$(jq -r '.numFailedTests // "N/A"' "$results_file")
                
                echo "- **Tests Run:** $tests_run" >> "$report_file"
                echo "- **Tests Passed:** $tests_passed" >> "$report_file" 
                echo "- **Tests Failed:** $tests_failed" >> "$report_file"
                echo "" >> "$report_file"
                
                if [[ "$tests_run" != "N/A" ]]; then
                    total_tests=$((total_tests + tests_run))
                    passed_tests=$((passed_tests + tests_passed))
                    failed_tests=$((failed_tests + tests_failed))
                fi
            else
                echo "- Test results available in JSON format" >> "$report_file"
                echo "" >> "$report_file"
            fi
        fi
    done
    
    cat >> "$report_file" << EOF

## Overall Assessment

- **Total Security Tests:** $total_tests
- **Tests Passed:** $passed_tests  
- **Tests Failed:** $failed_tests
- **Success Rate:** $(( total_tests > 0 ? (passed_tests * 100 / total_tests) : 0 ))%

## Security Recommendations

### High Priority
- Review and address any failed authentication tests
- Ensure all injection vulnerabilities are patched
- Validate input sanitization is working correctly

### Medium Priority  
- Implement comprehensive rate limiting
- Add security response headers
- Review API versioning security

### Low Priority
- Enhance logging for security events
- Consider additional CORS restrictions
- Implement advanced threat detection

## Compliance Status

### OWASP Top 10 2021
- A01:2021 – Broken Access Control: **Testing Coverage Implemented**
- A02:2021 – Cryptographic Failures: **Partial Coverage**
- A03:2021 – Injection: **Comprehensive Testing**
- A04:2021 – Insecure Design: **Architecture Review Needed**
- A05:2021 – Security Misconfiguration: **Testing Coverage Implemented**
- A06:2021 – Vulnerable Components: **Dependency Scanning Recommended**
- A07:2021 – Identification/Authentication Failures: **Comprehensive Testing**
- A08:2021 – Software/Data Integrity Failures: **Partial Coverage**
- A09:2021 – Security Logging/Monitoring Failures: **Additional Testing Needed**
- A10:2021 – Server-Side Request Forgery (SSRF): **Testing Coverage Implemented**

## Next Steps

1. Address any critical vulnerabilities identified in failed tests
2. Implement additional security controls as recommended
3. Schedule regular security testing (monthly recommended)
4. Consider third-party security auditing for critical systems
5. Update security testing as new features are added

## Files Generated

EOF

    # List all generated files
    for file in "$RESULTS_DIR"/*; do
        if [[ -f "$file" ]]; then
            echo "- $(basename "$file")" >> "$report_file"
        fi
    done
    
    echo "" >> "$report_file"
    echo "---" >> "$report_file"
    echo "*Report generated by Security Testing Suite*" >> "$report_file"
    
    echo -e "${GREEN}✅ Security assessment report generated: $(basename "$report_file")${NC}"
}

# Show usage information
show_usage() {
    echo -e "${PURPLE}Security Testing Suite - Comprehensive Vulnerability Testing${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 [test_type] [options]"
    echo ""
    echo -e "${YELLOW}Test Types:${NC}"
    echo "  authentication    - Authentication and session security tests"
    echo "  authorization     - Authorization and access control tests"
    echo "  injection         - Various injection vulnerability tests"
    echo "  input-validation  - Input validation and XSS protection tests"
    echo "  api-security      - API-specific security tests"
    echo "  all               - Run all security test suites"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  --base-url URL         Set target base URL (default: http://localhost:3000)"
    echo "  --environment ENV      Set test environment (default: test)"
    echo "  --parallel             Run tests in parallel (faster but more resource intensive)"
    echo "  --coverage THRESHOLD   Set coverage threshold percentage (default: 70)"
    echo "  --results-only         Generate report from existing results"
    echo "  --clean               Clean results directory before running"
    echo "  --help                Show this help message"
    echo ""
    echo -e "${YELLOW}Environment Variables:${NC}"
    echo "  BASE_URL              Target system base URL"
    echo "  ENVIRONMENT           Test environment (test, staging, dev)"
    echo "  COVERAGE_THRESHOLD    Minimum coverage percentage required"
    echo "  PARALLEL_TESTS        Run tests in parallel (true/false)"
    echo "  MAX_WORKERS           Maximum parallel test workers"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 authentication                           # Run auth tests only"
    echo "  $0 all --base-url http://staging:3000       # Full test suite against staging"
    echo "  $0 injection --coverage 80                  # Injection tests with 80% coverage"
    echo "  BASE_URL=http://test:3000 $0 all             # All tests with env variable"
}

# Main execution
main() {
    echo -e "${PURPLE}🔒 Security Testing Suite${NC}"
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
            --parallel)
                PARALLEL_TESTS=true
                shift
                ;;
            --coverage)
                COVERAGE_THRESHOLD="$2"
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
            authentication|authorization|injection|input-validation|api-security|all)
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
    
    # Check dependencies
    check_dependencies
    
    # Verify test environment safety
    verify_test_environment
    
    # Setup results directory
    if [[ "$clean_results" == true ]]; then
        rm -rf "$RESULTS_DIR"
    fi
    setup_results_dir
    
    # Handle results-only mode
    if [[ "$results_only" == true ]]; then
        generate_security_report
        exit 0
    fi
    
    # Execute security tests
    case "$test_type" in
        authentication)
            run_security_test_suite "Authentication" "Authentication and session management security tests"
            ;;
        authorization)
            run_security_test_suite "Authorization" "Role-based access control and permission security tests"
            ;;
        injection)
            run_security_test_suite "Injection" "SQL injection, NoSQL injection, and command injection tests"
            ;;
        input-validation)
            run_security_test_suite "Input-Validation" "Input validation, XSS, and CSRF protection tests"
            ;;
        api-security)
            run_security_test_suite "API-Security" "API-specific security vulnerabilities and protections"
            ;;
        all)
            run_all_security_tests
            ;;
        "")
            echo -e "${YELLOW}No test type specified. Running authentication tests...${NC}"
            run_security_test_suite "Authentication" "Authentication and session management security tests"
            ;;
        *)
            echo -e "${RED}❌ Invalid test type: $test_type${NC}"
            show_usage
            exit 1
            ;;
    esac
    
    # Generate security assessment report
    generate_security_report
    
    echo ""
    echo -e "${GREEN}🔒 Security testing completed!${NC}"
    echo -e "${BLUE}📂 Results available in: $RESULTS_DIR${NC}"
    echo ""
}

# Run main function with all arguments
main "$@"