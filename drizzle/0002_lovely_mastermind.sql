ALTER TABLE `reportCatalog` DROP INDEX `report_catalog_key_unique`;--> statement-breakpoint
DROP INDEX `report_catalog_active_name_idx` ON `reportCatalog`;--> statement-breakpoint
DROP INDEX `report_requests_status_created_idx` ON `reportRequests`;--> statement-breakpoint
ALTER TABLE `reportCatalog` ADD `source` enum('onesite','yardi') DEFAULT 'onesite' NOT NULL;--> statement-breakpoint
ALTER TABLE `reportRequests` ADD `source` enum('onesite','yardi') DEFAULT 'onesite' NOT NULL;--> statement-breakpoint
ALTER TABLE `reportCatalog` ADD CONSTRAINT `report_catalog_source_key_unique` UNIQUE(`source`,`catalogKey`);--> statement-breakpoint
CREATE INDEX `report_catalog_source_active_name_idx` ON `reportCatalog` (`source`,`active`,`exactReportName`);--> statement-breakpoint
CREATE INDEX `report_requests_source_status_created_idx` ON `reportRequests` (`source`,`status`,`createdAt`);