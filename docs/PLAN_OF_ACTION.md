# PLAN OF ACTION — ORGANO CLEAN AI ERP

> Master prompt / plan of action for the OrganoClean AI ERP project.
> GitHub: https://github.com/MHK-TECH/organoclean-erp.git
> Deployment: GitHub is connected to Cloudflare.

---

## Open-Source, AI-Powered Chemical Manufacturing & Digital Lab Platform

**Project vision:** Build a modern, blazing-fast, resource-efficient, AI-powered ERP designed specifically for chemical and chemistry-related product manufacturers. OrganoClean will be the first real-world implementation and testing environment. The long-term goal is to open-source the platform and make it adaptable for manufacturers worldwide.

**Primary developer:** OpenCode AI coding agent
**Product category:** Chemical Manufacturing ERP + Digital Lab + AI Operations Platform
**Initial deployment target:** Next.js with Cloudflare-compatible infrastructure
**Initial business:** OrganoClean, Pakistan
**Long-term target:** Multi-tenant, multi-company, configurable open-source software for chemical manufacturers globally

---

# 1. Role and execution instructions

Act as a senior software architect, principal full-stack engineer, database designer, DevSecOps engineer, AI integration engineer, manufacturing systems analyst, and open-source product maintainer.

You are not building a generic admin dashboard or a simple CRUD application. You are building a maintainable, production-oriented ERP platform that will eventually support real inventory, manufacturing, laboratory records, financial transactions, business integrations, AI workflows, and multiple organizations.

## Before writing code

1. Inspect the existing repository, directory structure, source files, dependencies, Git status, environment configuration, database schema and current implementation.
2. Determine whether the project already contains working features. Preserve and improve them rather than unnecessarily rewriting everything.
3. Identify the current Next.js version, package manager, ORM, database, authentication implementation and Cloudflare deployment configuration.
4. Create `docs/PROJECT_ASSESSMENT.md` describing the existing state, gaps, risks and recommended implementation sequence.
5. Create a prioritized implementation backlog in `docs/IMPLEMENTATION_ROADMAP.md`.
6. Document important architecture decisions in `docs/ADR/` before making major irreversible technical choices.
7. Start with a small working vertical slice and test it before expanding to additional modules.

**Important execution rules:**

- Do not generate the entire ERP in one untested code dump.
- Work incrementally, using migrations, automated tests and documented checkpoints.
- Do not claim a feature is implemented unless the code, tests and integration actually support it.
- Never overwrite working user files or expose secrets.
- Do not put real API keys, passwords, customer data or private chemical formulations into source control.
- If something requires a decision, choose a safe, reversible default when reasonable and document the decision. Ask only when an unresolved decision blocks safe progress.
- Keep a clear record of implemented, partially implemented and pending features.
- Prioritize correctness, security, performance, maintainability and usable workflows over decorative UI.

# 2. Product vision and core principles

Build a Chemical Manufacturing ERP that helps organizations manage their entire business lifecycle:

**Research → Formulation → Procurement → Inventory → Production → Quality Control → Packaging → Sales → Distribution → Finance → Analytics → Continuous Improvement**

The product must follow these principles:

1. **API-first:** Every important business capability should be accessible through validated, documented server-side services.
2. **AI-optional:** Core ERP functions must work when AI is disabled, unavailable or unaffordable.
3. **Cloud-efficient:** Avoid unnecessary services, background processes, large dependencies and resource-heavy architecture.
4. **Modular:** Organizations can enable relevant modules without installing or operating the entire platform.
5. **Multi-tenant:** Different companies must have strictly isolated business records and permissions.
6. **Auditable:** Important actions must be attributable to a real user or identifiable service account.
7. **Human-controlled:** AI recommends and assists; authorized people approve sensitive business actions.
8. **Open-source friendly:** Keep the core product portable, documented, testable and free of unnecessary vendor lock-in.
9. **Manufacturing-first:** Chemical production, formulations, batch genealogy, quality records and laboratory work must be first-class features.
10. **Extensible:** Support external applications, integrations, plugins, APIs, MCP tools and automation workflows.

# 3. Recommended technology stack

Inspect the existing project before changing its stack. Prefer a simple, well-supported architecture over adding technologies just because they are fashionable.

## Frontend

- Next.js App Router.
- React and TypeScript with strict type checking.
- Tailwind CSS and a consistent, accessible component library such as shadcn/ui.
- Responsive layouts for desktop, tablets and mobile.
- Server Components by default; Client Components only where interactivity requires them.
- Reusable forms, data tables, search, filters, pagination, dialogs and keyboard-accessible controls.
- Consistent loading, empty, error, validation and permission-denied states.

## Backend

- Next.js Route Handlers or a clearly separated server-side service layer.
- Zod or an equivalent schema-validation library.
- Explicit business services for inventory, production, sales, accounting, laboratory records and integrations.
- Database transactions and idempotency for operations where duplicate processing could corrupt data.
- Background jobs and queues only where required by the workload.
- Versioned APIs, initially under `/api/v1/`.

Do not put business rules exclusively inside React components or frontend forms.

## Database and ORM

Evaluate the existing ORM before changing it. Drizzle ORM is a reasonable option for a lightweight TypeScript-oriented stack.

Use a database abstraction that does not scatter database-specific SQL across every module.

- Cloudflare D1 is a candidate for the initial Cloudflare-native deployment.
- PostgreSQL should remain a supported architectural option for deployments requiring richer transaction capabilities, extensive reporting, or larger workloads.
- Do not claim that every database is interchangeable unless its migrations, constraints, transactions and tests genuinely support that claim.
- Use migrations for every schema change.
- Use foreign keys, unique constraints, appropriate indexes, numeric precision for monetary quantities, and explicit units of measure.
- Store timestamps in UTC and display them in the organization's configured time zone.
- Use decimal-safe representations for financial and measurement values; do not rely on JavaScript floating-point arithmetic for money.

If D1 is selected, explicitly document its limitations and validate the application's expected transaction patterns, concurrency, reporting and growth requirements.

## Cloudflare infrastructure

Design a Cloudflare-compatible deployment using supported products where appropriate:

- Workers-compatible Next.js deployment.
- D1 for structured business data, if suitable.
- R2 for private documents, attachments, exports and product assets.
- Queues or scheduled Workers for suitable asynchronous work.
- Cloudflare DNS and security controls.
- Secrets managed through deployment secrets or environment bindings.
- Staging and production environments with separate credentials and data.

Verify compatibility of the selected Next.js version, adapter, ORM, database driver, authentication library and required Node.js APIs before committing to the runtime.

Do not assume that any ordinary Node.js application can run unchanged on Cloudflare Workers. If a feature requires a separate runtime, document that dependency and provide a supported deployment option.

# 4. Corporate-grade authentication, permissions and CEO oversight

Implement secure authentication and authorization before exposing sensitive ERP modules.

## User identity and authentication

- Individual accounts for every employee and administrator.
- No shared operator accounts for routine work.
- Secure password hashing and session management using a maintained authentication solution.
- Password reset, account recovery, session revocation and account disablement.
- Optional or configurable multi-factor authentication, especially for administrators and financial roles.
- Configurable session lifetime and idle timeout.
- Rate limiting and protection against brute-force attempts.
- Optional SSO support as a future extension.
- Never store plaintext passwords or expose session secrets to the browser.

## Role-based access control

Implement role-based access control (RBAC), with permissions scoped to the tenant, company, facility and department as appropriate.

Initial roles may include:

- Platform Super Administrator.
- Organization Owner / CEO.
- ERP Administrator.
- Production Manager.
- Production Operator.
- Laboratory / R&D Scientist.
- Quality Assurance Manager.
- Inventory Manager.
- Warehouse Operator.
- Procurement Officer.
- Sales Manager.
- Sales Representative.
- Finance Manager.
- Accountant.
- Customer Support Agent.
- Auditor / Read-only User.
- Distributor Portal User.
- Integration Service Account.

Support configurable custom roles and granular permissions, such as:

`inventory.read`, `inventory.adjust`, `production.create`, `production.approve`, `lab.read`, `formulation.edit`, `finance.read`, `invoice.approve`, `users.manage`, `integrations.manage`.

Enforce authorization on the server for every sensitive operation. Hiding a button in the frontend is not security.

## CEO activity and session dashboard

The CEO must be able to determine which real employee performed a particular operation.

Implement an administrative dashboard displaying:

- Employee's registered identity and employee ID.
- Assigned role, department and organization.
- Login and logout timestamps.
- Current active sessions and last activity.
- Session expiration and revocation controls.
- Login failures and security events.
- Current or last recorded IP address where appropriate and lawful.
- User agent or device metadata when available.
- Important records created, edited, approved, rejected or deleted.
- Before-and-after values for important changes, where safe.
- Production, inventory, financial and laboratory approval histories.

For audit events, capture:

`tenant_id`, `actor_user_id`, `actor_type`, `action`, `entity_type`, `entity_id`, `timestamp`, `request_id`, `source`, and appropriate change metadata.

Distinguish human users from AI agents, integrations and scheduled jobs. A service account must never appear as if it were a human employee.

Maintain tamper-resistant audit controls appropriate to the selected infrastructure. Ordinary application logs alone are not a complete audit trail.

Do not secretly monitor employees. Make workplace logging transparent, restrict access to sensitive activity data, and document retention policies.

# 5. Multi-tenant architecture

The long-term product must support multiple independent chemical manufacturers.

Design tenant boundaries from the beginning.

Each tenant should have its own:

- Company profile and business settings.
- Facilities and warehouses.
- Departments and staff.
- Products and units of measure.
- Suppliers and customers.
- Formulations and formula versions.
- Production batches and laboratory records.
- Inventory and accounting records.
- API credentials and integration configuration.
- AI-provider settings and usage limits.
- Audit logs and reports.

Implement tenant-aware authorization in every database access path. A user from one company must never retrieve or modify another company's data by changing an ID, API parameter or URL.

Add automated tests for cross-tenant access denial.

Allow organization-specific modules, terminology, numbering sequences, workflows, permissions, currency, units, time zones and configurable approval policies.

Do not hardcode OrganoClean-specific products, formulas, suppliers, prices or private data into shared application logic or demo seed data.

# 6. ERP modules and business streams

Build the application as modular domains with consistent navigation and shared business services.

## A. Organization and administration

- Company and facility management.
- Departments, teams and employee records.
- User invitations and role assignment.
- Permission and approval policies.
- Document and numbering settings.
- Currency, tax, unit and time-zone settings.
- Audit history and system health.
- Import/export tools.
- Configurable module enablement.

## B. Product and chemical master data

- Product catalogue and internal SKUs.
- Product categories and subcategories.
- Raw materials, active ingredients, additives and packaging.
- Finished goods and intermediate products.
- Supplier/manufacturer references.
- Material specifications and technical documents.
- Safety data sheet (SDS) and technical data sheet (TDS) references.
- Batch and expiry tracking where applicable.
- Storage requirements and approved handling instructions.
- Unit conversions with controlled conversion rules.
- Product status, version history and lifecycle.
- Product-specific metadata without forcing every chemical into one inflexible schema.

Use stable internal identifiers and configurable product classification. Never assume that all chemical manufacturers make cleaning products.

## C. Digital Lab and R&D

Create a compact but useful **Digital Lab** inside the ERP.

It should support:

- R&D projects and experiment registers.
- Research objectives, hypotheses and observations.
- Formulation records and version history.
- Ingredient identity and quantities.
- Concentrations, percentages and units.
- Raw material lot references.
- Equipment, method and operator records where applicable.
- Experiment date, author and reviewer.
- Test results and measurement units.
- pH, viscosity, density, appearance or other configurable measurements.
- Sample IDs, sample status and chain of custody.
- Stability and compatibility study records.
- Document and photograph attachments.
- Results, conclusions and next steps.
- Formula comparison and revision history.
- Review, approval and release workflows.
- Links from an approved formula version to production batches.
- Controlled access to confidential formulas.
- Exportable experiment reports.

Support configurable experiment templates for different chemical industries.

Do not make the R&D module a substitute for a validated laboratory information management system (LIMS). Clearly document limitations and provide an extension path for regulated environments.

AI capabilities may include experiment summarization, search across approved lab documents, comparison of historical results, structured report drafts and identification of missing records.

AI must not silently modify an approved formulation, invent experimental results, determine product safety without evidence, or automatically release a formula for production.

## D. Formulation and bill of materials

- Versioned formulations and bills of materials (BOMs).
- Ingredient quantities and unit conversions.
- Planned batch sizes and scale calculations.
- Packaging and labeling requirements.
- Approved formula versions.
- Expected output, loss and yield assumptions.
- Raw material cost calculations.
- Formula approval and release.
- Formula access permissions and confidentiality controls.
- Comparison of planned versus actual consumption.

Treat formula scaling as a calculation requiring validated units, precision and review. Never let an AI-generated formula automatically become a production-approved recipe.

## E. Procurement and supplier management

- Supplier directory and contact records.
- Supplier product specifications and documents.
- Purchase requisitions and purchase orders.
- Quotation comparisons.
- Goods receipt and inspection.
- Supplier batch/lot details.
- Supplier lead times and delivery performance.
- Purchase returns and discrepancies.
- Supplier price history.
- Approval limits and purchasing authorization.
- Supplier scorecards and purchasing analytics.

## F. Inventory and warehouse management

- Raw materials, intermediates, packaging and finished goods.
- Multiple warehouses, locations and bins where needed.
- Stock ledger with traceable movements.
- Goods received, issues, transfers and adjustments.
- Batch/lot traceability.
- Expiry and retest alerts where applicable.
- Reserved, available, quarantined and rejected stock states.
- Reorder points and safety-stock policies.
- Cycle counts and reconciliation.
- Stock valuation using a documented costing method.
- Material consumption and wastage.
- Stock movement reports and reconciliation.
- Low-stock and unusual-consumption alerts.

Never modify stock quantities without creating the corresponding traceable stock movement.

## G. Production and manufacturing

- Production plans and work orders.
- Batch creation and unique batch numbers.
- Formula version selection.
- Planned material issue.
- Actual material consumption.
- Equipment and operator records.
- Production stages and timestamps.
- In-process quality checks.
- Actual yield and production losses.
- Rework, scrap and deviation records.
- Packaging and labeling operations.
- Finished-goods receipt.
- Batch genealogy from raw materials to finished products.
- Work-order status and approvals.
- Production cost summaries.
- Batch manufacturing record exports.

Implement an auditable workflow:

`Planned → Approved → Materials Issued → In Production → QC Pending → Released or Rejected → Closed`

Make the exact state transitions configurable where appropriate, while preserving core validation and authorization rules.

## H. Quality management

- Incoming material inspection.
- In-process quality checks.
- Finished-product inspection.
- Configurable specifications and test methods.
- Pass/fail and measured-value recording.
- Nonconformance and deviation records.
- Corrective and preventive action (CAPA) tracking.
- Investigation notes and evidence.
- Quality approval and product release.
- Rejected, quarantined and rework workflows.
- Complaint-to-batch traceability.
- Audit-ready quality reports.

Do not describe the system as certified or compliant with a regulatory standard merely because it contains these features. Document any validation, electronic-signature or regulatory requirements that remain unmet.

## I. Packaging and labeling

- Packaging materials and BOMs.
- Packaging consumption and reconciliation.
- Product sizes and variants.
- Label version history and approval.
- Lot/batch and expiry printing where applicable.
- Barcode or QR-code support.
- Label-to-product and label-to-batch traceability.
- Packaging waste and discrepancy records.

## J. Sales, CRM and distribution

- Customer and distributor records.
- Retail, wholesale and business-to-business sales.
- Quotations, orders, dispatch and returns.
- Price lists and approved discounts.
- Distributor territories.
- Customer credit limits and approval rules.
- Sales follow-up tasks.
- Commission calculations.
- Outstanding receivables visibility.
- Salesperson and territory reporting.
- Reorder reminders and customer history.
- Customer complaints and support-ticket links.

## K. Finance and costing

- Sales invoices and credit notes.
- Supplier bills and debit notes.
- Payment receipts and payment tracking.
- Accounts receivable and payable.
- Expense records.
- Cash and bank account reconciliation support.
- Product and batch costing.
- Material, packaging, labor and overhead cost components.
- Gross margin and contribution margin.
- Cash-flow reporting.
- Tax configuration and exportable accounting data.
- Accounting period and approval controls.

Use deterministic accounting calculations and explicit rounding rules. AI can classify, summarize and draft, but cannot independently finalize ledger entries, authorize payments or fabricate reconciliations.

If a full double-entry accounting system is added, implement balanced journals, account mapping, period controls, reversal entries and comprehensive tests rather than presenting a collection of invoice screens as a complete accounting system.

## L. Maintenance and equipment

- Equipment register.
- Preventive maintenance schedules.
- Calibration records where applicable.
- Service history and downtime.
- Spare parts and maintenance consumption.
- Maintenance work orders.
- Equipment-related production deviations.
- Maintenance cost reporting.

## M. HR and task management

Keep this module appropriately scoped in the initial version.

- Employee directory and department assignment.
- Task assignments and due dates.
- Shift or operator assignment where needed.
- Work instructions and SOP acknowledgement.
- Attendance integration as an optional extension.
- Training and qualification records where applicable.
- Department activity and approval queues.

Do not turn basic session logging into an unsupported payroll or employee surveillance system.

## N. Documents and knowledge management

- Private document storage references.
- SDS/TDS and supplier certificates.
- SOPs and work instructions.
- Batch records and laboratory attachments.
- Document versioning and access controls.
- Search and metadata extraction.
- Approval and expiry/review reminders.
- Exportable reports.
- AI retrieval from authorized documents only.

## O. Analytics and executive reporting

- Sales and margin dashboards.
- Stock valuation and inventory turnover.
- Production output, yield and waste.
- Quality deviations and rejection rates.
- Supplier performance.
- Batch costs.
- Customer and distributor performance.
- Receivables and cash-flow views.
- Forecasting and scenario analysis.
- Exception and approval dashboards.
- CEO daily briefing.

Clearly distinguish actual data, calculated KPIs, estimates and model-generated forecasts.

# 7. AI platform and model-provider integrations

Create a reusable AI integration layer rather than coupling business modules directly to one provider.

## Provider abstraction

Support an extensible provider interface for:

- OpenRouter.
- Direct OpenAI API integration.
- Anthropic API.
- Other compatible commercial or self-hosted providers as future adapters.

Do not assume that all providers support the same models, tools, JSON schemas, embeddings or context lengths. Validate capabilities and return meaningful errors.

Store provider configuration separately from business data. Support:

- Provider name.
- Model identifier.
- Encrypted API key or managed secret reference.
- Active/inactive status.
- Allowed use cases.
- Usage and budget limits.
- Timeouts and retry policies.
- Request and token usage metadata when available.
- Per-tenant configuration and permission checks.
- A way to disable AI without disabling the ERP.

API keys must only be used on the server. Never expose keys in client-side JavaScript, browser responses, logs, analytics, source control or exported configuration files.

Do not send confidential formulations, customer information or financial records to external model providers without explicit tenant authorization and suitable data-handling controls.

## AI use cases

Build toward these features:

1. Daily AI-generated owner briefing.
2. Sales enquiry qualification and follow-up drafts.
3. Customer-support draft responses grounded in approved documents.
4. Product description and marketing content drafts.
5. Procurement quotation summaries.
6. Inventory and production exception explanations.
7. Laboratory report summaries.
8. Document search and question answering.
9. Forecast explanations and scenario summaries.
10. Invoice and report extraction assistance.
11. SQL/report generation through controlled query services.
12. An AI operations assistant that can retrieve relevant business information and propose permitted actions.

For every AI action, define its permitted tools, input data, output schema, approval requirements and audit trail.

Use structured output validation where appropriate. Validate all model-generated parameters against normal application schemas and business rules before use.

## AI evaluation and observability

Record provider, model, latency, token usage when available, estimated cost, success/failure, and workflow identifiers.

Avoid storing sensitive prompts and full business documents in ordinary logs by default.

Build a small evaluation framework with test cases for accuracy, structured output validity, refusal/escalation behavior, response latency and cost.

AI-generated outputs must never bypass server-side authorization or ordinary business validation.

# 8. MCP server and developer integration platform

Build a secure integration architecture that allows external developers and AI clients to connect to the ERP.

## API foundation

Implement:

- Versioned REST APIs.
- OpenAPI specification.
- Consistent response and error formats.
- Pagination, filtering and sorting.
- Request validation.
- Rate limiting and API quotas.
- Scoped API credentials.
- Key revocation and rotation.
- Idempotency support for relevant write operations.
- Webhook registration and delivery.
- Webhook signature verification.
- Retry handling and dead-letter or failed-event visibility where supported.
- Integration event logs.
- API examples and a local test environment.

Use scopes such as:

`products:read`, `inventory:read`, `orders:read`, `orders:write`, `production:read`, `lab:read`, `reports:read`, `integrations:manage`.

Grant only the permissions a connection requires.

## MCP integration

Implement an optional, separately documented Model Context Protocol (MCP) server or adapter.

The MCP server must call the same authenticated application services as the REST API; it must not create a hidden bypass around authorization.

Provide read-only tools first, such as:

- `search_products`
- `get_inventory_summary`
- `get_batch_status`
- `get_production_summary`
- `search_lab_records`
- `get_sales_summary`
- `get_overdue_receivables`
- `search_approved_documents`
- `get_pending_approvals`

Later, support narrowly scoped write tools such as creating a draft purchase requisition, drafting a customer response or preparing a sales quotation.

Requirements:

- Authentication and authorization on every tool call.
- Tenant and organization isolation.
- Tool input/output schema validation.
- Sensitive-field redaction.
- Rate limiting and usage logging.
- Audit events identifying the human or service account behind the request.
- Approval requirements for sensitive operations.
- No arbitrary SQL execution.
- No unrestricted shell access or arbitrary URL fetching.
- No direct mutation of stock, payments or approved formulations without the appropriate controlled workflow.

Use a maintained MCP SDK and verify the current protocol version and supported transports. Support a suitable local development transport and a secured remote transport when required. Never expose an unauthenticated production MCP endpoint.

# 9. WordPress and WooCommerce integration

OrganoClean already uses WordPress for marketing and e-commerce. Keep WordPress as the customer-facing website and WooCommerce as the online storefront if it is part of the existing site.

Do not rebuild the website inside the ERP.

## Integration architecture

`WordPress/WooCommerce → Signed Webhook → Integration Service or n8n → ERP API → ERP Database`

The reverse flow should publish only approved information:

`ERP Inventory/Product Status → Controlled Integration → WooCommerce Catalogue and Available Stock`

## Initial integration features

- Map WooCommerce product IDs to ERP product/SKU IDs.
- Import order events.
- Store external order IDs and idempotency keys.
- Map customer records carefully without creating unnecessary duplicates.
- Sync approved available-to-sell stock.
- Sync supported order status changes.
- Handle cancellations, refunds, returns and order failures.
- Retry transient failures.
- Display integration errors and provide safe manual reprocessing.
- Provide an initial product and order reconciliation report.
- Protect customer personal data and limit stored data to what is needed.

WooCommerce owns the checkout experience. The ERP owns manufacturing and its authoritative stock ledger. Clearly define which system owns each field and status.

Do not create a second inventory ledger in n8n. n8n orchestrates communication; it is not the system of record.

Use signed webhooks where supported, verify incoming events, protect credentials, and handle duplicated or out-of-order deliveries safely.

## Future WordPress features

- Publish approved product catalogue changes.
- Publish approved product specifications and documents.
- Update stock availability.
- Support distributor enquiry forms.
- Send order events to the ERP.
- Attribute marketing leads and campaigns.
- Trigger permitted customer notifications.
- Connect support tickets to relevant orders.

Document WordPress plugin dependencies and supported WooCommerce API versions.

# 10. Automation engine and workflow architecture

Keep automation separate from core ERP business logic.

Support integration with n8n and allow a future Cloudflare-native automation adapter where appropriate.

Initial workflow examples:

1. New WooCommerce order → validate and import.
2. Low stock → create replenishment task and notify the responsible manager.
3. New production batch → create associated material and QC tasks.
4. QC rejection → quarantine workflow and manager notification.
5. Invoice approaching due date → draft reminder.
6. New distributor lead → create CRM record and follow-up task.
7. New laboratory document → index authorized metadata for search.
8. Daily scheduled run → generate KPI snapshot and owner briefing.
9. Failed integration → alert administrator and permit controlled replay.
10. Expiring document or overdue calibration → notify responsible department.

Provide a documented webhook event catalogue and integration examples.

Do not trigger endless event loops when two systems update one another. Use event IDs, idempotency, source identifiers and loop-prevention rules.

The ERP must remain functional when n8n is down. Integration failures should be visible and recoverable.

# 11. Performance and resource efficiency

The platform must be fast on ordinary business hardware and modest infrastructure.

Priorities:

- Keep the runtime and dependency footprint small.
- Use Server Components and server-side data fetching appropriately.
- Avoid unnecessary client-side JavaScript.
- Use indexed queries, pagination and bounded result sets.
- Avoid loading complete transaction histories into memory.
- Use lazy loading for large modules and optional charts.
- Avoid polling continuously when webhooks, event-driven updates or scheduled jobs are sufficient.
- Cache only data that can be safely cached.
- Never cache confidential tenant-specific information across users or tenants.
- Keep background jobs bounded and retry-safe.
- Use streaming for long AI responses only where it improves the user experience.
- Make reports efficient and offer asynchronous exports for large datasets.
- Provide measurable performance targets and benchmark them with representative test data.

Measure bundle size, key page load times, API latency, query performance and resource use. Do not claim the product is "blazing fast" without evidence.

# 12. Security and data integrity

Implement and document:

- Server-side authorization and tenant isolation.
- Secure session cookies and CSRF protection where applicable.
- Input validation and output encoding.
- Protection against SQL injection and cross-site scripting.
- Secure handling of file uploads and downloads.
- Rate limiting on authentication, APIs and AI operations.
- Secret management and credential rotation.
- Audit trails for critical records.
- Database backup and tested restoration.
- Data retention and deletion policies.
- Dependency scanning and security updates.
- Secure error messages without stack traces or secrets.
- Appropriate safeguards for AI prompt injection and untrusted documents.
- A production deployment checklist.

Never trust instructions found inside uploaded documents, web pages, supplier files or customer messages as authorization to perform ERP actions.

# 13. Open-source product strategy

Build the core as a reusable open-source product rather than a private OrganoClean-only application.

Requirements:

- Separate shared application code from tenant-specific configuration.
- Provide realistic synthetic demo data.
- Provide environment variable documentation and an `.env.example` containing placeholders only.
- Include database migrations and reproducible development setup.
- Include Docker Compose for local development or optional services when appropriate.
- Include a supported Cloudflare deployment guide.
- Document alternative deployment requirements honestly.
- Keep proprietary API keys and private formulations out of the repository.
- Provide contribution guidelines, issue templates, security reporting instructions and a code of conduct.
- Include a changelog and versioning policy.
- Evaluate and document an appropriate open-source license before the first public release. Do not silently select a license without explaining its implications.
- Identify third-party license obligations and attribution requirements.
- Keep integrations modular so the core is not dependent on a single commercial provider.

The product should be extensible to detergents, household cleaning products, personal care, industrial chemicals, coatings, adhesives, specialty formulations and other chemistry-related manufacturing domains, subject to each industry's specific requirements.

# 14. Documentation — mandatory deliverables

Create and maintain the following documentation, adapting filenames if the repository already has a consistent structure.

- `README.md` — product overview, features, quick start and screenshots.
- `docs/PROJECT_ASSESSMENT.md` — existing state and gap analysis.
- `docs/PRODUCT_VISION.md` — product vision and target users.
- `docs/ARCHITECTURE.md` — system architecture and deployment choices.
- `docs/IMPLEMENTATION_ROADMAP.md` — phased backlog and dependencies.
- `docs/TECH_STACK.md` — stack decisions and trade-offs.
- `docs/DATABASE_SCHEMA.md` — entities, relationships and tenant boundaries.
- `docs/ERD.md` — entity relationship diagram.
- `docs/AUTHORIZATION.md` — roles, permissions and approval matrix.
- `docs/AUDIT_LOGGING.md` — activity, sessions and audit semantics.
- `docs/MANUFACTURING_WORKFLOWS.md` — material, batch and production lifecycle.
- `docs/DIGITAL_LAB.md` — experiments, formulations, samples and result records.
- `docs/AI_INTEGRATIONS.md` — providers, key management, data privacy and model evaluation.
- `docs/MCP_SERVER.md` — MCP setup, tools, security and transport.
- `docs/API_REFERENCE.md` — API overview and examples.
- `docs/WEBHOOKS.md` — event catalogue, signatures, retries and replay.
- `docs/WORDPRESS_WOOCOMMERCE.md` — connection and reconciliation.
- `docs/N8N_AUTOMATIONS.md` — workflow setup and failure handling.
- `docs/CLOUDFLARE_DEPLOYMENT.md` — deployment prerequisites and instructions.
- `docs/LOCAL_DEVELOPMENT.md` — local setup and test commands.
- `docs/BACKUP_AND_RECOVERY.md` — backups and restoration testing.
- `docs/SECURITY.md` — threat model and security practices.
- `docs/TESTING.md` — test strategy and test execution.
- `docs/CONTRIBUTING.md` — contributor workflow.
- `docs/OPEN_SOURCE_RELEASE.md` — licensing, release checklist and third-party notices.
- `docs/ADR/` — architecture decision records.

Keep documentation synchronized with actual implementation. A document describing a future feature must label it as planned, not implemented.

# 15. Development and testing requirements

Use automated tests throughout the project.

Required test categories:

- Unit tests for business rules and calculations.
- Integration tests for database operations and APIs.
- Authorization and role-permission tests.
- Cross-tenant isolation tests.
- Authentication and session lifecycle tests.
- Inventory movement and stock reconciliation tests.
- Manufacturing batch and formula-version tests.
- Financial arithmetic and rounding tests.
- Webhook signature, duplication, ordering and retry tests.
- AI-provider failure and invalid-output tests.
- MCP authorization and input-validation tests.
- End-to-end tests for critical business workflows.

Provide seed data that uses fictional products, suppliers, employees, customers and chemical formulations.

Include negative tests: unauthorized users must fail; invalid state transitions must fail; repeated webhook delivery must not duplicate orders; invalid material quantities must be rejected; and failed AI calls must not corrupt business records.

Use linting, formatting, TypeScript checks, migrations validation and production builds as part of the quality gate.

# 16. Phased implementation plan

Do not try to finish every module in the first development pass.

## Phase 0 — Assess and plan

Inspect the repository, verify the deployment target, document risks and produce the backlog.

## Phase 1 — Platform foundation

Build authentication, tenants, users, permissions, audit logging, database migrations, navigation, settings and CI-quality checks.

## Phase 2 — Core chemical manufacturing

Build product master data, units, suppliers, inventory ledger, purchasing, BOM/formulation versioning, production batches and basic quality records.

## Phase 3 — Digital Lab

Implement experiment registers, samples, measurements, controlled formulation revisions, document attachments and review workflows.

## Phase 4 — Sales and finance foundations

Implement customers, orders, quotations, invoice records, payments tracking and documented cost calculations. Clearly define whether double-entry accounting is in scope.

## Phase 5 — Integration platform

Implement versioned APIs, OpenAPI documentation, scoped credentials, webhooks, idempotency, event logs and an initial WooCommerce connector.

## Phase 6 — AI and MCP

Implement the provider abstraction, secure OpenRouter configuration, at least one alternative provider adapter, AI usage logging, read-only MCP tools and human-approved draft actions.

## Phase 7 — Automation and intelligence

Connect n8n, build the first five operational workflows, then add analytics, forecasting and AI-generated management reports.

## Phase 8 — Hardening and public release

Complete security review, backup and restoration tests, deployment documentation, reproducible installation, contribution guidelines, licensing review and release checklist.

# 17. Definition of done

A module is not complete merely because its screen looks finished.

A module is complete when:

1. Its business rules are implemented server-side.
2. Its schema and migrations are documented.
3. Its authorization and tenant isolation are tested.
4. Its primary workflows function end to end.
5. Validation and failure states are handled.
6. Important actions are audited.
7. Its tests pass.
8. Its documentation matches its implementation.
9. Its deployment requirements are documented.
10. It does not rely on hardcoded demo values for real business calculations.

# 18. Immediate tasks

Start by doing the following:

1. Inspect the entire existing project and Git status.
2. Identify the framework, database, ORM, authentication system and deployment configuration.
3. Produce the project assessment, architecture proposal and phased backlog.
4. Recommend the smallest viable architecture for the first deployment.
5. Identify the critical data model and tenant/security risks.
6. Propose the first vertical slice: login → organization/department → user roles → audit event → product master data.
7. Implement that slice with migrations, tests and documentation.
8. Run the actual tests and build; report their results accurately.
9. Summarize files changed, commands executed, known issues and the next three tasks.
10. Continue incrementally without replacing working features or attempting to generate all modules at once.

# 19. Icon guidelines (UI)

Use only the best, simple, cohesive icons from professional icon sources. Prefer minimalist **line/stroke-style icon sets** that ship as code (npm packages for React) so icons live directly in the code repository and stay visually uniform across the ERP.

Best icon sources (in order of preference for this project):

1. **Hugeicons (preferred, developer-first):** 60,000+ scalable stroke icons built for modern digital interfaces, with a native React npm integration — clean stroke lines implemented directly in code. Best fit for the ERP codebase.
2. **Flaticon Enterprise Resource Planning Pack:** 50 perfectly cohesive minimalist line icons covering accounting, HR, inventory, supply chain and CRM — useful as a pre-matched full system for UI uniformity.
3. **Icons8 ERP System Set:** collections matching enterprise software frameworks (Microsoft Business Central, SAP, Windows Office styles); filter by UI families such as "Cute Outline" or "Material Two Tone" for corporate-familiar dashboards.
4. **Iconscout:** 1,000+ ERP-related icons across line, dual-tone, flat and isometric styles — good for integration systems, analytics tools and databases.
5. **The Noun Project:** professional, symbol-focused, un-cluttered icons from a designer community built around a unified visual language.

Rules:

- Pick one family/style and stick to it everywhere (uniform stroke width and visual weight).
- Icons are decoration/denotation only — never convey information without an accompanying text label in critical workflows.
- Respect license terms of the chosen set; record attribution requirements in `docs/OPEN_SOURCE_RELEASE.md`.

# 20. Infrastructure note

- GitHub (MHK-TECH/organoclean-erp) is connected to Cloudflare for deployment.
- The repo is currently empty; the Cloudflare build will activate once the Next.js application and required build configuration are pushed.

# 21. Final product objective

Deliver an open-source, resource-efficient, AI-powered ERP and Digital Lab platform that gives chemical manufacturers control over their products, formulas, materials, batches, quality, stock, finances and business intelligence.

OrganoClean is the first pilot tenant, not the limit of the product's design.

The long-term advantage must come from **manufacturing-specific workflows, reliable traceability, configurable laboratory records, secure integration APIs, AI-assisted decision support, excellent documentation and efficient deployment** — not simply from adding an AI chatbot to a generic ERP.

**Begin by inspecting the repository and producing the assessment and implementation roadmap. Do not skip directly to generating the entire application.**
