CREATE TABLE `propertySources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`sourceSystem` enum('realpage','yardi') NOT NULL,
	`sourcePropertyId` varchar(96) NOT NULL,
	`sourceUrl` varchar(1024),
	`isAutomated` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `propertySources_id` PRIMARY KEY(`id`),
	CONSTRAINT `propertySources_propertyId_unique` UNIQUE(`propertyId`)
);
--> statement-breakpoint
CREATE TABLE `retrievalAutomations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceSystem` enum('realpage','yardi') NOT NULL,
	`name` varchar(160) NOT NULL,
	`sourceUrl` varchar(1024),
	`isEnabled` boolean NOT NULL DEFAULT false,
	`scheduleCronTaskUid` varchar(65),
	`cronExpression` varchar(64),
	`lastSuccessfulRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `retrievalAutomations_id` PRIMARY KEY(`id`),
	CONSTRAINT `retrievalAutomations_sourceSystem_unique` UNIQUE(`sourceSystem`)
);
--> statement-breakpoint
CREATE TABLE `scrapeRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`retrievalAutomationId` int,
	`sourceSystem` enum('realpage','yardi') NOT NULL,
	`trigger` enum('manual','scheduled') NOT NULL,
	`status` enum('queued','running','completed','completed_with_warnings','failed') NOT NULL DEFAULT 'queued',
	`reportingPeriodId` int,
	`propertiesAttempted` int NOT NULL DEFAULT 0,
	`propertiesSucceeded` int NOT NULL DEFAULT 0,
	`documentsStored` int NOT NULL DEFAULT 0,
	`ledgerRowsImported` int NOT NULL DEFAULT 0,
	`validationSummary` text,
	`warnings` text,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scrapeRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `property_sources_system_idx` ON `propertySources` (`sourceSystem`);--> statement-breakpoint
CREATE INDEX `retrieval_automations_schedule_idx` ON `retrievalAutomations` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `scrape_runs_source_started_idx` ON `scrapeRuns` (`sourceSystem`,`startedAt`);--> statement-breakpoint
CREATE INDEX `scrape_runs_period_idx` ON `scrapeRuns` (`reportingPeriodId`);