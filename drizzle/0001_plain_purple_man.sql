CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`region` enum('Region 1','Region 2','Region 3','Region 4') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`),
	CONSTRAINT `properties_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `propertyPeriodSummaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportingPeriodId` int NOT NULL,
	`propertyId` int NOT NULL,
	`sourceFileId` int,
	`residentCount` int NOT NULL DEFAULT 0,
	`delinquentUnits` int NOT NULL DEFAULT 0,
	`netPrepaid` decimal(14,2) NOT NULL DEFAULT '0.00',
	`netDelinquent` decimal(14,2) NOT NULL DEFAULT '0.00',
	`netBalance` decimal(14,2) NOT NULL DEFAULT '0.00',
	`currentAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`days30Amount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`days60Amount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`days90PlusAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `propertyPeriodSummaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `property_period_summary_uidx` UNIQUE(`reportingPeriodId`,`propertyId`)
);
--> statement-breakpoint
CREATE TABLE `reportingPeriods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`fiscalPeriod` varchar(32) NOT NULL,
	`asOfDate` date NOT NULL,
	`status` enum('draft','ready','failed') NOT NULL DEFAULT 'draft',
	`sourceFileCount` int NOT NULL DEFAULT 0,
	`importedByUserId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`importedAt` timestamp,
	CONSTRAINT `reportingPeriods_id` PRIMARY KEY(`id`),
	CONSTRAINT `reporting_periods_name_uidx` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `residentLedgerRows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportingPeriodId` int NOT NULL,
	`propertyId` int NOT NULL,
	`sourceFileId` int NOT NULL,
	`residentKey` varchar(96) NOT NULL,
	`reshId` varchar(64),
	`leaseId` varchar(64),
	`unit` varchar(80),
	`residentName` varchar(255),
	`phoneNumber` varchar(80),
	`email` varchar(320),
	`residentStatus` varchar(96),
	`moveInOut` varchar(96),
	`transactionCode` varchar(64),
	`codeDescription` varchar(255),
	`totalPrepaid` decimal(14,2) NOT NULL DEFAULT '0.00',
	`totalDelinquent` decimal(14,2) NOT NULL DEFAULT '0.00',
	`netBalance` decimal(14,2) NOT NULL DEFAULT '0.00',
	`currentAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`days30Amount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`days60Amount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`days90PlusAmount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`depositsCreditsHeld` decimal(14,2) NOT NULL DEFAULT '0.00',
	`lateCount` int NOT NULL DEFAULT 0,
	`nsfCount` int NOT NULL DEFAULT 0,
	`collectionNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `residentLedgerRows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sourceFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportingPeriodId` int NOT NULL,
	`propertyId` int NOT NULL,
	`originalFilename` varchar(512) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`checksumSha256` varchar(64) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`parsedRowCount` int NOT NULL DEFAULT 0,
	`isSelectedExport` boolean NOT NULL DEFAULT true,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sourceFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `properties_region_idx` ON `properties` (`region`);--> statement-breakpoint
CREATE INDEX `property_period_summary_property_idx` ON `propertyPeriodSummaries` (`propertyId`);--> statement-breakpoint
CREATE INDEX `reporting_periods_asof_idx` ON `reportingPeriods` (`asOfDate`);--> statement-breakpoint
CREATE INDEX `ledger_period_property_idx` ON `residentLedgerRows` (`reportingPeriodId`,`propertyId`);--> statement-breakpoint
CREATE INDEX `ledger_resident_key_idx` ON `residentLedgerRows` (`residentKey`);--> statement-breakpoint
CREATE INDEX `source_files_period_idx` ON `sourceFiles` (`reportingPeriodId`);--> statement-breakpoint
CREATE INDEX `source_files_property_idx` ON `sourceFiles` (`propertyId`);