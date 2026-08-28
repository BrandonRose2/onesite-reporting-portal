ALTER TABLE `properties` DROP INDEX `properties_external_id_unique`;--> statement-breakpoint
DROP INDEX `properties_active_name_idx` ON `properties`;--> statement-breakpoint
ALTER TABLE `properties` ADD `source` enum('onesite','yardi') DEFAULT 'onesite' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_source_external_id_unique` UNIQUE(`source`,`externalId`);--> statement-breakpoint
CREATE INDEX `properties_source_active_name_idx` ON `properties` (`source`,`active`,`name`);