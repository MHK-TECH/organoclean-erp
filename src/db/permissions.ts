/**
 * Permission catalog — the single source of truth for RBAC keys.
 * Seeded into the `permissions` table; enforced server-side by src/server/auth.
 * Keep keys `module.verb`. Adding a key here may require a seed/migration run.
 */
export const PERMISSIONS = [
  { key: "inventory.read", module: "inventory", description: "View stock levels, movements and valuation" },
  { key: "inventory.adjust", module: "inventory", description: "Create stock adjustments with movement records" },
  { key: "inventory.transfer", module: "inventory", description: "Move stock between locations" },

  { key: "products.read", module: "products", description: "View product catalog and specifications" },
  { key: "products.write", module: "products", description: "Create and edit products, SKUs and categories" },

  { key: "formulation.read", module: "formulations", description: "View formulations and BOMs within access scope" },
  { key: "formulation.edit", module: "formulations", description: "Create formulation drafts and revisions" },
  { key: "formulation.approve", module: "formulations", description: "Approve and release formula versions for production" },

  { key: "production.read", module: "production", description: "View work orders and batch status" },
  { key: "production.create", module: "production", description: "Create work orders and batches" },
  { key: "production.approve", module: "production", description: "Approve batches and apply state transitions" },

  { key: "lab.read", module: "lab", description: "View experiments, samples and results" },
  { key: "lab.write", module: "lab", description: "Record experiments, samples and measurements" },
  { key: "lab.approve", module: "lab", description: "Review and approve lab records" },

  { key: "quality.read", module: "quality", description: "View inspections, specs and nonconformances" },
  { key: "quality.record", module: "quality", description: "Record inspection results and deviations" },
  { key: "quality.approve", module: "quality", description: "Approve QC and release/reject batches" },

  { key: "procurement.read", module: "procurement", description: "View suppliers, requisitions and POs" },
  { key: "procurement.write", module: "procurement", description: "Create requisitions, POs and goods receipts" },
  { key: "procurement.approve", module: "procurement", description: "Approve POs and receipts" },

  { key: "sales.read", module: "sales", description: "View customers, quotes and orders" },
  { key: "sales.write", module: "sales", description: "Create quotes and orders" },
  { key: "invoice.approve", module: "finance", description: "Approve invoices and credit notes" },
  { key: "finance.read", module: "finance", description: "View financial reports and ledgers" },
  { key: "finance.write", module: "finance", description: "Record payments and expenses" },

  { key: "users.manage", module: "admin", description: "Invite, disable users and assign roles" },
  { key: "settings.manage", module: "admin", description: "Manage organization settings, units and numbering" },
  { key: "integrations.manage", module: "admin", description: "Manage API credentials, webhooks and integrations" },
  { key: "audit.read", module: "admin", description: "View audit trail and session history (CEO/admin/auditor)" },
  { key: "modules.manage", module: "admin", description: "Enable/disable platform modules for the tenant" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];
