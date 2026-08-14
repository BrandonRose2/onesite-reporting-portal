CREATE TABLE `propertyContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`managerName` varchar(255),
	`managerEmail` varchar(320),
	`mobilePhone` varchar(80),
	`officePhone` varchar(80),
	`extension` varchar(32),
	`sourcePropertyName` varchar(255),
	`sourcePageTitle` varchar(255) NOT NULL,
	`sourceUrl` varchar(1024),
	`mappingStatus` enum('verified','review_required','unmapped') NOT NULL DEFAULT 'review_required',
	`sourceSyncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `propertyContacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `propertyContacts_propertyId_unique` UNIQUE(`propertyId`)
);
--> statement-breakpoint
CREATE INDEX `property_contacts_status_idx` ON `propertyContacts` (`mappingStatus`);