CREATE TABLE `reportUserDefaults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` enum('onesite','yardi') NOT NULL,
	`reportCatalogId` int NOT NULL,
	`userId` int NOT NULL,
	`requestedFormat` enum('excel','pdf','csv') NOT NULL,
	`parameterValues` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reportUserDefaults_id` PRIMARY KEY(`id`),
	CONSTRAINT `report_user_defaults_source_catalog_user_unique` UNIQUE(`source`,`reportCatalogId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `reportRequests` ADD `executionAuthorizedById` int;--> statement-breakpoint
ALTER TABLE `reportRequests` ADD `executionAuthorizedAt` timestamp;--> statement-breakpoint
CREATE INDEX `report_user_defaults_user_updated_idx` ON `reportUserDefaults` (`userId`,`updatedAt`);