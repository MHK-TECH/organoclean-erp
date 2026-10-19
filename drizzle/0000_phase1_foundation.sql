CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text,
	`actorUserId` text,
	`actorType` text DEFAULT 'human' NOT NULL,
	`messageId` text NOT NULL,
	`prevMessageId` text,
	`action` text NOT NULL,
	`entityType` text NOT NULL,
	`entityId` text NOT NULL,
	`requestId` text,
	`source` text DEFAULT 'web' NOT NULL,
	`beforeJson` text,
	`afterJson` text,
	`ip` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_events_tenant_idx` ON `audit_events` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_events_entity_idx` ON `audit_events` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `audit_events_actor_idx` ON `audit_events` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text,
	`emailAttempted` text NOT NULL,
	`success` integer NOT NULL,
	`ip` text,
	`userAgent` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `login_attempts_email_idx` ON `login_attempts` (`emailAttempted`,`createdAt`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`key` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`module` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`roleId` text NOT NULL,
	`permissionKey` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`permissionKey`) REFERENCES `permissions`(`key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `role_permissions_unique` ON `role_permissions` (`roleId`,`permissionKey`);--> statement-breakpoint
CREATE INDEX `role_permissions_perm_idx` ON `role_permissions` (`permissionKey`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`isBuiltin` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_tenant_key_unique` ON `roles` (`tenantId`,`key`);--> statement-breakpoint
CREATE INDEX `roles_tenant_idx` ON `roles` (`tenantId`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`tokenHash` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`lastActivityAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`revokedAt` integer,
	`revokedReason` text,
	`ip` text,
	`userAgent` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_tokenHash_unique` ON `sessions` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`userId`,`revokedAt`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`country` text DEFAULT 'PK' NOT NULL,
	`currency` text DEFAULT 'PKR' NOT NULL,
	`timezone` text DEFAULT 'Asia/Karachi' NOT NULL,
	`decimalDigits` integer DEFAULT 2 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);--> statement-breakpoint
CREATE INDEX `tenants_slug_idx` ON `tenants` (`slug`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`userId` text NOT NULL,
	`roleId` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_roles_unique` ON `user_roles` (`userId`,`roleId`);--> statement-breakpoint
CREATE INDEX `user_roles_role_idx` ON `user_roles` (`roleId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text NOT NULL,
	`email` text NOT NULL,
	`emailVerifiedAt` integer,
	`passwordHash` text NOT NULL,
	`fullName` text NOT NULL,
	`employeeCode` text,
	`status` text DEFAULT 'active' NOT NULL,
	`isServiceAccount` integer DEFAULT false NOT NULL,
	`isPlatformSuperAdmin` integer DEFAULT false NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_tenant_idx` ON `users` (`tenantId`,`status`);