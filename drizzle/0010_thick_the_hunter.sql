CREATE TABLE `portalAccessRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('boss','manager') NOT NULL,
	`propertyIdsJson` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portalAccessRules_id` PRIMARY KEY(`id`),
	CONSTRAINT `portalAccessRules_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `portal_access_rules_active_idx` ON `portalAccessRules` (`isActive`);