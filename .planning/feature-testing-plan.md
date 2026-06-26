# Teable Feature Testing Plan

## Discovered Features & Test Status

### 1. AUTHENTICATION & WORKSPACE
- [x] Login / Signup
- [ ] Password reset
- [ ] Workspace creation
- [ ] Team management

### 2. DATA MANAGEMENT (Core)
- [ ] Base/workspace navigation
- [ ] Table CRUD (create/read/update/delete)
- [ ] Record CRUD operations
- [ ] Field types (text, number, select, link, attachment, date, checkbox, etc.)
- [ ] Field linking (relationships: 1-to-many, many-to-many, etc.)
- [ ] Record search & filtering
- [ ] Sorting & grouping

### 3. VIEWS & VISUALIZATION
- [ ] **Grid View** — standard table with inline editing
- [ ] **Kanban View** — column-based cards
- [ ] **Calendar View** — date-based timeline
- [ ] **Gallery View** — card grid
- [ ] **Form View** — record data entry form
- [ ] **Gantt View** — project timeline
- [ ] View filters & sorting
- [ ] View grouping & aggregation

### 4. AI & AGENT FEATURES (NEW)
- [x] Chat panel (docked)
- [x] Typewriter carousel (auto-cycling prompts)
- [x] Task Progress panel (sticky checklist)
- [ ] Agent tool execution (create_table, create_field, create_view, create_app)
- [ ] Thinking/progress streaming
- [ ] Knowledge document search
- [ ] Memory persistence

### 5. AUTOMATION & WORKFLOWS
- [ ] Workflow creation & triggers
- [ ] Workflow execution
- [ ] Integration with tables/records

### 6. INTEGRATIONS
- [ ] OAuth (Gmail, Slack, GitHub) connection
- [ ] Third-party MCP servers
- [ ] External table import
- [ ] API connections

### 7. DATA IMPORT/EXPORT
- [ ] CSV import
- [ ] Template import
- [ ] Export to formats

### 8. ADMIN & SETTINGS
- [ ] User/role management
- [ ] Workspace settings
- [ ] AI model configuration
- [ ] Database connection settings

### 9. CHARTS & ANALYTICS
- [ ] Chart widgets
- [ ] Dashboard creation
- [ ] Data visualization

### 10. SHARING & COLLABORATION
- [ ] Share views
- [ ] Permissions/RBAC
- [ ] Collaborative editing

### 11. SEARCH & DISCOVERY
- [ ] Doc library (markdown knowledge)
- [ ] Full-text search
- [ ] Semantic search

### 12. APP BUILDER (NEW)
- [ ] Create app interface
- [ ] Connect tables to forms/grids
- [ ] App UI generation via AI

## Test Methodology

For each feature:
1. **Functional Test** — does the core action work?
2. **Integration Test** — does it integrate with other features?
3. **Edge Case Test** — error states, empty data, large datasets?
4. **Performance Test** — responsiveness with realistic data?

## Notes

- Tests marked [x] are already validated in this session (frontend animations, agent tools)
- Tests marked [ ] require hands-on interaction with the running app
- Focus on the NEW features (Typewriter carousel, Task Progress, Schema tools, App builder)
- Compare behavior against the video (Teable_UI&UX.mov) where applicable
