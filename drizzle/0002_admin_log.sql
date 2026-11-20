CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_log_created` ON `audit_log` (`created_at`);