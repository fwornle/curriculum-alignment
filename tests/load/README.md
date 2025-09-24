# Load Testing Suite

Comprehensive performance testing for the Curriculum Alignment system using k6.

## Overview

This load testing suite provides thorough performance validation across multiple scenarios:

- **Smoke Tests**: Basic functionality verification with minimal load
- **Load Tests**: Expected traffic simulation with realistic user patterns  
- **Stress Tests**: System behavior beyond normal capacity
- **Spike Tests**: Response to sudden traffic increases
- **Volume Tests**: High data volume processing capabilities
- **Soak Tests**: Extended stability over time (4+ hours)
- **Analysis Tests**: Workflow-specific load testing for curriculum analysis

## Prerequisites

### k6 Installation

Install k6 from [k6.io](https://k6.io/docs/getting-started/installation/):

```bash
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### System Requirements

- Target system running and accessible
- Valid authentication credentials configured
- Sufficient system resources for test execution

## Quick Start

### Run Basic Smoke Test
```bash
./run-load-tests.sh smoke
```

### Run Load Test Suite
```bash
./run-load-tests.sh suite --base-url http://your-system.com
```

### Run All Tests
```bash
./run-load-tests.sh all --environment staging
```

## Test Types

### Smoke Test (`smoke-test.js`)
- **Duration**: ~2 minutes
- **VUs**: 2
- **Purpose**: Verify basic system functionality
- **Thresholds**: Strict (p95 < 1s, <1% errors)

```bash
./run-load-tests.sh smoke
```

### Load Test (`api-load-test.js`)
- **Duration**: ~20 minutes  
- **VUs**: 50 (configurable)
- **Purpose**: Simulate expected production traffic
- **Scenarios**: 70% user workflow, 20% admin, 10% API stress

```bash
./run-load-tests.sh load
```

### Stress Test (`stress-test.js`)
- **Duration**: ~15 minutes
- **VUs**: 100 (configurable) 
- **Purpose**: Test system beyond normal capacity
- **Focus**: Heavy read/write operations, analysis stress

```bash
./run-load-tests.sh stress
```

### Spike Test (`spike-test.js`)
- **Duration**: ~15 minutes
- **VUs**: Varies (up to 150)
- **Purpose**: Test sudden traffic spike handling
- **Pattern**: Normal → Spike → Recovery cycles

```bash
./run-load-tests.sh spike
```

### Volume Test (`volume-test.js`)
- **Duration**: ~55 minutes
- **VUs**: 40
- **Purpose**: High data volume processing
- **Focus**: Bulk operations, large datasets, intensive queries

```bash
./run-load-tests.sh volume
```

### Soak Test (`soak-test.js`)
- **Duration**: 4+ hours
- **VUs**: 15
- **Purpose**: Extended stability testing
- **Focus**: Memory leaks, performance degradation over time

```bash
./run-load-tests.sh soak  # Warning: Long duration!
```

### Analysis Load Test (`analysis-load-test.js`)
- **Duration**: ~20 minutes
- **VUs**: 50
- **Purpose**: Analysis workflow performance
- **Focus**: Curriculum analysis operations, document processing

```bash
./run-load-tests.sh analysis
```

## Configuration

### Environment Variables

```bash
# Target system
export BASE_URL="http://localhost:3000"
export ENVIRONMENT="test"

# Virtual user counts (optional)
export SMOKE_VUS=2
export LOAD_VUS=50
export STRESS_VUS=100
export SPIKE_VUS=150
export VOLUME_VUS=40
export SOAK_VUS=15

# Authentication (if required)
export K6_AUTH_TOKEN="your-auth-token"
export K6_API_KEY="your-api-key"
```

### Test Configuration (`config.js`)

The central configuration file contains:

- **Base URLs and endpoints**
- **Performance thresholds**
- **Test data and scenarios**  
- **Staging configurations for different load patterns**

Key thresholds:
```javascript
thresholds: {
  http_req_duration: { p95: 2000, p99: 5000 },
  http_req_failed: { rate: 0.05 },
  'http_req_duration{name:analysis}': { p95: 10000, p99: 30000 }
}
```

## Test Execution

### Individual Tests

```bash
# Quick verification
./run-load-tests.sh smoke --base-url http://staging.company.com

# Production load simulation  
./run-load-tests.sh load --environment production

# Capacity testing
./run-load-tests.sh stress --base-url https://api.company.com
```

### Test Suites

```bash
# Recommended suite (smoke → load → stress)
./run-load-tests.sh suite

# Complete testing (all except soak)
./run-load-tests.sh all

# With custom configuration
BASE_URL=https://staging.api.com LOAD_VUS=100 ./run-load-tests.sh suite
```

### Advanced Usage

```bash
# Clean previous results and run
./run-load-tests.sh load --clean

# Generate summary report from existing results
./run-load-tests.sh --results-only

# Custom environment and high load
./run-load-tests.sh stress --environment prod --base-url https://prod.api.com
```

## Results and Analysis

### Result Files

Tests generate comprehensive results in `results/`:

- `{test}_YYYYMMDD_HHMMSS.json`: Detailed k6 metrics
- `{test}_YYYYMMDD_HHMMSS_summary.json`: Summary statistics  
- `load_test_summary_YYYYMMDD_HHMMSS.md`: Consolidated report

### Key Metrics

**Response Times**:
- Average response time
- 95th percentile (p95)
- 99th percentile (p99)
- Maximum response time

**Error Rates**:
- HTTP request failure rate
- Application error rate
- Timeout rate

**Throughput**:
- Requests per second
- Data operations per second
- Successful transaction rate

**System Stability**:
- Error rate trends over time
- Response time degradation
- System health consistency

### Performance Analysis

The test suite automatically provides:

- **Pass/Fail Assessment**: Based on predefined thresholds
- **Performance Benchmarks**: Comparative analysis against targets
- **Trend Analysis**: Performance changes over test duration
- **Recommendations**: Specific improvement suggestions

Example output:
```
✅ EXCELLENT: Response times within acceptable limits
⚠️  WARN: Error rate above 1% threshold  
❌ FAIL: 95th percentile exceeded 5 seconds
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Tests
on: [push, pull_request]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
          
      - name: Run Load Tests
        run: |
          cd tests/load
          ./run-load-tests.sh suite --base-url ${{ secrets.STAGING_URL }}
        env:
          ENVIRONMENT: staging
          
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: tests/load/results/
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    environment {
        BASE_URL = "${params.TARGET_URL ?: 'http://staging.company.com'}"
        ENVIRONMENT = "${params.ENVIRONMENT ?: 'staging'}"
    }
    
    stages {
        stage('Install k6') {
            steps {
                sh 'curl -s https://raw.githubusercontent.com/loadimpact/k6/master/install.sh | bash'
            }
        }
        
        stage('Load Tests') {
            parallel {
                stage('Smoke Test') {
                    steps {
                        sh 'cd tests/load && ./run-load-tests.sh smoke'
                    }
                }
                
                stage('Load Test') {
                    when { 
                        anyOf {
                            branch 'main'
                            branch 'staging'
                        }
                    }
                    steps {
                        sh 'cd tests/load && ./run-load-tests.sh load'
                    }
                }
            }
        }
        
        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: 'tests/load/results/*', allowEmptyArchive: false
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'tests/load/results',
                    reportFiles: '*.md',
                    reportName: 'Load Test Report'
                ])
            }
        }
    }
}
```

## Troubleshooting

### Common Issues

**k6 Not Found**:
```bash
# Install k6 using package manager
brew install k6  # macOS
sudo apt-get install k6  # Linux
```

**Connection Refused**:
- Verify target system is running
- Check BASE_URL configuration
- Confirm network connectivity and firewall rules

**Authentication Failures**:
- Verify credentials in `config.js`
- Check token expiration
- Confirm API endpoint authentication requirements

**High Error Rates**:
- Reduce virtual user count
- Increase think time between requests
- Check system resources and capacity

**Timeout Issues**:
- Increase timeout thresholds in test configuration
- Verify system performance under load
- Check for network latency issues

### Debugging

Enable verbose output:
```bash
K6_LOG_LEVEL=debug ./run-load-tests.sh smoke
```

Run individual k6 script:
```bash
cd k6-scripts
k6 run --vus 10 --duration 30s smoke-test.js
```

Monitor system resources during tests:
```bash
# Monitor target system
htop
iostat 1
netstat -i 1

# Monitor test runner
docker stats  # if using Docker
ps aux | grep k6
```

## Best Practices

### Test Design

1. **Start Small**: Begin with smoke tests before scaling up
2. **Realistic Scenarios**: Model actual user behavior patterns  
3. **Data Variety**: Use diverse test data to avoid caching effects
4. **Think Time**: Include realistic delays between operations
5. **Gradual Ramp**: Increase load gradually rather than instantly

### Performance Targets

- **Response Time**: p95 < 2s, p99 < 5s for general operations
- **Analysis Operations**: p95 < 10s, p99 < 30s for complex processing
- **Error Rate**: < 5% under normal load, < 10% under stress
- **Throughput**: Maintain target RPS with acceptable response times
- **Stability**: No significant degradation over extended periods

### Test Environment

- Use dedicated testing environments when possible
- Ensure consistent test data across runs
- Monitor system resources during testing
- Clean up test data after completion
- Document any environment-specific configurations

### Result Interpretation

- Focus on trends rather than absolute values
- Compare results across test runs for regression detection  
- Correlate performance metrics with business KPIs
- Consider system resource utilization alongside response times
- Document and track performance improvements over time

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Include comprehensive setup/teardown functions
3. Add appropriate performance thresholds
4. Document test purpose and scenarios
5. Update this README with new test information

For questions or issues, refer to the project documentation or create an issue in the repository.