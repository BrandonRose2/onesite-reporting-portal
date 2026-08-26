DROP INDEX `report_documents_property_created_idx` ON `reportDocuments`;--> statement-breakpoint
ALTER TABLE `reportDocuments` MODIFY COLUMN `documentKind` enum('source_report','property_workbook','manager_checklist') NOT NULL DEFAULT 'source_report';--> statement-breakpoint
ALTER TABLE `reportDocuments` ADD `source` enum('onesite','yardi') DEFAULT 'onesite' NOT NULL;--> statement-breakpoint
ALTER TABLE `reportRequests` ADD `summaryHtml` text;--> statement-breakpoint
CREATE INDEX `report_documents_source_property_created_idx` ON `reportDocuments` (`source`,`propertyId`,`createdAt`);