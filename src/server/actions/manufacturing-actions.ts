"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  batchConsumptions,
  batches,
  experiments,
  formulaItems,
  formulas,
  locations,
  products,
  qcInspections,
  tasks,
} from "@/db/schema";
import { ensurePermission } from "@/server/guard";
import { writeAudit } from "@/server/auth";
import { requireFrom, optionalStr, parseQtyPositive } from "@/lib/money";
import { nextNumber, insertStockMove } from "@/server/services/core";

/* ───────── Formulations ───────── */

export async function createFormulaAction(formData: FormData) {
  let error: string | null = null;
  let formulaId = "";
  try {
    const user = await ensurePermission("formulation.edit");
    const db = getDb();
    const productId = requireFrom(formData, "productId");
    const p = db.select().from(products).where(and(eq(products.id, productId), eq(products.tenantId, user.tenantId))).get();
    if (!p) throw new Error("Product not found");

    const maxV = db
      .select({ v: sql<number>`coalesce(max(${formulas.version}), 0)` })
      .from(formulas)
      .where(and(eq(formulas.tenantId, user.tenantId), eq(formulas.productId, productId)))
      .get();
    const version = Number(maxV?.v ?? 0) + 1;

    const id = crypto.randomUUID();
    db.insert(formulas)
      .values({
        id,
        tenantId: user.tenantId,
        productId,
        version,
        name: optionalStr(formData, "name") ?? `${p.name} formula v${version}`,
        batchSize: parseQtyPositive(formData.get("batchSize")) ?? "1",
        batchUnit: p.baseUnit,
        yieldPct: optionalStr(formData, "yieldPct") ?? "95",
        notes: optionalStr(formData, "notes"),
      })
      .run();

    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "formula.create", entityType: "formula", entityId: id,
      summary: `Formula v${version} drafted for ${p.sku}`,
    });
    formulaId = id;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/formulations");
  redirect(error ? `/formulations?error=${encodeURIComponent(error)}&f=${formulaId}` : `/formulations?saved=1&f=${formulaId}`);
}

export async function addFormulaItemAction(formData: FormData) {
  let error: string | null = null;
  let formulaId = "";
  try {
    const user = await ensurePermission("formulation.edit");
    const db = getDb();
    formulaId = requireFrom(formData, "formulaId");
    const f = db.select().from(formulas).where(and(eq(formulas.id, formulaId), eq(formulas.tenantId, user.tenantId))).get();
    if (!f) throw new Error("Formula not found");
    if (f.status !== "draft") throw new Error("Only draft formulas can be edited");

    const ing = db.select().from(products).where(and(eq(products.id, requireFrom(formData, "ingredientId")), eq(products.tenantId, user.tenantId))).get();
    if (!ing) throw new Error("Ingredient not found");

    const maxSort = db
      .select({ s: sql<number>`coalesce(max(${formulaItems.sortOrder}), 0)` })
      .from(formulaItems)
      .where(eq(formulaItems.formulaId, formulaId))
      .get();
    const qty = parseQtyPositive(formData.get("qty"));
    if (!qty) throw new Error("Quantity must be positive");

    db.insert(formulaItems)
      .values({
        id: crypto.randomUUID(),
        tenantId: user.tenantId,
        formulaId,
        ingredientId: ing.id,
        qty,
        unit: ing.baseUnit,
        note: optionalStr(formData, "note"),
        sortOrder: Number(maxSort?.s ?? 0) + 1,
      })
      .run();

    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "formula.add_item", entityType: "formula", entityId: formulaId,
      summary: `${ing.sku} × ${qty} ${ing.baseUnit} added to formula ${f.name}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/formulations");
  redirect(error ? `/formulations?error=${encodeURIComponent(error)}&f=${formulaId}` : `/formulations?saved=1&f=${formulaId}`);
}

export async function submitFormulaAction(formData: FormData) {
  const formulaId = String(formData.get("formulaId") ?? "");
  let error: string | null = null;
  try {
    const user = await ensurePermission("formulation.edit");
    const db = getDb();
    const f = db.select().from(formulas).where(and(eq(formulas.id, formulaId), eq(formulas.tenantId, user.tenantId))).get();
    if (!f) throw new Error("Formula not found");
    if (f.status !== "draft") throw new Error("Only draft formulas can be submitted");
    const n = db.select({ c: sql<number>`count(*)` }).from(formulaItems).where(eq(formulaItems.formulaId, formulaId)).get();
    if (Number(n?.c ?? 0) === 0) throw new Error("Add at least one ingredient first");
    db.update(formulas).set({ status: "under_review" }).where(eq(formulas.id, formulaId)).run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "formula.submit", entityType: "formula", entityId: formulaId,
      beforeJson: { status: f.status }, afterJson: { status: "under_review" },
      summary: `Formula ${f.name} submitted for review`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/formulations");
  redirect(error ? `/formulations?error=${encodeURIComponent(error)}&f=${formulaId}` : `/formulations?saved=1&f=${formulaId}`);
}

export async function approveFormulaAction(formData: FormData) {
  const formulaId = String(formData.get("formulaId") ?? "");
  let error: string | null = null;
  try {
    const user = await ensurePermission("formulation.approve");
    const db = getDb();
    const f = db.select().from(formulas).where(and(eq(formulas.id, formulaId), eq(formulas.tenantId, user.tenantId))).get();
    if (!f) throw new Error("Formula not found");
    if (f.status !== "under_review") throw new Error("Only formulas under review can be approved");
    // retire previous approved version, then release this one
    db.update(formulas)
      .set({ status: "retired" })
      .where(and(eq(formulas.tenantId, user.tenantId), eq(formulas.productId, f.productId), eq(formulas.status, "approved")))
      .run();
    db.update(formulas).set({ status: "approved", approvedBy: user.id, approvedAt: new Date() }).where(eq(formulas.id, formulaId)).run();

    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "formula.approve", entityType: "formula", entityId: formulaId,
      beforeJson: { status: f.status }, afterJson: { status: "approved" },
      summary: `Formula ${f.name} approved & released for production`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/formulations");
  revalidatePath("/production");
  redirect(error ? `/formulations?error=${encodeURIComponent(error)}&f=${formulaId}` : `/formulations?saved=1&f=${formulaId}`);
}

/* ───────── Production batches ───────── */

export async function createBatchAction(formData: FormData) {
  let error: string | null = null;
  let batchId = "";
  try {
    const user = await ensurePermission("production.create");
    const db = getDb();
    const formulaId = requireFrom(formData, "formulaId");
    const f = db.select().from(formulas).where(and(eq(formulas.id, formulaId), eq(formulas.tenantId, user.tenantId))).get();
    if (!f) throw new Error("Formula not found");
    if (f.status !== "approved") throw new Error("Batch must use an approved formula version");
    const size = parseQtyPositive(formData.get("plannedQty"));
    if (!size) throw new Error("Planned quantity must be positive");

    batchId = crypto.randomUUID();
    const batchNo = nextNumber(db, user.tenantId, batches, "B");
    db.insert(batches)
      .values({
        id: batchId,
        tenantId: user.tenantId,
        batchNo,
        productId: f.productId,
        formulaId,
        plannedQty: size,
        unit: f.batchUnit,
        operator: user.id,
        drinkLots: optionalStr(formData, "lotNo"),
      })
      .run();
    // snapshot planned consumption
    const items = db.select().from(formulaItems).where(eq(formulaItems.formulaId, formulaId)).all();
    const scale = Number(size) / Number(f.batchSize || "1");
    for (const it of items) {
      db.insert(batchConsumptions)
        .values({
          id: crypto.randomUUID(),
          tenantId: user.tenantId,
          batchId,
          productId: it.ingredientId,
          qtyPlanned: String(Number(it.qty) * scale),
          qtyActual: "0",
          unit: it.unit,
        })
        .run();
    }
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "batch.create", entityType: "batch", entityId: batchId,
      summary: `Batch ${batchNo} planned (${size} ${f.batchUnit}) from formula ${f.name}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/production");
  redirect(error ? `/production?error=${encodeURIComponent(error)}` : `/production?saved=1&batch=${batchId}`);
}

export async function setBatchStatusAction(formData: FormData) {
  const batchId = String(formData.get("batchId") ?? "");
  let error: string | null = null;
  try {
    const user = await ensurePermission("production.approve");
    const db = getDb();
    const target = String(formData.get("status") ?? "");
    const b = db.select().from(batches).where(and(eq(batches.id, batchId), eq(batches.tenantId, user.tenantId))).get();
    if (!b) throw new Error("Batch not found");

    const transitions: Record<string, string[]> = {
      approved: ["planned"],
      closed: ["released", "rejected"],
      cancelled_planned: [],
    };
    // note: allowed transitions — planned→approved. issued/production complete via submit actions.
    if (target === "") throw new Error("Invalid transition");
    if (target === "approved") {
      if (!transitions.approved.includes(b.status)) throw new Error(`Cannot approve from ${b.status}`);
      db.update(batches).set({ status: "approved" }).where(eq(batches.id, batchId)).run();
    } else if (target === "closed") {
      if (!transitions.closed.includes(b.status)) throw new Error(`Cannot close from ${b.status}`);
      db.update(batches).set({ status: "closed" }).where(eq(batches.id, batchId)).run();
    } else {
      throw new Error("Unsupported batch transition");
    }

    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "batch." + target, entityType: "batch", entityId: batchId,
      beforeJson: { status: b.status }, afterJson: { status: target },
      summary: `Batch ${b.batchNo} → ${target}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/production");
  redirect(error ? `/production?error=${encodeURIComponent(error)}&batch=${batchId}` : `/production?saved=1&batch=${batchId}`);
}

export async function issueMaterialsAction(formData: FormData) {
  const batchId = String(formData.get("batchId") ?? "");
  let error: string | null = null;
  try {
    const user = await ensurePermission("production.approve");
    const db = getDb();
    const b = db.select().from(batches).where(and(eq(batches.id, batchId), eq(batches.tenantId, user.tenantId))).get();
    if (!b) throw new Error("Batch not found");
    if (!["approved", "materials_issued", "in_production"].includes(b.status)) throw new Error("Approve the batch before issuing materials");

    const loc = db.select().from(locations).where(and(eq(locations.tenantId, user.tenantId), eq(locations.code, "WH-MAIN"))).get()
      ?? db.select().from(locations).where(eq(locations.tenantId, user.tenantId)).limit(1).all()[0];
    if (!loc) throw new Error("Create a location first");

    const lines = db
      .select({ bc: batchConsumptions, sku: products.sku, name: products.name })
      .from(batchConsumptions)
      .innerJoin(products, eq(products.id, batchConsumptions.productId))
      .where(eq(batchConsumptions.batchId, batchId))
      .all();

    for (const { bc, sku } of lines) {
      if (bc.qtyActual !== "0") continue;
      insertStockMove(db, { tenantId: user.tenantId, userId: user.id }, {
        productId: bc.productId,
        locationId: loc.id,
        direction: "out",
        qty: bc.qtyPlanned,
        unit: bc.unit,
        reason: "consumption",
        refType: "batch",
        refId: batchId,
        lotNo: optionalStr(formData, "lotNo"),
        note: `Issued to ${b.batchNo}`,
      });
      db.update(batchConsumptions).set({ qtyActual: bc.qtyPlanned }).where(eq(batchConsumptions.id, bc.id)).run();
      void sku;
    }

    db.update(batches).set({ status: "in_production", startedAt: new Date() }).where(eq(batches.id, batchId)).run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "batch.issue_materials", entityType: "batch", entityId: batchId,
      afterJson: { lines: lines.length },
      summary: `Materials issued to batch ${b.batchNo}; status → in_production`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/production");
  revalidatePath("/inventory");
  redirect(error ? `/production?error=${encodeURIComponent(error)}&batch=${batchId}` : `/production?saved=1&batch=${batchId}`);
}

export async function completeBatchAction(formData: FormData) {
  const batchId = String(formData.get("batchId") ?? "");
  let error: string | null = null;
  try {
    const user = await ensurePermission("production.approve");
    const db = getDb();
    const b = db.select().from(batches).where(and(eq(batches.id, batchId), eq(batches.tenantId, user.tenantId))).get();
    if (!b) throw new Error("Batch not found");
    if (b.status !== "in_production") throw new Error("Batch must be in production to complete");

    const produced = parseQtyPositive(formData.get("producedQty"));
    if (!produced) throw new Error("Produced quantity must be positive");

    const loc = db.select().from(locations).where(and(eq(locations.tenantId, user.tenantId), eq(locations.code, "PLANT-1"))).get()
      ?? db.select().from(locations).where(eq(locations.tenantId, user.tenantId)).limit(1).all()[0];
    if (!loc) throw new Error("Create a location first");

    const p = db.select().from(products).where(eq(products.id, b.productId)).get();
    const outMove = insertStockMove(db, { tenantId: user.tenantId, userId: user.id }, {
      productId: b.productId,
      locationId: loc.id,
      direction: "in",
      qty: produced,
      unit: b.unit,
      reason: "production_output",
      refType: "batch",
      refId: batchId,
      lotNo: b.drinkLots,
      unitCostMinor: p?.costPriceMinor ?? 0,
      note: `Output of ${b.batchNo} → QC pending`,
    });

    db.update(batches).set({ status: "qc_pending", completedAt: new Date(), producedQty: produced }).where(eq(batches.id, batchId)).run();
    db.insert(qcInspections)
      .values({
        id: crypto.randomUUID(),
        tenantId: user.tenantId,
        productId: b.productId,
        batchId,
        lotNo: b.drinkLots,
        kind: "finished",
        result: "pending",
      })
      .run();

    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "batch.complete", entityType: "batch", entityId: batchId,
      afterJson: { produced, outputMove: outMove },
      summary: `Batch ${b.batchNo} complete: ${produced} ${b.unit} → qc_pending`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/production");
  revalidatePath("/quality");
  redirect(error ? `/production?error=${encodeURIComponent(error)}&batch=${batchId}` : `/production?saved=1&batch=${batchId}`);
}

/* ───────── Quality ───────── */

export async function recordQcAction(formData: FormData) {
  const qcId = String(formData.get("qcId") ?? "");
  let error: string | null = null;
  try {
    const user = await ensurePermission("quality.record");
    const db = getDb();
    const qc = db.select().from(qcInspections).where(and(eq(qcInspections.id, qcId), eq(qcInspections.tenantId, user.tenantId))).get();
    if (!qc) throw new Error("Inspection not found");
    const result = requireFrom(formData, "result", ["pass", "fail", "conditional"] as const);
    db.update(qcInspections)
      .set({
        result,
        inspectorId: user.id,
        inspectedAt: new Date(),
        ph: optionalStr(formData, "ph"),
        viscosity: optionalStr(formData, "viscosity"),
        density: optionalStr(formData, "density"),
        appearance: optionalStr(formData, "appearance"),
        comments: optionalStr(formData, "comments"),
      })
      .where(eq(qcInspections.id, qcId))
      .run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "qc.record", entityType: "qc_inspection", entityId: qcId,
      afterJson: { result },
      summary: `QC result ${result} recorded`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/quality");
  revalidatePath("/production");
  redirect(error ? `/quality?error=${encodeURIComponent(error)}` : "/quality?saved=1");
}

export async function releaseBatchFromQcAction(formData: FormData) {
  const batchId = String(formData.get("batchId") ?? "");
  let error: string | null = null;
  try {
    const user = await ensurePermission("quality.approve");
    const db = getDb();
    const b = db.select().from(batches).where(and(eq(batches.id, batchId), eq(batches.tenantId, user.tenantId))).get();
    if (!b) throw new Error("Batch not found");
    if (b.status !== "qc_pending") throw new Error("Batch is not awaiting QC");
    const qc = db.select({ result: qcInspections.result }).from(qcInspections).where(and(eq(qcInspections.batchId, batchId), eq(qcInspections.kind, "finished"))).all();
    const passed = qc.some((q) => q.result === "pass");
    if (!passed) throw new Error("Record a passing QC inspection before release");

    const moveTo = db.select().from(locations).where(and(eq(locations.tenantId, user.tenantId), eq(locations.code, "WH-MAIN"))).get();
    if (moveTo) {
      insertStockMove(db, { tenantId: user.tenantId, userId: user.id }, {
        productId: b.productId,
        locationId: moveTo.id,
        direction: "in",
        qty: b.producedQty,
        unit: b.unit,
        reason: "adjustment",
        refType: "batch",
        refId: batchId,
        lotNo: b.drinkLots,
        note: `Released from ${b.batchNo} to sellable stock`,
      });
    }

    db.update(batches).set({ status: "released", releasedAt: new Date() }).where(eq(batches.id, batchId)).run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "batch.release", entityType: "batch", entityId: batchId,
      beforeJson: { status: b.status }, afterJson: { status: "released" },
      summary: `Batch ${b.batchNo} released to stock after QC pass`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/production");
  revalidatePath("/quality");
  revalidatePath("/inventory");
  redirect(error ? `/quality?error=${encodeURIComponent(error)}` : "/quality?saved=1");
}

export async function createLabExperimentAction(formData: FormData) {
  let error: string | null = null;
  try {
    const user = await ensurePermission("lab.write");
    const db = getDb();
    const id = crypto.randomUUID();
    const title = requireFrom(formData, "title");
    db.insert(experiments)
      .values({
        id,
        tenantId: user.tenantId,
        title,
        productId: optionalStr(formData, "productId"),
        objective: optionalStr(formData, "objective"),
        hypothesis: optionalStr(formData, "hypothesis"),
        authorId: user.id,
      })
      .run();
    db.insert(tasks).values({
      id: crypto.randomUUID(),
      tenantId: user.tenantId,
      title: "Review experiment: " + title,
      priority: "normal",
      createdBy: user.id,
      relatedEntityType: "experiment",
      relatedEntityId: id,
    }).run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "experiment.create", entityType: "experiment", entityId: id,
      summary: `Experiment started: ${title}`,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/lab");
  redirect(error ? `/lab?error=${encodeURIComponent(error)}` : "/lab?saved=1");
}

export async function completeExperimentAction(formData: FormData) {
  let error: string | null = null;
  const expId = String(formData.get("experimentId") ?? "");
  try {
    const user = await ensurePermission("lab.write");
    const db = getDb();
    const results = optionalStr(formData, "results") ?? "";
    const conclusion = optionalStr(formData, "conclusion") ?? "";
    const nextSteps = optionalStr(formData, "nextSteps") ?? "";
    db.update(experiments)
      .set({
        resultsJson: JSON.stringify({ text: results }),
        conclusion,
        nextSteps,
        status: "completed",
        reviewerId: user.id,
        reviewedAt: new Date(),
      })
      .where(and(eq(experiments.id, expId), eq(experiments.tenantId, user.tenantId)))
      .run();
    await writeAudit({
      tenantId: user.tenantId, actorUserId: user.id, actorType: "human",
      action: "experiment.complete", entityType: "experiment", entityId: expId,
      summary: "Experiment completed and reviewed",
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed";
  }
  revalidatePath("/lab");
  redirect(error ? `/lab?error=${encodeURIComponent(error)}` : "/lab?saved=1");
}
