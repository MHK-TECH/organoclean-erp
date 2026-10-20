/**
 * OrganoClean ERP â€” full operational schema. SQLite (D1-compatible).
 * All rows tenant-scoped. Money = integer minor units. Quantities = TEXT decimals + explicit unit.
 */
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const id = () => ({ id: text().notNull().primaryKey() });
const tsC = () => ({ createdAt: integer({ mode: "timestamp_ms" }).notNull().default(sql`(unixepoch('subsec') * 1000)`) });
const tsU = () => ({ updatedAt: integer({ mode: "timestamp_ms" }).notNull().default(sql`(unixepoch('subsec') * 1000)`) });

export const tenants = sqliteTable("tenants", {
  ...id(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  country: text().notNull().default("PK"),
  currency: text().notNull().default("PKR"),
  timezone: text().notNull().default("Asia/Karachi"),
  decimalDigits: integer().notNull().default(2),
  active: integer({ mode: "boolean" }).notNull().default(true),
  ...tsC(),
});

export const users = sqliteTable(
  "users",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    email: text().notNull(),
    emailVerifiedAt: integer({ mode: "timestamp_ms" }),
    passwordHash: text().notNull(),
    fullName: text().notNull(),
    employeeCode: text(),
    status: text().notNull().default("active"),
    isServiceAccount: integer({ mode: "boolean" }).notNull().default(false),
    isPlatformSuperAdmin: integer({ mode: "boolean" }).notNull().default(false),
    locale: text().notNull().default("en"),
    ...tsC(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    index("users_tenant_idx").on(t.tenantId, t.status),
  ],
);

export const roles = sqliteTable(
  "roles",
  {
    ...id(),
    tenantId: text().references(() => tenants.id),
    key: text().notNull(),
    name: text().notNull(),
    isBuiltin: integer({ mode: "boolean" }).notNull().default(false),
    ...tsC(),
  },
  (t) => [uniqueIndex("roles_tenant_key_unique").on(t.tenantId, t.key), index("roles_tenant_idx").on(t.tenantId)],
);

export const permissions = sqliteTable("permissions", {
  key: text().primaryKey(),
  description: text().notNull(),
  module: text().notNull(),
});

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: text().notNull().references(() => roles.id),
    permissionKey: text().notNull().references(() => permissions.key),
    ...tsC(),
  },
  (t) => [uniqueIndex("role_permissions_unique").on(t.roleId, t.permissionKey), index("role_permissions_perm_idx").on(t.permissionKey)],
);

export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text().notNull().references(() => users.id),
    roleId: text().notNull().references(() => roles.id),
    ...tsC(),
  },
  (t) => [uniqueIndex("user_roles_unique").on(t.userId, t.roleId), index("user_roles_role_idx").on(t.roleId)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    ...id(),
    userId: text().notNull().references(() => users.id),
    tokenHash: text().notNull().unique(),
    expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
    lastActivityAt: integer({ mode: "timestamp_ms" }).notNull().default(sql`(unixepoch('subsec') * 1000)`),
    revokedAt: integer({ mode: "timestamp_ms" }),
    revokedReason: text(),
    ip: text(),
    userAgent: text(),
    ...tsC(),
  },
  (t) => [index("sessions_user_idx").on(t.userId, t.revokedAt)],
);

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    ...id(),
    tenantId: text().references(() => tenants.id),
    emailAttempted: text().notNull(),
    success: integer({ mode: "boolean" }).notNull(),
    ip: text(),
    userAgent: text(),
    ...tsC(),
  },
  (t) => [index("login_attempts_email_idx").on(t.emailAttempted, t.createdAt)],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    ...id(),
    tenantId: text().references(() => tenants.id),
    actorUserId: text().references(() => users.id),
    actorType: text().notNull().default("human"),
    messageId: text().notNull(),
    prevMessageId: text(),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: text().notNull(),
    requestId: text(),
    source: text().notNull().default("web"),
    beforeJson: text(),
    afterJson: text(),
    ip: text(),
    ...tsC(),
  },
  (t) => [
    index("audit_events_tenant_idx").on(t.tenantId, t.createdAt),
    index("audit_events_entity_idx").on(t.entityType, t.entityId),
    index("audit_events_actor_idx").on(t.actorUserId, t.createdAt),
  ],
);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Products & catalog â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export const products = sqliteTable(
  "products",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    sku: text().notNull(),
    name: text().notNull(),
    kind: text().notNull().default("finished"), // raw | intermediate | finished | packaging
    category: text(),
    baseUnit: text().notNull(), // kg | L | pcs ...
    salesPriceMinor: integer().notNull().default(0), // per base unit
    costPriceMinor: integer().notNull().default(0),
    reorderPoint: text("reorder_point").notNull().default("0"), // decimal string
    minStock: text().notNull().default("0"),
    description: text(),
    sdsRef: text(),
    tdsRef: text(),
    hazardClass: text(),
    status: text().notNull().default("active"), // draft | active | archived
    ...tsC(),
    ...tsU(),
  },
  (t) => [
    uniqueIndex("products_tenant_sku_unique").on(t.tenantId, t.sku),
    index("products_tenant_kind_idx").on(t.tenantId, t.kind),
  ],
);

export const locations = sqliteTable(
  "locations",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    name: text().notNull(),
    code: text().notNull(),
    kind: text().notNull().default("warehouse"), // warehouse | facility | transit
    ...tsC(),
  },
  (t) => [uniqueIndex("locations_tenant_code_unique").on(t.tenantId, t.code)],
);

/** Immutable stock ledger. Never mutate qty without inserting a move. */
export const stockMoves = sqliteTable(
  "stock_moves",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    productId: text().notNull().references(() => products.id),
    locationId: text().notNull().references(() => locations.id),
    direction: text().notNull(), // in | out | adjust
    qty: text().notNull(), // decimal string, positive; direction gives sign
    unit: text().notNull(),
    lotNo: text(),
    batchId: text(),
    reason: text().notNull(), // purchase | consumption | production_output | sale | adjustment | transfer_in | transfer_out
    refType: text(), // purchase_order | sales_order | batch | count
    refId: text(),
    unitCostMinor: integer().notNull().default(0),
    note: text(),
    createdBy: text().references(() => users.id),
    ...tsC(),
  },
  (t) => [
    index("moves_tenant_product_idx").on(t.tenantId, t.productId),
    index("moves_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("moves_lot_idx").on(t.tenantId, t.lotNo),
    index("moves_batch_idx").on(t.tenantId, t.batchId),
  ],
);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Procurement â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export const suppliers = sqliteTable(
  "suppliers",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    name: text().notNull(),
    contact: text(),
    email: text(),
    phone: text(),
    address: text(),
    leadTimeDays: integer().notNull().default(7),
    rating: integer().notNull().default(0), // 0..5
    status: text().notNull().default("active"),
    ...tsC(),
  },
  (t) => [index("suppliers_tenant_idx").on(t.tenantId)],
);

export const purchaseOrders = sqliteTable(
  "purchase_orders",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    poNumber: text().notNull(),
    supplierId: text().notNull().references(() => suppliers.id),
    status: text().notNull().default("draft"), // draft | submitted | approved | received | closed | cancelled
    currency: text().notNull().default("PKR"),
    totalMinor: integer().notNull().default(0),
    notes: text(),
    expectedAt: integer({ mode: "timestamp_ms" }),
    receivedAt: integer({ mode: "timestamp_ms" }),
    createdBy: text().references(() => users.id),
    approvedBy: text().references(() => users.id),
    ...tsC(),
  },
  (t) => [
    uniqueIndex("po_tenant_number_unique").on(t.tenantId, t.poNumber),
    index("po_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

export const purchaseOrderItems = sqliteTable(
  "purchase_order_items",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    poId: text().notNull().references(() => purchaseOrders.id),
    productId: text().notNull().references(() => products.id),
    qty: text().notNull(),
    unit: text().notNull(),
    unitPriceMinor: integer().notNull().default(0),
    receivedQty: text().notNull().default("0"),
    ...tsC(),
  },
  (t) => [index("poi_po_idx").on(t.poId)],
);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Formulations & production â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export const formulas = sqliteTable(
  "formulas",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    productId: text().notNull().references(() => products.id),
    version: integer().notNull().default(1),
    name: text().notNull(),
    batchSize: text().notNull().default("1"), // planned qty
    batchUnit: text().notNull(),
    concentration: text(),
    yieldPct: text().notNull().default("95"),
    status: text().notNull().default("draft"), // draft | under_review | approved | retired
    approvedBy: text().references(() => users.id),
    approvedAt: integer({ mode: "timestamp_ms" }),
    notes: text(),
    confidential: integer({ mode: "boolean" }).notNull().default(true),
    ...tsC(),
  },
  (t) => [
    uniqueIndex("formula_tenant_product_version_unique").on(t.tenantId, t.productId, t.version),
    index("formula_status_idx").on(t.tenantId, t.status),
  ],
);

export const formulaItems = sqliteTable(
  "formula_items",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    formulaId: text().notNull().references(() => formulas.id),
    ingredientId: text().notNull().references(() => products.id),
    qty: text().notNull(),
    unit: text().notNull(),
    pct: text(), // % of total formulation
    note: text(),
    // line order
    sortOrder: integer().notNull().default(0),
    ...tsC(),
  },
  (t) => [index("fi_formula_idx").on(t.formulaId)],
);

export const batches = sqliteTable(
  "batches",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    batchNo: text().notNull(),
    productId: text().notNull().references(() => products.id),
    formulaId: text().notNull().references(() => formulas.id),
    plannedQty: text().notNull(),
    producedQty: text().notNull().default("0"),
    unit: text().notNull(),
    status: text().notNull().default("planned"), // planned|approved|materials_issued|in production|qc_pending|released|rejected|closed
    startedAt: integer({ mode: "timestamp_ms" }),
    completedAt: integer({ mode: "timestamp_ms" }),
    releasedAt: integer({ mode: "timestamp_ms" }),
    operator: text().references(() => users.id),
    locationId: text().references(() => locations.id),
    drinkLots: text(),
    note: text(),
    ...tsC(),
  },
  (t) => [
    uniqueIndex("batch_tenant_no_unique").on(t.tenantId, t.batchNo),
    index("batch_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

export const batchConsumptions = sqliteTable(
  "batch_consumptions",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    batchId: text().notNull().references(() => batches.id),
    productId: text().notNull().references(() => products.id),
    qtyPlanned: text().notNull(),
    qtyActual: text().notNull().default("0"),
    unit: text().notNull(),
    lotNo: text(),
    ...tsC(),
  },
  (t) => [index("bc_batch_idx").on(t.batchId)],
);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Lab / R&D â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export const experiments = sqliteTable(
  "experiments",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    title: text().notNull(),
    productId: text().references(() => products.id),
    objective: text(),
    hypothesis: text(),
    status: text().notNull().default("open"), // open | in_progress | completed | archived
    authorId: text().references(() => users.id),
    reviewerId: text().references(() => users.id),
    reviewedAt: integer({ mode: "timestamp_ms" }),
    resultsJson: text(),
    conclusion: text(),
    nextSteps: text(),
    ...tsC(),
  },
  (t) => [index("exp_tenant_status_idx").on(t.tenantId, t.status)],
);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Quality â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export const qcInspections = sqliteTable(
  "qc_inspections",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    productId: text().notNull().references(() => products.id),
    batchId: text().references(() => batches.id),
    lotNo: text(),
    kind: text().notNull().default("finished"), // incoming | in_process | finished
    inspectedAt: integer({ mode: "timestamp_ms" }),
    inspectorId: text().references(() => users.id),
    ph: text(),
    viscosity: text(),
    density: text(),
    appearance: text(),
    result: text().notNull().default("pending"), // pending | pass | fail | conditional
    comments: text(),
    ...tsC(),
  },
  (t) => [index("qc_tenant_result_idx").on(t.tenantId, t.result), index("qc_batch_idx").on(t.batchId)],
);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Commercial â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export const customers = sqliteTable(
  "customers",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    name: text().notNull(),
    kind: text().notNull().default("retail"), // retail | wholesale | distributor
    email: text(),
    phone: text(),
    address: text(),
    creditLimitMinor: integer().notNull().default(0),
    externalRef: text(), // WooCommerce customer id
    status: text().notNull().default("active"),
    ...tsC(),
  },
  (t) => [index("cust_tenant_idx").on(t.tenantId, t.kind)],
);

export const salesOrders = sqliteTable(
  "sales_orders",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    orderNo: text().notNull(),
    customerId: text().notNull().references(() => customers.id),
    status: text().notNull().default("draft"), // draft | confirmed | dispatched | completed | cancelled
    currency: text().notNull().default("PKR"),
    totalMinor: integer().notNull().default(0),
    channel: text().notNull().default("direct"), // direct | woocommerce | distributor
    externalRef: text(),
    placedAt: integer({ mode: "timestamp_ms" }),
    dispatchedAt: integer({ mode: "timestamp_ms" }),
    createdBy: text().references(() => users.id),
    ...tsC(),
  },
  (t) => [
    uniqueIndex("so_tenant_number_unique").on(t.tenantId, t.orderNo),
    index("so_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

export const salesOrderItems = sqliteTable(
  "sales_order_items",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    orderId: text().notNull().references(() => salesOrders.id),
    productId: text().notNull().references(() => products.id),
    qty: text().notNull(),
    unit: text().notNull(),
    unitPriceMinor: integer().notNull().default(0),
    ...tsC(),
  },
  (t) => [index("soi_order_idx").on(t.orderId)],
);

export const invoices = sqliteTable(
  "invoices",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    invoiceNo: text().notNull(),
    customerId: text().notNull().references(() => customers.id),
    orderId: text().references(() => salesOrders.id),
    kind: text().notNull().default("sales"), // sales | credit_note
    status: text().notNull().default("draft"), // draft | approved | paid | partial | overdue | cancelled
    currency: text().notNull().default("PKR"),
    totalMinor: integer().notNull().default(0),
    paidMinor: integer().notNull().default(0),
    issuedAt: integer({ mode: "timestamp_ms" }),
    dueAt: integer({ mode: "timestamp_ms" }),
    approvedBy: text().references(() => users.id),
    ...tsC(),
  },
  (t) => [
    uniqueIndex("inv_tenant_number_unique").on(t.tenantId, t.invoiceNo),
    index("inv_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    customerId: text().references(() => customers.id),
    supplierId: text().references(() => suppliers.id),
    invoiceId: text().references(() => invoices.id),
    purchaseOrderId: text().references(() => purchaseOrders.id),
    amountMinor: integer().notNull(),
    currency: text().notNull().default("PKR"),
    method: text().notNull().default("bank"), // bank | cash | cheque
    receivedAt: integer({ mode: "timestamp_ms" }),
    note: text(),
    createdBy: text().references(() => users.id),
    ...tsC(),
  },
  (t) => [index("pay_tenant_idx").on(t.tenantId, t.createdAt)],
);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Ops & workspace â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export const equipment = sqliteTable(
  "equipment",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    name: text().notNull(),
    model: text(),
    locationId: text().references(() => locations.id),
    status: text().notNull().default("operational"), // operational | maintenance | breakdown | retired
    lastCalibratedAt: integer({ mode: "timestamp_ms" }),
    nextServiceAt: integer({ mode: "timestamp_ms" }),
    ...tsC(),
  },
  (t) => [index("equip_tenant_idx").on(t.tenantId, t.status)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    title: text().notNull(),
    description: text(),
    assignedTo: text().references(() => users.id),
    priority: text().notNull().default("normal"), // low | normal | high | urgent
    status: text().notNull().default("open"), // open | in_progress | done | cancelled
    dueAt: integer({ mode: "timestamp_ms" }),
    relatedEntityType: text(),
    relatedEntityId: text(),
    createdBy: text().references(() => users.id),
    ...tsC(),
  },
  (t) => [index("tasks_tenant_status_idx").on(t.tenantId, t.status), index("tasks_assignee_idx").on(t.assignedTo)],
);

export const documents = sqliteTable(
  "documents",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    name: text().notNull(),
    kind: text().notNull().default("other"), // sds | tds | sop | certificate | report | other
    externalUrl: text(),
    version: integer().notNull().default(1),
    status: text().notNull().default("active"),
    reviewedAt: integer({ mode: "timestamp_ms" }),
    ...tsC(),
  },
  (t) => [index("doc_tenant_kind_idx").on(t.tenantId, t.kind)],
);

export const settings = sqliteTable(
  "settings",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    key: text().notNull(),
    value: text().notNull(),
    ...tsC(),
  },
  (t) => [uniqueIndex("settings_tenant_key_unique").on(t.tenantId, t.key)],
);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ integrations â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export const integrationEvents = sqliteTable(
  "integration_events",
  {
    ...id(),
    tenantId: text().notNull().references(() => tenants.id),
    source: text().notNull(), // woocommerce | n8n
    eventType: text().notNull(),
    externalEventId: text(),
    status: text().notNull().default("received"), // received | processed | failed | skipped
    payloadJson: text(),
    error: text(),
    processedAt: integer({ mode: "timestamp_ms" }),
    ...tsC(),
  },
  (t) => [
    index("ie_tenant_source_idx").on(t.tenantId, t.source),
    uniqueIndex("ie_tenant_dedupe_unique").on(t.tenantId, t.source, t.externalEventId),
  ],
);

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type StockMove = typeof stockMoves.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type Formula = typeof formulas.$inferSelect;
export type Batch = typeof batches.$inferSelect;
export type Experiment = typeof experiments.$inferSelect;
export type QcInspection = typeof qcInspections.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type SalesOrder = typeof salesOrders.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Equipment = typeof equipment.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;

