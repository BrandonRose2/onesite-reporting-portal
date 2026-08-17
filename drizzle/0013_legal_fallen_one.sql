CREATE TABLE `managerChecklistStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportingPeriodId` int NOT NULL,
	`propertyId` int NOT NULL,
	`stateJson` text NOT NULL,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `managerChecklistStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `manager_checklist_period_property_unique` UNIQUE(`reportingPeriodId`,`propertyId`)
);
--> statement-breakpoint
CREATE INDEX `manager_checklist_property_idx` ON `managerChecklistStates` (`propertyId`);