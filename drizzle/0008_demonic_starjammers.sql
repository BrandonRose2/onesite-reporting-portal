CREATE TABLE `runnerConnectionStatuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runnerKey` varchar(96) NOT NULL,
	`connectionMode` varchar(64) NOT NULL,
	`status` enum('ready','unavailable','interactive_required') NOT NULL,
	`detail` text,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	`lastReadyAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `runnerConnectionStatuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `runnerConnectionStatuses_runnerKey_unique` UNIQUE(`runnerKey`)
);
--> statement-breakpoint
CREATE INDEX `runner_connection_status_checked_idx` ON `runnerConnectionStatuses` (`status`,`checkedAt`);