import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { writeAudit, hashPassword, ensurePermissionCatalog } from "@/server/auth";
import { tenants, users, roles, userRoles, rolePermissions, permissions, locations, products } from "@/db/schema";

/**
 * Bootstrap: creates the default tenant (pilot: OrganoClean-PK with fictional data),
 * builtin roles, owner account, and the demo main warehouse + product seed.
 * Idempotent: skips silently when the tenant slug already exists.
 */

export const DEMO_ROLES: { key: string; name: string; permissions: string[] }[] = [
  { key: "org_owner", name: "Organization Owner / CEO", permissions: ["*"] },
  {
    key: "erp_admin",
    name: "ERP Administrator",
    permissions: [
      "products.read", "products.write", "inventory.read", "inventory.adjust", "inventory.transfer",
      "users.manage", "settings.manage", "audit.read", "modules.manage", "integrations.manage",
      "lab.read", "lab.write", "lab.approve", "formulation.read", "formulation.edit", "formulation.approve",
      "production.read", "production.create", "production.approve", "quality.read", "quality.record", "quality.approve",
      "procurement.read", "procurement.write", "procurement.approve", "sales.read", "sales.write",
      "invoice.approve", "finance.read", "finance.write",
    ],
  },
  { key: "production_manager", name: "Production Manager", permissions: ["production.read", "production.create", "production.approve", "formulation.read", "inventory.read", "quality.read", "lab.read"] },
  { key: "lab_scientist", name: "Laboratory / R&D Scientist", permissions: ["lab.read", "lab.write", "formulation.read", "formulation.edit", "products.read"] },
  { key: "qa_manager", name: "Quality Assurance Manager", permissions: ["quality.read", "quality.record", "quality.approve", "production.read", "inventory.read", "lab.read"] },
  { key: "inventory_manager", name: "Inventory Manager", permissions: ["inventory.read", "inventory.adjust", "inventory.transfer", "products.read", "procurement.read", "procurement.write"] },
  { key: "sales_manager", name: "Sales Manager", permissions: ["sales.read", "sales.write", "customers", "products.read", "invoice.approve", "finance.read"] },
  { key: "auditor_readonly", name: "Auditor (read-only)", permissions: ["inventory.read", "production.read", "quality.read", "procurement.read", "sales.read", "finance.read", "audit.read"] },
];

const PERMISSION_ALL = "*";

export function bootstrapDemoTenant(): {
  tenantId: string;
  users: { email: string; password: string; role: string }[];
} {
  ensurePermissionCatalog();
  const db = getDb();

  const existing = db.select().from(tenants).where(eq(tenants.slug, "organoclean")).get();
  if (existing) {
    const owner = db.select().from(users).where(eq(users.email, "owner@organoclean.pk")).get();
    return {
      tenantId: existing.id,
      users: [
        { email: "owner@organoclean.pk", password: "Owner@12345", role: "org_owner" },
      ],
    };
  }

  // tenant
  const tenantId = crypto.randomUUID();
  db.insert(tenants).values({ id: tenantId, name: "OrganoClean (Pilot)", slug: "organoclean" }).run();

  // roles + grants
  const builtinRoleIds = new Map<string, string>();
  for (const r of DEMO_ROLES) {
    const roleId = crypto.randomUUID();
    builtinRoleIds.set(r.key, roleId);
    db.insert(roles).values({ id: roleId, tenantId: null, key: r.key, name: r.name, isBuiltin: true }).run();
    for (const perm of r.permissions) {
      if (perm === PERMISSION_ALL) continue;
      db.insert(rolePermissions).values({ roleId, permissionKey: perm }).onConflictDoNothing().run();
    }
  }
  // org_owner gets everything
  if (builtinRoleIds.has("org_owner")) {
    const all = db.select().from(permissions).all();
    for (const p of all) {
      db.insert(rolePermissions)
        .values({ roleId: builtinRoleIds.get("org_owner")!, permissionKey: p.key })
        .onConflictDoNothing()
        .run();
    }
  }

  // main location
  const locId = crypto.randomUUID();
  db.insert(locations).values({ id: locId, tenantId, name: "Main Warehouse", code: "WH-MAIN", kind: "warehouse" }).run();
  const loc2 = crypto.randomUUID();
  db.insert(locations).values({ id: loc2, tenantId, name: "Production Facility", code: "PLANT-1", kind: "facility" }).run();

  // owner user
  const ownerId = crypto.randomUUID();
  db.insert(users)
    .values({
      id: ownerId,
      tenantId,
      email: "owner@organoclean.pk",
      passwordHash: hashPassword("Owner@12345"),
      fullName: "Muhammad Huzaifa Khilji",
      employeeCode: "OC-0001",
      emailVerifiedAt: new Date(),
    })
    .run();
  db.insert(userRoles).values({ userId: ownerId, roleId: builtinRoleIds.get("org_owner")! }).run();

  writeAudit({
    tenantId,
    actorUserId: ownerId,
    actorType: "job",
    action: "system.bootstrap",
    entityType: "tenant",
    entityId: tenantId,
    source: "automation",
    summary: "Demo tenant bootstrapped with builtin roles and owner account",
  });

  // demo product seed (generic, no private formulas)
  const demoProducts = [
    { sku: "RM-SCDW90", name: "Sodium C14-16 Olefin Sulfonate 90%", kind: "raw", unit: "kg" },
    { sku: "RM-CDEA", name: "Cocamide DEA", kind: "raw", unit: "kg" },
    { sku: "RM-GSLT", name: "Glycerin", kind: "raw", unit: "kg" },
    { sku: "RM-CAEW", name: "Citric Acid Anhydrous", kind: "raw", unit: "kg" },
    { sku: "RM-PGSW", name: "Preservative (Phenoxyethanol)", kind: "raw", unit: "kg" },
    { sku: "FG-WD-5L", name: "Multi-Purpose Diluted Cleaner 5L", kind: "finished", unit: "pcs" },
    { sku: "FG-DSH-1L", name: "Dishwashing Liquid 1L", kind: "finished", unit: "pcs" },
    { sku: "FG-HWC-2L", name: "Hardwood Cleaner 2L", kind: "finished", unit: "pcs" },
    { sku: "PK-BTL5L", name: "5L Seal Bottle", kind: "packaging", unit: "pcs" },
    { sku: "PK-BTL1L", name: "1L HDPE Bottle", kind: "packaging", unit: "pcs" },
  ];
  for (const p of demoProducts) {
    db.insert(products)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        sku: p.sku,
        name: p.name,
        kind: p.kind,
        baseUnit: p.unit,
        category: p.kind,
      })
      .run();
  }

  return {
    tenantId,
    users: [
      { email: "owner@organoclean.pk", password: "Owner@12345", role: "org_owner" },
    ],
  };
}
