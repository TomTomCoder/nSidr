# Production Hardening Plan

## Objective
Harden the Teable application for production deployment by identifying and mitigating security vulnerabilities, performance bottlenecks, and operational risks. Includes security audit, load testing, monitoring setup, and deployment hardening.

## Security Audit Checklist

### Authentication & Authorization
- [ ] **Session Management**
  - [ ] Session tokens use httpOnly cookies (prevent XSS access)
  - [ ] CSRF protection enabled on state-changing endpoints
  - [ ] Session timeout: 24-48 hours idle
  - [ ] Logout clears all session data

- [ ] **Password Policy**
  - [ ] Minimum 8 characters (configurable)
  - [ ] Require uppercase, lowercase, numbers, special chars
  - [ ] Check against common password list
  - [ ] Rate limit login attempts (5 failures = 15 min lockout)
  - [ ] Enforce password change on first login

- [ ] **OAuth2**
  - [ ] PKCE flow used for all providers (✓ Phase 6 confirmed)
  - [ ] State parameter validated
  - [ ] Redirect URI whitelist enforced
  - [ ] Token expiration: 1 hour access, 30 days refresh
  - [ ] Revoke tokens on logout

- [ ] **API Authentication**
  - [ ] API tokens require Bearer header
  - [ ] Token rotation: 90 days max lifetime
  - [ ] API keys rate-limited per user/token
  - [ ] No API access without explicit grant

- [ ] **Authority Matrix** (✓ Phase 1 implemented)
  - [ ] Role-based access control (RBAC) enforced
  - [ ] Field-level permissions validated on read/write
  - [ ] No privilege escalation paths
  - [ ] Admin actions audit-logged

### API Security
- [ ] **Input Validation**
  - [ ] All user inputs validated on server side
  - [ ] SQL injection prevention (use parameterized queries) ✓ Phase 3
  - [ ] NoSQL injection prevention (if applicable)
  - [ ] XSS prevention (sanitize output)
  - [ ] Command injection prevention

- [ ] **API Rate Limiting**
  - [ ] Public endpoints: 100 req/min per IP
  - [ ] Authenticated endpoints: 1000 req/min per user
  - [ ] Burst limit: 500 req/10s
  - [ ] Rate limit headers returned in responses
  - [ ] DDoS protection (cloudflare/WAF)

- [ ] **API Documentation**
  - [ ] OpenAPI/Swagger specs up-to-date
  - [ ] Authentication requirements documented
  - [ ] Rate limits documented
  - [ ] Error codes documented

### Data Protection
- [ ] **Encryption at Rest**
  - [ ] Database encryption enabled (PostgreSQL native)
  - [ ] Sensitive fields encrypted (passwords, API keys)
  - [ ] AES-256 for encryption ✓ Phase 6 confirmed
  - [ ] Encryption keys managed by environment

- [ ] **Encryption in Transit**
  - [ ] HTTPS enforced (TLS 1.2+)
  - [ ] HSTS header set (Strict-Transport-Security)
  - [ ] WebSocket connections use WSS (secure)
  - [ ] Certificate pinning (optional)

- [ ] **Data Masking**
  - [ ] Sensitive data never logged
  - [ ] API responses never contain passwords/tokens
  - [ ] Error messages don't leak system info
  - [ ] Database query logs masked

- [ ] **Backup & Disaster Recovery**
  - [ ] Daily backups (encrypted)
  - [ ] Weekly full backup + daily incremental
  - [ ] Backup retention: 90 days
  - [ ] Test restore process monthly
  - [ ] Backup stored in separate region (S3 cross-region)

### Infrastructure Security
- [ ] **Network Security**
  - [ ] Firewall rules (restrict to needed ports)
  - [ ] Database not exposed to internet
  - [ ] Redis not exposed to internet
  - [ ] VPN/bastion host for admin access
  - [ ] DDoS protection enabled

- [ ] **Container Security**
  - [ ] Images scanned for vulnerabilities (Trivy)
  - [ ] Non-root user in containers
  - [ ] Read-only file system where possible
  - [ ] Resource limits set (CPU, memory)
  - [ ] No hardcoded secrets in images

- [ ] **Dependency Management**
  - [ ] Regular dependency updates (npm audit)
  - [ ] Vulnerable packages removed
  - [ ] License compliance checked
  - [ ] Supply chain security (Snyk, npm audit)

- [ ] **Secrets Management**
  - [ ] No secrets in git repo
  - [ ] Secrets stored in environment variables
  - [ ] Secrets rotated on schedule (90 days)
  - [ ] Vault or similar tool for secrets (HashiCorp Vault)
  - [ ] Audit log for secret access

### Application Monitoring
- [ ] **Logging**
  - [ ] Structured logs (JSON format)
  - [ ] Log levels: ERROR, WARN, INFO, DEBUG
  - [ ] Sensitive data never logged
  - [ ] Centralized log aggregation (ELK, Datadog)
  - [ ] Log retention: 90 days

- [ ] **Error Tracking**
  - [ ] Sentry integration ✓ Phase 3 confirmed
  - [ ] Error grouping and deduplication
  - [ ] Source maps deployed with code
  - [ ] Alert on error spikes

- [ ] **Performance Monitoring**
  - [ ] APM (Application Performance Monitoring) setup ✓ Phase 3
  - [ ] Database query profiling
  - [ ] API latency tracking
  - [ ] Memory/CPU monitoring
  - [ ] Alerts on threshold breaches

- [ ] **Security Monitoring**
  - [ ] Failed login attempt tracking
  - [ ] Unusual API activity detection
  - [ ] Permission escalation attempts logged
  - [ ] Data export/bulk operations logged
  - [ ] Admin action audit trail

## Load Testing Plan

### Objectives
1. Identify performance bottlenecks
2. Establish baseline metrics
3. Test scaling capacity
4. Validate caching effectiveness
5. Verify database query performance

### Test Scenarios

**Scenario 1: Concurrent Users**
- 100, 500, 1000, 5000 concurrent users
- Each user performs: login → view grid → sort/filter → edit record
- Measure: response time, throughput, error rate
- Expected: <500ms p95 latency, >90% success rate

**Scenario 2: Data Scale**
- Database with 1M, 10M, 100M records
- Query performance on large tables
- Export performance
- Search performance (especially semantic search ✓ Phase 7)
- Expected: <1s query time, consistent performance

**Scenario 3: Burst Traffic**
- Ramp-up: 1 → 500 users over 5 minutes
- Sustained: 500 users for 30 minutes
- Ramp-down: 500 → 1 user over 5 minutes
- Measure: recovery time, memory leaks, connection issues

**Scenario 4: Real-world Usage**
- Realistic user journeys (create base → add fields → import data → share)
- Mixed read/write operations
- Multiple simultaneous operations (WebSocket conflicts)
- Expected: <2s page load, responsive UI

### Load Testing Tools
```bash
# Option 1: Apache JMeter
jmeter -n -t test_plan.jmx -l results.jtl

# Option 2: Locust (Python-based)
locust -f locustfile.py --host=http://localhost:3000

# Option 3: k6 (Cloud-native)
k6 run script.js

# Option 4: Artillery (npm-based)
artillery run load-test.yml
```

### Locust Example Script

```python
from locust import HttpUser, task, between
import json

class TeableUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def view_grid(self):
        """View grid with 1000 records"""
        self.client.get("/api/base/123/tables/456/records?limit=100")
    
    @task(1)
    def search_records(self):
        """Search with filter"""
        self.client.get("/api/base/123/tables/456/records?filter=name=test")
    
    @task(1)
    def update_record(self):
        """Update a record"""
        self.client.patch("/api/base/123/tables/456/records/789", 
            json={"name": "Updated"})
    
    def on_start(self):
        """Login before testing"""
        self.client.post("/auth/login",
            json={"email": "test@example.com", "password": "test123"})
```

### Load Test Baseline Metrics

| Metric | Target | Threshold |
|--------|--------|-----------|
| Response Time p50 | <100ms | <200ms |
| Response Time p95 | <500ms | <1000ms |
| Response Time p99 | <1000ms | <2000ms |
| Throughput | >1000 req/s | >500 req/s |
| Error Rate | <0.1% | <1% |
| CPU Usage | <60% | <80% |
| Memory Usage | <4GB | <8GB |
| Database Connections | <100 | <200 |
| Cache Hit Ratio | >80% | >60% |

## Deployment Hardening

### Pre-Deployment Checklist
- [ ] Security scan passed (Snyk, npm audit)
- [ ] All E2E tests passing
- [ ] Load testing completed and passed
- [ ] Database backup created
- [ ] Rollback procedure documented and tested
- [ ] Monitoring and alerts configured
- [ ] Logging centralized and tested
- [ ] Secrets rotated and secured
- [ ] SSL certificates valid (>30 days)
- [ ] Firewall rules updated
- [ ] Rate limiting configured
- [ ] CORS headers configured
- [ ] CSP headers configured
- [ ] Security headers added

### Security Headers Configuration

```yaml
# In NestJS main.ts or nginx config
headers:
  Strict-Transport-Security: "max-age=63072000; includeSubDomains; preload"
  X-Content-Type-Options: "nosniff"
  X-Frame-Options: "SAMEORIGIN"
  X-XSS-Protection: "1; mode=block"
  Content-Security-Policy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  Referrer-Policy: "strict-origin-when-cross-origin"
  Permissions-Policy: "geolocation=(), microphone=(), camera=()"
```

### Deployment Strategy

**Blue-Green Deployment**
1. Deploy new version to "green" environment
2. Run smoke tests on green
3. Switch load balancer to green
4. Keep blue running for instant rollback
5. Verify metrics for 10 minutes
6. Decommission blue after 24 hours

**Canary Deployment** (alternative)
1. Deploy to 10% of servers
2. Monitor error rate for 30 minutes
3. Gradually increase to 100% (10% every 5 min)
4. Full rollback if error rate spikes

### Rollback Procedure
```bash
# Step 1: Revert load balancer
kubectl set image deployment/teable app=teable:v1.9.0

# Step 2: Verify rollback
kubectl get pods
kubectl logs -l app=teable | tail -20

# Step 3: Monitor metrics
# Check Prometheus/Grafana for error rates returning to baseline

# Step 4: Communicate with team
# Post in Slack #deployments channel
```

## Monitoring Dashboard Setup

### Prometheus Metrics
```yaml
# Scrape config
global:
  scrape_interval: 15s
  
scrape_configs:
  - job_name: 'nestjs'
    static_configs:
      - targets: ['localhost:3000']
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:5432']
```

### Grafana Dashboards
1. **System Health** — CPU, Memory, Disk, Network
2. **API Performance** — Latency, Throughput, Errors
3. **Database** — Query time, Connections, Cache hit ratio
4. **Security** — Failed logins, Rate limit hits, Errors
5. **Business Metrics** — Active users, Records created, Search queries

### Alert Rules
```yaml
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
  for: 5m
  annotations:
    summary: "High error rate on {{ $labels.instance }}"

- alert: HighLatency
  expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
  for: 10m
  annotations:
    summary: "High latency on {{ $labels.instance }}"
```

## Compliance & Audit

### Data Protection Regulations
- [ ] GDPR compliance (if EU customers)
  - [ ] Data subject access requests handled
  - [ ] Right to be forgotten implemented
  - [ ] Data processing agreement (DPA) in place
- [ ] CCPA compliance (if US customers)
  - [ ] Privacy policy updated
  - [ ] Opt-out mechanism available
- [ ] SOC 2 Type II (if enterprise customers)
  - [ ] Annual audit scheduled
  - [ ] Security controls documented
  - [ ] Incident response plan

### Audit Trail
- [ ] User actions logged (create, update, delete)
- [ ] Admin actions logged separately
- [ ] Data exports logged
- [ ] Permission changes logged
- [ ] API key creation/deletion logged
- [ ] Login attempts (success/failure) logged
- [ ] Audit logs immutable and retained 1 year

## Maintenance Windows

### Scheduled Maintenance
- Day: Tuesday 2am UTC
- Duration: 1-2 hours (announce 1 week in advance)
- Activities: Database optimization, dependency updates, security patches
- Monitoring: Full team available during window

### Emergency Maintenance
- On-call rotation (24/7)
- Incident response procedure documented
- Communication template prepared
- Runbooks for common incidents

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `.github/workflows/security.yml` | Automated security scanning |
| `scripts/load-test.js` | Load testing script |
| `docs/SECURITY.md` | Security policy |
| `docs/DEPLOYMENT.md` | Deployment procedures |
| `docs/MONITORING.md` | Monitoring setup guide |
| `.env.production.example` | Production env template |
| `prometheus.yml` | Prometheus config |
| `docker-compose.monitoring.yml` | Monitoring stack setup |

## Success Criteria

✓ All security checklist items complete
✓ Load test results show >1000 req/s throughput
✓ Response time p95 <500ms under 500 concurrent users
✓ Error rate <0.1% during 1-hour load test
✓ Zero vulnerabilities in dependency scan
✓ Monitoring/alerting fully operational
✓ Incident response procedures documented
✓ Team trained on security practices
✓ Audit trail validated and immutable
✓ Backup/restore process tested

## Timeline

- Security audit: 2-3 weeks (initial + remediation)
- Load testing: 1-2 weeks
- Monitoring setup: 1 week
- Deployment procedures: 1 week
- Compliance documentation: 1-2 weeks
- **Total: 6-9 weeks** before production-ready

## Next Steps

1. Run security scan (OWASP ZAP)
2. Identify critical vulnerabilities
3. Create remediation plan
4. Set up load testing environment
5. Execute baseline load tests
6. Document results and recommendations
7. Implement monitoring stack
8. Train team on security practices
