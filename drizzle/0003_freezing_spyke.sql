ALTER TABLE `retrievalAutomations` ADD `timezone` varchar(64) DEFAULT 'America/Los_Angeles' NOT NULL;--> statement-breakpoint
ALTER TABLE `retrievalAutomations` ADD `parametersJson` text;