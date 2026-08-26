CREATE TABLE `managerContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactKey` varchar(128) NOT NULL,
	`propertyName` varchar(255),
	`normalizedPropertyName` varchar(255),
	`managerName` varchar(255),
	`email` varchar(320),
	`region` varchar(64),
	`isRegionalManager` boolean NOT NULL DEFAULT false,
	`source` varchar(64) NOT NULL DEFAULT 'notion_company_contacts',
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `managerContacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `manager_contacts_key_unique` UNIQUE(`contactKey`)
);
--> statement-breakpoint
CREATE INDEX `manager_contacts_property_idx` ON `managerContacts` (`normalizedPropertyName`);--> statement-breakpoint
CREATE INDEX `manager_contacts_region_regional_idx` ON `managerContacts` (`region`,`isRegionalManager`);