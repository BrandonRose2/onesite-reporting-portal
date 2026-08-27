CREATE TABLE `managerChecklistReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`propertyId` int NOT NULL,
	`status` enum('in_progress','submitted') NOT NULL DEFAULT 'in_progress',
	`checklistState` json NOT NULL,
	`managerSummary` text,
	`submittedById` int,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `managerChecklistReviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `manager_checklist_request_property_unique` UNIQUE(`requestId`,`propertyId`)
);
--> statement-breakpoint
CREATE INDEX `manager_checklist_property_status_idx` ON `managerChecklistReviews` (`propertyId`,`status`);