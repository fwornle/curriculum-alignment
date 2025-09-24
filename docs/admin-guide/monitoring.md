# System Monitoring Guide

This guide covers comprehensive monitoring, alerting, and observability for MACAS production environments, including metrics collection, dashboard setup, and incident response procedures.

## Monitoring Overview

MACAS implements a multi-layered monitoring strategy using modern observability tools to ensure system reliability, performance, and user experience.

### Monitoring Stack

**Core Components:**
- **Amazon CloudWatch**: AWS native monitoring and logging
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **ELK Stack**: Log aggregation and analysis (Elasticsearch, Logstash, Kibana)
- **New Relic / DataDog**: Application performance monitoring (APM)
- **PagerDuty**: Alert management and incident response

**Monitoring Layers:**
```
┌─────────────────────────────────────────────────────────┐
│                    User Experience                      │
├─────────────────────────────────────────────────────────┤
│                  Application Layer                      │
├─────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                   │
├─────────────────────────────────────────────────────────┤
│                    Network Layer                        │
└─────────────────────────────────────────────────────────┘
```

## Metrics Collection

### Application Metrics

**Performance Metrics:**
```javascript
// Example: Express.js middleware for metrics collection
const promClient = require('prom-client');

// Custom metrics
const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const analysisQueue = new promClient.Gauge({
  name: 'analysis_queue_size',
  help: 'Number of analyses in queue'
});

const documentProcessing = new promClient.Counter({
  name: 'documents_processed_total',
  help: 'Total number of documents processed',
  labelNames: ['status', 'type']
});

// Middleware to collect HTTP metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpDuration
      .labels(req.method, req.route?.path || req.url, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

**Business Metrics:**
- User registration and login rates
- Program creation and analysis execution rates
- Document upload success/failure rates
- Report generation completion times
- API request rates and response times
- Error rates by endpoint and user type

### Infrastructure Metrics

**Server Metrics:**
```yaml
# Prometheus node_exporter configuration
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/node_exporter \
  --collector.systemd \
  --collector.processes \
  --collector.filesystem.ignored-mount-points="^/(sys|proc|dev|host|etc|rootfs/var/lib/docker/containers|rootfs/var/lib/docker/overlay2|rootfs/run/docker/netns|rootfs/var/lib/docker/aufs)($$|/)"

[Install]
WantedBy=multi-user.target
```

**Database Metrics:**
```sql
-- PostgreSQL metrics queries
-- Connection metrics
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;

-- Query performance
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public';

-- Database size
SELECT 
  pg_size_pretty(pg_database_size('macas')) as database_size;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Queue Metrics:**
```javascript
// RabbitMQ monitoring
const amqp = require('amqplib');

async function collectQueueMetrics() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  
  const queues = ['analysis', 'document-processing', 'report-generation'];
  
  for (const queueName of queues) {
    const info = await channel.checkQueue(queueName);
    
    // Export metrics to Prometheus
    queueSize.labels(queueName).set(info.messageCount);
    consumerCount.labels(queueName).set(info.consumerCount);
  }
  
  await connection.close();
}

// Run every 30 seconds
setInterval(collectQueueMetrics, 30000);
```

## Dashboard Configuration

### Grafana Dashboards

**System Overview Dashboard:**
```json
{
  "dashboard": {
    "id": null,
    "title": "MACAS System Overview",
    "tags": ["macas", "overview"],
    "timezone": "UTC",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      }
    ]
  }
}
```

**Application Performance Dashboard:**
```json
{
  "dashboard": {
    "title": "MACAS Application Performance",
    "panels": [
      {
        "title": "Analysis Queue Size",
        "type": "graph",
        "targets": [
          {
            "expr": "analysis_queue_size",
            "legendFormat": "Queue Size"
          }
        ]
      },
      {
        "title": "Document Processing Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(documents_processed_total[5m])",
            "legendFormat": "{{status}}"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_activity_count",
            "legendFormat": "{{state}}"
          }
        ]
      }
    ]
  }
}
```

**Infrastructure Dashboard:**
```json
{
  "dashboard": {
    "title": "MACAS Infrastructure",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "title": "Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100",
            "legendFormat": "{{instance}} {{mountpoint}}"
          }
        ]
      }
    ]
  }
}
```

### CloudWatch Dashboards

**AWS CloudWatch Custom Dashboard:**
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "macas-alb"],
          ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "macas-alb"],
          ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", "macas-alb"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Load Balancer Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "macas-db"],
          ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", "macas-db"],
          ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", "macas-db"],
          ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", "macas-db"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Database Metrics"
      }
    }
  ]
}
```

## Alerting Configuration

### Alert Rules

**Prometheus Alerting Rules:**
```yaml
# /etc/prometheus/alert_rules.yml
groups:
  - name: macas_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} requests per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: QueueBacklog
        expr: analysis_queue_size > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Analysis queue backlog"
          description: "Queue size is {{ $value }} items"

      - alert: DatabaseConnections
        expr: pg_stat_activity_count > 180
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "Database has {{ $value }} active connections"

      - alert: DiskSpaceUsage
        expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100 > 85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High disk usage on {{ $labels.instance }}"
          description: "Disk usage is {{ $value }}% on {{ $labels.mountpoint }}"

      - alert: MemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value }}%"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
```

**CloudWatch Alarms:**
```bash
# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "MACAS-High-CPU" \
  --alarm-description "High CPU utilization" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:macas-alerts

aws cloudwatch put-metric-alarm \
  --alarm-name "MACAS-Database-CPU" \
  --alarm-description "High database CPU" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 75 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=macas-db \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:macas-alerts

aws cloudwatch put-metric-alarm \
  --alarm-name "MACAS-ALB-5XX-Errors" \
  --alarm-description "High 5xx error rate" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LoadBalancer,Value=app/macas-alb/1234567890123456 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:macas-alerts
```

### Notification Channels

**Slack Integration:**
```yaml
# Alertmanager configuration
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'macas-alerts'

receivers:
  - name: 'macas-alerts'
    slack_configs:
      - channel: '#macas-alerts'
        title: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
```

**Email Notifications:**
```yaml
receivers:
  - name: 'email-alerts'
    email_configs:
      - to: 'devops@ceu.edu'
        from: 'alerts@ceu.edu'
        smarthost: 'smtp.ceu.edu:587'
        auth_username: 'alerts@ceu.edu'
        auth_password: 'password'
        subject: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Instance: {{ .Labels.instance }}
          {{ end }}
```

**PagerDuty Integration:**
```yaml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        severity: '{{ range .Alerts }}{{ .Labels.severity }}{{ end }}'
```

## Log Management

### Centralized Logging

**ELK Stack Configuration:**
```yaml
# docker-compose.elk.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:7.15.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5000:5000"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_URL: http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

**Logstash Configuration:**
```ruby
# logstash/pipeline/logstash.conf
input {
  beats {
    port => 5044
  }
  
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  if [fields][service] == "macas-backend" {
    mutate {
      add_tag => ["backend"]
    }
    
    if [message] =~ /ERROR/ {
      mutate {
        add_tag => ["error"]
      }
    }
    
    # Parse JSON logs
    json {
      source => "message"
    }
    
    # Extract timestamp
    date {
      match => [ "timestamp", "ISO8601" ]
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "macas-logs-%{+YYYY.MM.dd}"
  }
  
  if "error" in [tags] {
    email {
      to => "devops@ceu.edu"
      from => "logs@ceu.edu"
      subject => "MACAS Error: %{message}"
      body => "Error detected in MACAS:\n\n%{message}\n\nTimestamp: %{@timestamp}\nHost: %{host}"
    }
  }
}
```

**Filebeat Configuration:**
```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/macas/*.log
    fields:
      service: macas-backend
    fields_under_root: true
    
  - type: docker
    containers.ids:
      - "*"
    processors:
      - add_docker_metadata: ~

output.logstash:
  hosts: ["logstash:5044"]

logging.level: info
```

### Application Logging

**Structured Logging Example:**
```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: '/var/log/macas/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '/var/log/macas/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Usage examples
logger.info('Analysis started', { 
  analysisId: 'uuid-123',
  programId: 'uuid-456',
  userId: 'uuid-789' 
});

logger.error('Database connection failed', { 
  error: error.message,
  stack: error.stack,
  host: process.env.DB_HOST 
});

logger.warn('Queue backlog detected', { 
  queueName: 'analysis',
  size: 150,
  threshold: 100 
});

module.exports = logger;
```

## Performance Monitoring

### Application Performance Monitoring (APM)

**New Relic Integration:**
```javascript
// newrelic.js
'use strict';

exports.config = {
  app_name: ['MACAS Production'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info'
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  }
};
```

**Custom Performance Metrics:**
```javascript
// performance.js
const performanceMonitor = {
  // Track analysis performance
  trackAnalysis: (analysisId, type, duration, success) => {
    const metric = {
      name: 'analysis.performance',
      value: duration,
      unit: 'seconds',
      tags: {
        analysisId,
        type,
        success: success.toString()
      }
    };
    
    // Send to monitoring service
    this.sendMetric(metric);
  },
  
  // Track document processing
  trackDocumentProcessing: (documentId, size, processingTime, extractionQuality) => {
    const metric = {
      name: 'document.processing',
      value: processingTime,
      unit: 'seconds',
      tags: {
        documentId,
        size: this.categorizeSize(size),
        quality: this.categorizeQuality(extractionQuality)
      }
    };
    
    this.sendMetric(metric);
  },
  
  // Track database query performance
  trackQuery: (query, duration, resultCount) => {
    const metric = {
      name: 'database.query',
      value: duration,
      unit: 'milliseconds',
      tags: {
        operation: this.extractOperation(query),
        resultCount: this.categorizeResultCount(resultCount)
      }
    };
    
    this.sendMetric(metric);
  },
  
  sendMetric: (metric) => {
    // Implementation depends on monitoring service
    // Example: DataDog, New Relic, CloudWatch custom metrics
  }
};
```

### Synthetic Monitoring

**Health Check Monitoring:**
```bash
#!/bin/bash
# scripts/synthetic-monitoring.sh

ENDPOINTS=(
  "https://curriculum-alignment.ceu.edu"
  "https://curriculum-alignment.ceu.edu/api/health"
  "https://curriculum-alignment.ceu.edu/api/status"
)

check_endpoint() {
  local url=$1
  local start_time=$(date +%s.%N)
  
  response=$(curl -s -w "%{http_code},%{time_total}" -o /dev/null "$url")
  local end_time=$(date +%s.%N)
  
  local http_code=$(echo $response | cut -d',' -f1)
  local response_time=$(echo $response | cut -d',' -f2)
  
  # Send metrics to monitoring system
  echo "endpoint.check,url=$url,status=$http_code response_time=$response_time $(date +%s)"
  
  if [ "$http_code" != "200" ]; then
    # Alert on failure
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"❌ Endpoint check failed: $url returned $http_code\"}" \
      $SLACK_WEBHOOK_URL
  fi
}

# Check all endpoints
for endpoint in "${ENDPOINTS[@]}"; do
  check_endpoint "$endpoint"
done
```

**User Journey Monitoring:**
```javascript
// synthetic-tests/user-journey.js
const puppeteer = require('puppeteer');

async function testUserJourney() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    // Measure page load time
    const start = Date.now();
    await page.goto('https://curriculum-alignment.ceu.edu');
    const loadTime = Date.now() - start;
    
    // Test login flow
    await page.click('#login-button');
    await page.type('#email', 'test@ceu.edu');
    await page.type('#password', 'testpass');
    await page.click('#submit-login');
    
    await page.waitForSelector('#dashboard', { timeout: 10000 });
    
    // Test program creation
    await page.click('#new-program');
    await page.type('#program-name', 'Test Program');
    await page.select('#department', 'Computer Science');
    await page.click('#create-program');
    
    await page.waitForSelector('.success-message', { timeout: 15000 });
    
    // Report success
    console.log(`User journey test passed. Page load: ${loadTime}ms`);
    
  } catch (error) {
    // Report failure
    console.error('User journey test failed:', error);
    
    // Send alert
    await sendAlert('User journey test failed', error.message);
    
  } finally {
    await browser.close();
  }
}

// Run test every 15 minutes
setInterval(testUserJourney, 15 * 60 * 1000);
```

## Incident Response

### Incident Detection

**Automated Incident Detection:**
```javascript
// incident-detection.js
const incidentDetector = {
  // Analyze metrics for anomalies
  analyzeMetrics: async (metrics) => {
    const incidents = [];
    
    // High error rate
    if (metrics.errorRate > 0.05) {
      incidents.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `Error rate is ${(metrics.errorRate * 100).toFixed(2)}%`,
        affected_users: metrics.activeUsers
      });
    }
    
    // High response time
    if (metrics.p95ResponseTime > 3000) {
      incidents.push({
        type: 'high_response_time',
        severity: 'warning',
        message: `95th percentile response time is ${metrics.p95ResponseTime}ms`,
        affected_users: metrics.activeUsers
      });
    }
    
    // Queue backlog
    if (metrics.queueSize > 200) {
      incidents.push({
        type: 'queue_backlog',
        severity: 'warning',
        message: `Queue size is ${metrics.queueSize} items`,
        estimated_delay: this.estimateQueueDelay(metrics.queueSize)
      });
    }
    
    // Process detected incidents
    for (const incident of incidents) {
      await this.createIncident(incident);
    }
  },
  
  createIncident: async (incident) => {
    const incidentId = await this.saveIncident(incident);
    
    // Send notifications based on severity
    if (incident.severity === 'critical') {
      await this.sendPagerDutyAlert(incident);
      await this.sendSlackAlert(incident);
    } else if (incident.severity === 'warning') {
      await this.sendSlackAlert(incident);
    }
    
    // Auto-remediation for known issues
    await this.attemptAutoRemediation(incident);
    
    return incidentId;
  }
};
```

### Incident Response Playbooks

**High Error Rate Incident:**
```markdown
## High Error Rate Incident Response

### Immediate Actions (0-5 minutes)
1. Check application logs for error patterns
2. Verify database connectivity
3. Check external service status
4. Review recent deployments

### Investigation Steps (5-15 minutes)
1. Identify error types and affected endpoints
2. Check resource utilization (CPU, memory, disk)
3. Review application and infrastructure metrics
4. Examine user impact and affected functionality

### Resolution Steps
1. **Database Issues**: Restart database connections, check for locks
2. **External Service Issues**: Implement circuit breaker, use fallback
3. **Application Issues**: Rollback recent deployment, restart services
4. **Infrastructure Issues**: Scale up resources, fix infrastructure problems

### Communication
- Update status page
- Notify affected users if impact > 5 minutes
- Post updates in #incidents channel
```

**System Down Incident:**
```markdown
## System Down Incident Response

### Immediate Actions (0-2 minutes)
1. Confirm system is actually down (not just monitoring issue)
2. Check load balancer health
3. Verify DNS resolution
4. Check CDN status

### Investigation Steps (2-10 minutes)
1. Check all service containers/instances
2. Review system logs for critical errors
3. Verify database connectivity
4. Check infrastructure status (AWS, networking)

### Resolution Steps
1. **Service Issues**: Restart failed services
2. **Database Issues**: Restore database connectivity
3. **Infrastructure Issues**: Contact cloud provider, fix networking
4. **Load Balancer Issues**: Reconfigure load balancer

### Recovery Verification
1. Verify all services are running
2. Run smoke tests
3. Check key user journeys
4. Monitor metrics for 30 minutes post-recovery
```

This monitoring guide provides the foundation for maintaining system observability. Continue with [Database Administration](./database.md) for database-specific monitoring and maintenance procedures.