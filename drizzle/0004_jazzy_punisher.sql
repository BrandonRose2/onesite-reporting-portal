CREATE TABLE `reportCatalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceSystem` enum('realpage','yardi') NOT NULL DEFAULT 'realpage',
	`slug` varchar(120) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`exactReportName` varchar(255) NOT NULL,
	`searchTerm` varchar(160) NOT NULL,
	`defaultFormat` enum('excel','pdf','csv') NOT NULL,
	`reportArea` varchar(160),
	`description` text,
	`isVerified` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reportCatalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `reportCatalog_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `reportDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportRequestId` int NOT NULL,
	`propertyId` int,
	`documentKind` enum('source_report','property_markdown','property_pdf','portfolio_markdown','portfolio_pdf') NOT NULL,
	`originalFilename` varchar(512) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`fileSizeBytes` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reportDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reportRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceSystem` enum('realpage','yardi') NOT NULL DEFAULT 'realpage',
	`requestType` enum('generate_all_properties','sync_my_reports') NOT NULL,
	`status` enum('queued','running','completed','completed_with_warnings','failed') NOT NULL DEFAULT 'queued',
	`reportCatalogId` int,
	`requestedReportName` varchar(255) NOT NULL,
	`requestedFormat` enum('excel','pdf','csv') NOT NULL,
	`propertyScope` varchar(64) NOT NULL DEFAULT 'all_properties',
	`requestedByUserId` int NOT NULL,
	`sourceRunReference` varchar(160),
	`parameterJson` text,
	`documentCount` int NOT NULL DEFAULT 0,
	`summaryMarkdown` text,
	`warningSummary` text,
	`errorMessage` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `reportRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `report_catalog_source_active_idx` ON `reportCatalog` (`sourceSystem`,`isActive`);--> statement-breakpoint
CREATE INDEX `report_documents_request_idx` ON `reportDocuments` (`reportRequestId`);--> statement-breakpoint
CREATE INDEX `report_documents_property_idx` ON `reportDocuments` (`propertyId`);--> statement-breakpoint
CREATE INDEX `report_requests_status_requested_idx` ON `reportRequests` (`status`,`requestedAt`);--> statement-breakpoint
CREATE INDEX `report_requests_catalog_idx` ON `reportRequests` (`reportCatalogId`);