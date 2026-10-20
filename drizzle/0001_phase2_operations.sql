CREATE TABLE `batch_consumptions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`batchId` text NOT NULL,
	`productId` text NOT NULL,
	`qtyPlanned` text NOT NULL,
	`qtyActual` text DEFAULT '0' NOT NULL,
	`unit` text NOT NULL,
	`lotNo` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bc_batch_idx` ON `batch_consumptions` (`batchId`);--> statement-breakpoint
CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`batchNo` text NOT NULL,
	`productId` text NOT NULL,
	`formulaId` text NOT NULL,
	`plannedQty` text NOT NULL,
	`producedQty` text DEFAULT '0' NOT NULL,
	`unit` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`startedAt` integer,
	`completedAt` integer,
	`releasedAt` integer,
	`operator` text,
	`locationId` text,
	`drinkLots` text,
	`note` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`formulaId`) REFERENCES `formulas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operator`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `batch_tenant_no_unique` ON `batches` (`tenantId`,`batchNo`);--> statement-breakpoint
CREATE INDEX `batch_tenant_status_idx` ON `batches` (`tenantId`,`status`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'retail' NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`creditLimitMinor` integer DEFAULT 0 NOT NULL,
	`externalRef` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cust_tenant_idx` ON `customers` (`tenantId`,`kind`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'other' NOT NULL,
	`externalUrl` text,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`reviewedAt` integer,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `doc_tenant_kind_idx` ON `documents` (`tenantId`,`kind`);--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`name` text NOT NULL,
	`model` text,
	`locationId` text,
	`status` text DEFAULT 'operational' NOT NULL,
	`lastCalibratedAt` integer,
	`nextServiceAt` integer,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `equip_tenant_idx` ON `equipment` (`tenantId`,`status`);--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`title` text NOT NULL,
	`productId` text,
	`objective` text,
	`hypothesis` text,
	`status` text DEFAULT 'open' NOT NULL,
	`authorId` text,
	`reviewerId` text,
	`reviewedAt` integer,
	`resultsJson` text,
	`conclusion` text,
	`nextSteps` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exp_tenant_status_idx` ON `experiments` (`tenantId`,`status`);--> statement-breakpoint
CREATE TABLE `formula_items` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`formulaId` text NOT NULL,
	`ingredientId` text NOT NULL,
	`qty` text NOT NULL,
	`unit` text NOT NULL,
	`pct` text,
	`note` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`formulaId`) REFERENCES `formulas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingredientId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fi_formula_idx` ON `formula_items` (`formulaId`);--> statement-breakpoint
CREATE TABLE `formulas` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`productId` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`name` text NOT NULL,
	`batchSize` text DEFAULT '1' NOT NULL,
	`batchUnit` text NOT NULL,
	`concentration` text,
	`yieldPct` text DEFAULT '95' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`approvedBy` text,
	`approvedAt` integer,
	`notes` text,
	`confidential` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `formula_tenant_product_version_unique` ON `formulas` (`tenantId`,`productId`,`version`);--> statement-breakpoint
CREATE INDEX `formula_status_idx` ON `formulas` (`tenantId`,`status`);--> statement-breakpoint
CREATE TABLE `integration_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`source` text NOT NULL,
	`eventType` text NOT NULL,
	`externalEventId` text,
	`status` text DEFAULT 'received' NOT NULL,
	`payloadJson` text,
	`error` text,
	`processedAt` integer,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ie_tenant_source_idx` ON `integration_events` (`tenantId`,`source`);--> statement-breakpoint
CREATE UNIQUE INDEX `ie_tenant_dedupe_unique` ON `integration_events` (`tenantId`,`source`,`externalEventId`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`invoiceNo` text NOT NULL,
	`customerId` text NOT NULL,
	`orderId` text,
	`kind` text DEFAULT 'sales' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`currency` text DEFAULT 'PKR' NOT NULL,
	`totalMinor` integer DEFAULT 0 NOT NULL,
	`paidMinor` integer DEFAULT 0 NOT NULL,
	`issuedAt` integer,
	`dueAt` integer,
	`approvedBy` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`orderId`) REFERENCES `sales_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inv_tenant_number_unique` ON `invoices` (`tenantId`,`invoiceNo`);--> statement-breakpoint
CREATE INDEX `inv_tenant_status_idx` ON `invoices` (`tenantId`,`status`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`kind` text DEFAULT 'warehouse' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_tenant_code_unique` ON `locations` (`tenantId`,`code`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`customerId` text,
	`supplierId` text,
	`invoiceId` text,
	`purchaseOrderId` text,
	`amountMinor` integer NOT NULL,
	`currency` text DEFAULT 'PKR' NOT NULL,
	`method` text DEFAULT 'bank' NOT NULL,
	`receivedAt` integer,
	`note` text,
	`createdBy` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pay_tenant_idx` ON `payments` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'finished' NOT NULL,
	`category` text,
	`baseUnit` text NOT NULL,
	`salesPriceMinor` integer DEFAULT 0 NOT NULL,
	`costPriceMinor` integer DEFAULT 0 NOT NULL,
	`reorder_point` text DEFAULT '0' NOT NULL,
	`minStock` text DEFAULT '0' NOT NULL,
	`description` text,
	`sdsRef` text,
	`tdsRef` text,
	`hazardClass` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_tenant_sku_unique` ON `products` (`tenantId`,`sku`);--> statement-breakpoint
CREATE INDEX `products_tenant_kind_idx` ON `products` (`tenantId`,`kind`);--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`poId` text NOT NULL,
	`productId` text NOT NULL,
	`qty` text NOT NULL,
	`unit` text NOT NULL,
	`unitPriceMinor` integer DEFAULT 0 NOT NULL,
	`receivedQty` text DEFAULT '0' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`poId`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `poi_po_idx` ON `purchase_order_items` (`poId`);--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`poNumber` text NOT NULL,
	`supplierId` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`currency` text DEFAULT 'PKR' NOT NULL,
	`totalMinor` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`expectedAt` integer,
	`receivedAt` integer,
	`createdBy` text,
	`approvedBy` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `po_tenant_number_unique` ON `purchase_orders` (`tenantId`,`poNumber`);--> statement-breakpoint
CREATE INDEX `po_tenant_status_idx` ON `purchase_orders` (`tenantId`,`status`);--> statement-breakpoint
CREATE TABLE `qc_inspections` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`productId` text NOT NULL,
	`batchId` text,
	`lotNo` text,
	`kind` text DEFAULT 'finished' NOT NULL,
	`inspectedAt` integer,
	`inspectorId` text,
	`ph` text,
	`viscosity` text,
	`density` text,
	`appearance` text,
	`result` text DEFAULT 'pending' NOT NULL,
	`comments` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inspectorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `qc_tenant_result_idx` ON `qc_inspections` (`tenantId`,`result`);--> statement-breakpoint
CREATE INDEX `qc_batch_idx` ON `qc_inspections` (`batchId`);--> statement-breakpoint
CREATE TABLE `sales_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`orderId` text NOT NULL,
	`productId` text NOT NULL,
	`qty` text NOT NULL,
	`unit` text NOT NULL,
	`unitPriceMinor` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`orderId`) REFERENCES `sales_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `soi_order_idx` ON `sales_order_items` (`orderId`);--> statement-breakpoint
CREATE TABLE `sales_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`orderNo` text NOT NULL,
	`customerId` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`currency` text DEFAULT 'PKR' NOT NULL,
	`totalMinor` integer DEFAULT 0 NOT NULL,
	`channel` text DEFAULT 'direct' NOT NULL,
	`externalRef` text,
	`placedAt` integer,
	`dispatchedAt` integer,
	`createdBy` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `so_tenant_number_unique` ON `sales_orders` (`tenantId`,`orderNo`);--> statement-breakpoint
CREATE INDEX `so_tenant_status_idx` ON `sales_orders` (`tenantId`,`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_tenant_key_unique` ON `settings` (`tenantId`,`key`);--> statement-breakpoint
CREATE TABLE `stock_moves` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`productId` text NOT NULL,
	`locationId` text NOT NULL,
	`direction` text NOT NULL,
	`qty` text NOT NULL,
	`unit` text NOT NULL,
	`lotNo` text,
	`batchId` text,
	`reason` text NOT NULL,
	`refType` text,
	`refId` text,
	`unitCostMinor` integer DEFAULT 0 NOT NULL,
	`note` text,
	`createdBy` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `moves_tenant_product_idx` ON `stock_moves` (`tenantId`,`productId`);--> statement-breakpoint
CREATE INDEX `moves_tenant_created_idx` ON `stock_moves` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `moves_lot_idx` ON `stock_moves` (`tenantId`,`lotNo`);--> statement-breakpoint
CREATE INDEX `moves_batch_idx` ON `stock_moves` (`tenantId`,`batchId`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`name` text NOT NULL,
	`contact` text,
	`email` text,
	`phone` text,
	`address` text,
	`leadTimeDays` integer DEFAULT 7 NOT NULL,
	`rating` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `suppliers_tenant_idx` ON `suppliers` (`tenantId`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`assignedTo` text,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`dueAt` integer,
	`relatedEntityType` text,
	`relatedEntityId` text,
	`createdBy` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tasks_tenant_status_idx` ON `tasks` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_assignee_idx` ON `tasks` (`assignedTo`);--> statement-breakpoint
DROP INDEX `tenants_slug_idx`;