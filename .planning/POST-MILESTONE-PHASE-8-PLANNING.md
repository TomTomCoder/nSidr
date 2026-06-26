# Phase 8: Automations, Reporting & Collaboration Planning

## Objective
Plan Phase 8 of Teable's roadmap, building on the completed Phases 1-7 + 9. Phase 8 will deliver:
1. **Workflow Automations** — Trigger-action automation engine for data operations
2. **Advanced Reporting** — Dashboards, charts, and data visualization
3. **Real-time Collaboration** — Comments, mentions, activity feeds, notifications

## Phase Overview

### Phase 8A: Workflow Automation
**Goal:** Build a no-code automation engine similar to Zapier/Make that allows users to create workflows triggered by data events, with configurable actions (send email, call API, create record, update field, etc.).

**Key Features:**
- Visual workflow builder (canvas interface)
- 50+ pre-built integrations (email, Slack, HTTP, database operations)
- Conditional branching and loops
- Schedule-based triggers (daily, weekly, cron)
- Error handling and retry logic
- Audit trail for all automations

**Estimated Scope:** 8-10 plans, 8-12 weeks

**Architecture:**
```
Trigger Types:
  - On record created/updated/deleted
  - Schedule (cron-based) ✓ BullMQ available from Phase 3
  - Webhook (external system)
  - Form submission
  - Manual (user-initiated button)

Action Types:
  - Send Email (SMTP, Sendgrid)
  - Slack message (Phase 6 integration)
  - Create/Update/Delete record
  - HTTP request (webhook call)
  - Update field value
  - Archive/restore record
  - Bulk operations
  - Send notification
  - Run script (JavaScript/SQL)

Data Flow:
  BullMQ Queue → AutomationEngine → Trigger Check → Action Dispatch → Result Logging
  
Storage:
  - Workflow Prisma model (name, enabled, trigger_config, actions[], error_policy)
  - WorkflowExecution model (workflow_id, triggered_at, status, error)
  - AuditLog model (what changed, by whom, when)
```

**Prisma Schema Sketch:**
```typescript
model Workflow {
  id String @id
  name String
  description String?
  baseId String
  enabled Boolean @default(true)
  triggerType String // "record_created", "schedule", "webhook"
  triggerConfig Json // trigger-specific config
  actions Action[]
  executions WorkflowExecution[]
  createdAt DateTime
  updatedAt DateTime
  createdBy String // userId
}

model Action {
  id String @id
  workflowId String
  type String // "send_email", "slack_message", "create_record"
  config Json // action-specific config
  order Int // execution order
  errorPolicy String // "continue" or "stop"
}

model WorkflowExecution {
  id String @id
  workflowId String
  triggeredAt DateTime
  status String // "running", "success", "failed"
  result Json // action results
  error String?
  duration Int // ms
}
```

**UI Components:**
- WorkflowList (table with enable/disable toggles)
- WorkflowBuilder (canvas + sidebar, drag-and-drop)
- TriggerConfigPanel (context-specific options)
- ActionConfigPanel (action-specific settings)
- ExecutionHistory (past runs with logs)

**Testing:**
- Unit tests for TriggerEngine, ActionDispatcher
- Integration tests for each action type
- E2E tests for complete workflow execution (Playwright)
- Load tests for bulk automations

### Phase 8B: Advanced Reporting & Dashboards
**Goal:** Enable data visualization and business intelligence within Teable. Users can create dashboards with charts, metrics, and reports.

**Key Features:**
- 10+ chart types (bar, line, pie, scatter, heatmap, gauge, KPI)
- Aggregation functions (sum, count, avg, min, max)
- Grouped bar charts (by field)
- Filtered data visualization
- Real-time auto-refresh
- Export to PDF/CSV
- Dashboard sharing (public/private)
- Scheduled reports (email delivery)

**Estimated Scope:** 6-8 plans, 6-10 weeks

**Architecture:**
```
Dashboard:
  - Contains multiple Chart widgets
  - Each Chart queries specific table + aggregation
  - Charts filter/group data dynamically
  - Real-time sync via WebSocket

Chart Types:
  1. Bar Chart (vertical/horizontal, stacked)
  2. Line Chart (time-series, multi-series)
  3. Pie Chart (proportions)
  4. Area Chart (stacked area)
  5. Scatter Plot (X/Y correlation)
  6. Heatmap (matrix visualization)
  7. Gauge (KPI meter)
  8. Number Card (single metric)
  9. Table (sorted/paginated data)
  10. Timeline (Gantt-style)

Data Flow:
  Chart Config → Query Builder → DB Query → Aggregation → Visualization
  ↓
  WebSocket Real-time Updates (ShareDB)
```

**Prisma Schema Sketch:**
```typescript
model Dashboard {
  id String @id
  name String
  baseId String
  description String?
  charts Chart[]
  sharedWith String[] // user IDs
  isPublic Boolean @default(false)
  refreshInterval Int? // seconds
  createdAt DateTime
  updatedAt DateTime
}

model Chart {
  id String @id
  dashboardId String
  type String // "bar", "line", "pie", etc.
  title String
  tableId String
  xField String?
  yField String?
  groupBy String?
  filter String? // filter expression
  aggregation String // "sum", "count", "avg"
  config Json // chart-specific options (colors, labels, etc.)
  position Int // grid position
}
```

**UI Components:**
- DashboardBuilder (grid + widget controls)
- ChartWidget (renders specific chart type)
- ChartConfigPanel (data + visualization options)
- AggregationBuilder (drag-drop metric creation)
- FilterBuilder (drag-drop filters)
- DashboardPreview (live preview)
- SharedDashboard (public dashboard view)

**Chart Library:**
- Use `recharts` or `chart.js` (lightweight, React-compatible)
- Alternative: `plotly.js` (more features, heavier)

**Testing:**
- Unit tests for aggregation functions
- Integration tests for chart data fetching
- E2E tests for dashboard creation/editing
- Visual regression tests for chart rendering

### Phase 8C: Real-time Collaboration
**Goal:** Enable team collaboration on shared records with comments, mentions, activity feeds, and real-time presence.

**Key Features:**
- Inline comments on records
- @mentions with notifications
- Activity feed (who did what, when)
- Presence indicators (who's viewing)
- Collaborative editing (show live cursors)
- Comment threads and replies
- Reactions/emoji support
- Edit history and change tracking

**Estimated Scope:** 6-8 plans, 6-10 weeks

**Architecture:**
```
Comment System:
  Comment Model (recordId, content, author, createdAt, thread)
  Mention Detection (parse @username in text)
  Notification Queue (send to mentioned users)

Activity Feed:
  ActivityLog (userId, action, resource, timestamp, details)
  Real-time broadcast (ShareDB + WebSocket)
  User-specific filters

Presence:
  ConnectedUsers (baseId, userId, tableId, recordId, cursor, lastSeen)
  Broadcast via WebSocket
  Auto-cleanup on disconnect

Edit History:
  RecordChange (recordId, field, oldValue, newValue, userId, timestamp)
  Restore capability (revert to previous state)
```

**Prisma Schema Sketch:**
```typescript
model Comment {
  id String @id
  recordId String
  content String // markdown with @mentions
  author User @relation(fields: [authorId], references: [id])
  authorId String
  parentCommentId String? // for replies
  mentions String[] // @mentioned user IDs
  reactions CommentReaction[]
  createdAt DateTime
  updatedAt DateTime
  deletedAt DateTime?
}

model CommentReaction {
  id String @id
  commentId String
  emoji String // 👍, ❤️, etc.
  userId String
}

model ActivityLog {
  id String @id
  baseId String
  userId String
  action String // "created", "updated", "commented"
  resourceType String // "record", "comment"
  resourceId String
  details Json // what changed
  createdAt DateTime
}

model UserPresence {
  id String @id
  userId String
  baseId String
  tableId String?
  recordId String?
  lastSeen DateTime
  cursorPosition Int? // for collaborative editing
}
```

**UI Components:**
- CommentPanel (sidebar in record detail view)
- CommentThread (comment + replies)
- MentionAutocomplete (searchable user list)
- ActivityFeed (timeline of recent changes)
- PresenceIndicator (avatars of active users)
- EditHistory (versioning and restore)

**Notification System:**
- Email notifications for mentions
- In-app notifications (bell icon)
- Notification preferences (per user)
- Digest emails (daily summary)

**Testing:**
- Unit tests for comment parsing and mentions
- Integration tests for notifications
- E2E tests for comment creation/editing
- WebSocket tests for real-time updates
- Load tests for concurrent comments

## Phasing & Dependencies

```
Phase 8A: Automations (8-12 weeks)
  - Weeks 1-2: Workflow engine + trigger system
  - Weeks 3-6: Action implementations (email, Slack, HTTP, database)
  - Weeks 7-8: Workflow builder UI
  - Weeks 9-10: Testing + hardening
  - Weeks 11-12: Documentation + release

Phase 8B: Reporting (6-10 weeks, parallel with 8A from week 4)
  - Weeks 1-2: Chart rendering engine
  - Weeks 3-4: Dashboard CRUD + persistence
  - Weeks 5-6: Aggregation/filtering
  - Weeks 7-8: Real-time updates
  - Weeks 9-10: Testing + release

Phase 8C: Collaboration (6-10 weeks, parallel from week 6)
  - Weeks 1-2: Comment system + database model
  - Weeks 3-4: Mention detection + notifications
  - Weeks 5-6: Activity feed + presence
  - Weeks 7-8: Collaborative editing
  - Weeks 9-10: Testing + release

Total Phase 8 Duration: 12-16 weeks (3-4 months)
```

## Dependency Tree

```
Phase 8 depends on:
  ✓ Phase 1 (Authority Matrix) — for permission checks on automations
  ✓ Phase 2 (Prompts) — for email templates, message templates
  ✓ Phase 3 (Performance) — for caching dashboard data
  ✓ Phase 4 (Agent System) — potential integration for advanced automations
  ✓ Phase 6 (Integrations) — for external webhooks (Slack, email)
  ✓ Phase 7 (Doc Search) — potential integration in reports
  ✓ Phase 9 (E2E Tests) — test infrastructure for new features

No dependencies on Phase 5 (Gantt) specifically, but Gantt could use automation triggers.
```

## Technical Decisions

### 1. Workflow Execution Model
- **Option A**: Synchronous (immediate execution) — Best for simple actions
- **Option B**: Asynchronous (BullMQ queue) ← **Recommended** (Phase 3 provides BullMQ)
- **Option C**: Hybrid (simple actions sync, complex async)

### 2. Chart Library
- **Option A**: `recharts` (lightweight, React-native)
- **Option B**: `chart.js` (widely supported, many examples)
- **Option C**: `plotly.js` (most features, heavier) ← **Recommended** for power users
- **Option D**: `apache-echarts` (interactive, high-performance)

**Decision**: Use `recharts` for MVP, migrate to `plotly.js` for enterprise if needed.

### 3. Comment Storage
- **Option A**: Separate Comment table (current Prisma approach)
- **Option B**: Embed in record JSON (denormalized)
- **Option C**: Document-based database (MongoDB)

**Decision**: Separate Comment table (normalized, queryable, permission-controlled).

### 4. Real-time Updates
- **Option A**: ShareDB (already in use for records)
- **Option B**: PostgreSQL LISTEN/NOTIFY
- **Option C**: WebSocket pub/sub (custom)

**Decision**: ShareDB (consistent with existing architecture).

## Estimation & Planning

### Phase 8A: Automations (Details)

| Plan | Scope | Effort | Dependencies |
|------|-------|--------|--------------|
| 08-01 | Workflow Prisma models + db push | 1 week | Phase 1, 3 |
| 08-02 | TriggerEngine + TriggerService | 1.5 weeks | 08-01 |
| 08-03 | Email action implementation | 1 week | 08-02 |
| 08-04 | Slack + HTTP action | 1 week | 08-02 |
| 08-05 | Database + script actions | 1.5 weeks | 08-02 |
| 08-06 | WorkflowBuilder UI (canvas) | 2 weeks | 08-01 |
| 08-07 | WorkflowController REST API | 1 week | 08-01, 08-02 |
| 08-08 | E2E tests + integration tests | 1.5 weeks | 08-06, 08-07 |
| 08-09 | Error handling + retry logic | 1 week | 08-02 |
| 08-10 | Documentation + templates | 1 week | 08-06 |

**Total: 12 weeks** (3 plans per week, 4-week critical path)

### Phase 8B: Reporting (Details)

| Plan | Scope | Effort | Dependencies |
|------|-------|--------|--------------|
| 08-11 | Chart rendering + aggregation | 1.5 weeks | Phase 3 |
| 08-12 | Dashboard CRUD + persistence | 1 week | 08-11 |
| 08-13 | Query builder + filtering | 1.5 weeks | 08-12 |
| 08-14 | Real-time updates (ShareDB) | 1.5 weeks | 08-13 |
| 08-15 | Dashboard UI (grid layout) | 2 weeks | 08-14 |
| 08-16 | Dashboard sharing + permissions | 1 week | 08-15 |
| 08-17 | Scheduled reports (email) | 1 week | 08-16, Phase 2 |
| 08-18 | E2E tests + visual regression | 1.5 weeks | 08-15 |
| 08-19 | Documentation | 1 week | 08-18 |

**Total: 12.5 weeks** (same as 8A, parallel possible)

### Phase 8C: Collaboration (Details)

| Plan | Scope | Effort | Dependencies |
|------|-------|--------|--------------|
| 08-20 | Comment model + CRUD | 1 week | Phase 1 |
| 08-21 | Mention detection + parsing | 1 week | 08-20 |
| 08-22 | Notification system | 1.5 weeks | 08-21 |
| 08-23 | Activity feed implementation | 1.5 weeks | 08-20 |
| 08-24 | Presence tracking | 1 week | 08-23 |
| 08-25 | CommentPanel UI + threads | 2 weeks | 08-24 |
| 08-26 | Edit history + revert | 1.5 weeks | 08-20 |
| 08-27 | Collaborative cursors | 1 week | 08-26 |
| 08-28 | E2E tests | 1.5 weeks | 08-25 |
| 08-29 | Documentation | 1 week | 08-28 |

**Total: 12.5 weeks** (parallel with 8A + 8B from week 6)

## Success Criteria

### Phase 8A (Automations)
✓ 10+ pre-built actions working end-to-end
✓ Workflow canvas UI intuitive and responsive
✓ 95% test coverage for critical paths
✓ <1s trigger-to-action latency
✓ Handles 100+ concurrent automations

### Phase 8B (Reporting)
✓ All 10 chart types render correctly
✓ Aggregation functions accurate on 10M+ record sets
✓ Real-time dashboard updates <2s latency
✓ PDF/CSV export functional
✓ Dashboard sharing working

### Phase 8C (Collaboration)
✓ Comments with threading working
✓ @mentions resolve and notify correctly
✓ Activity feed real-time updates
✓ Presence indicators accurate
✓ Edit history restorable

## Budget & Timeline

| Phase | Effort | Timeline | Team Size |
|-------|--------|----------|-----------|
| 8A | 12 weeks | 12 weeks | 2-3 engineers |
| 8B | 12.5 weeks | 8-10 weeks (parallel) | 2-3 engineers |
| 8C | 12.5 weeks | 8-10 weeks (parallel) | 2-3 engineers |
| **Total** | **37 weeks** | **12-16 weeks** | **2-3 engineers** |

**Cost Estimate** (assuming $150/hr senior engineer):
- 37 weeks × 40 hours × $150/hr = **$222,000**

**Alternative**: Phased rollout
- Phase 8A only (Q1 2027): 12 weeks
- Phase 8B (Q2 2027): 12 weeks
- Phase 8C (Q3 2027): 12 weeks

## Next Steps

1. **Validate Scope** — Get stakeholder feedback on Phase 8 priorities
2. **Create RESEARCH.md** — Deep research on automation patterns, dashboard tools
3. **Get Stakeholder Buy-in** — Decision on budget/timeline
4. **Create Phase 8 Planning Documents** — Detailed plans for 8A, 8B, 8C
5. **Set Milestone 2 Goals** — Decide: all 3 subphases or phased?
6. **Kick-off Planning** — /gsd:plan-phase 8 (if approved)

## Questions for Stakeholder Review

1. **Automation Scope**: Which action types are highest priority? (Email, Slack, HTTP, Database)
2. **Reporting Scope**: Which chart types are must-haves? (All 10 or MVP subset?)
3. **Collaboration Scope**: Is edit history required or just comments/mentions?
4. **Timeline**: 12 weeks parallel vs. 36 weeks sequential?
5. **Team**: Can we allocate 2-3 engineers for 4 months?
6. **Budget**: Is $200k+ acceptable for this phase?
7. **Integration**: Any 3rd-party integrations critical (Zapier, Tableau, Looker)?

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Workflow engine complexity | High | High | MVP with 5 actions, expand later |
| Real-time updates bottleneck | Medium | High | Use ShareDB (proven), load test early |
| Chart rendering performance | Medium | Medium | Use recharts (lightweight), CDN for assets |
| Comment notification spam | Medium | Low | Smart notification batching |
| Automation trigger loops (infinite recursion) | Low | Critical | Add max execution depth, audit logging |

---

## Files to Create Next

1. `.planning/phases/08-automations-reporting-collaboration/08-RESEARCH.md`
2. `.planning/phases/08-automations-reporting-collaboration/08-00-PLAN.md` (Phase 8A kickoff)
3. `.planning/phases/08-automations-reporting-collaboration/08-ARCHITECTURE.md`
4. `.planning/ROADMAP.md` (update with Phase 8)
