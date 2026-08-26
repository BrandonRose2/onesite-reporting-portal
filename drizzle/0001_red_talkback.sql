CREATE TABLE `operationalConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(128) NOT NULL,
	`configValue` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operationalConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `operational_config_key_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`market` varchar(128),
	`managerName` varchar(255),
	`managerEmail` varchar(320),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`),
	CONSTRAINT `properties_external_id_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `reportCatalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`catalogKey` varchar(160) NOT NULL,
	`exactReportName` varchar(255) NOT NULL,
	`reportArea` varchar(128),
	`reportLevel` varchar(128),
	`product` varchar(128),
	`availableFormats` json NOT NULL,
	`runnerMetadata` json NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reportCatalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `report_catalog_key_unique` UNIQUE(`catalogKey`)
);
--> statement-breakpoint
CREATE TABLE `reportDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`propertyId` int,
	`propertyName` varchar(255) NOT NULL,
	`documentKind` enum('source_report','property_workbook') NOT NULL DEFAULT 'source_report',
	`originalFilename` varchar(500) NOT NULL,
	`mimeType` varchar(255) NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`storageUrl` varchar(2048) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reportDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reportRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestType` enum('generate_all_properties','generate_property','sync_my_reports') NOT NULL,
	`requestedReportName` varchar(255) NOT NULL,
	`requestedFormat` enum('excel','pdf','csv') NOT NULL,
	`status` enum('queued','claimed','in_progress','completed','completed_with_warnings','failed') NOT NULL DEFAULT 'queued',
	`parameters` json NOT NULL,
	`warningSummary` text,
	`errorMessage` text,
	`summaryMarkdown` text,
	`sourceRunReference` varchar(500),
	`requestedById` int,
	`claimedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reportRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requestEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`detail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `requestEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requestProperties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`propertyId` int NOT NULL,
	`propertyNameSnapshot` varchar(255) NOT NULL,
	CONSTRAINT `requestProperties_id` PRIMARY KEY(`id`),
	CONSTRAINT `request_property_unique` UNIQUE(`requestId`,`propertyId`)
);
--> statement-breakpoint
CREATE INDEX `properties_active_name_idx` ON `properties` (`active`,`name`);--> statement-breakpoint
CREATE INDEX `report_catalog_active_name_idx` ON `reportCatalog` (`active`,`exactReportName`);--> statement-breakpoint
CREATE INDEX `report_documents_request_created_idx` ON `reportDocuments` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `report_documents_property_created_idx` ON `reportDocuments` (`propertyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `report_requests_status_created_idx` ON `reportRequests` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `report_requests_requester_created_idx` ON `reportRequests` (`requestedById`,`createdAt`);--> statement-breakpoint
CREATE INDEX `request_events_request_created_idx` ON `requestEvents` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `request_properties_property_idx` ON `requestProperties` (`propertyId`);