CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`text` text NOT NULL,
	`href` text NOT NULL,
	`read_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_user` ON `notification` (`user_id`,`read_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `place` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`district` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`map_url` text,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `place_district` ON `place` (`district`);--> statement-breakpoint
CREATE TABLE `play` (
	`id` text PRIMARY KEY NOT NULL,
	`bgg_id` integer NOT NULL,
	`played_on` text NOT NULL,
	`place_id` text,
	`table_id` text,
	`logged_by` text,
	`duration_min` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`bgg_id`) REFERENCES `game`(`bgg_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`place_id`) REFERENCES `place`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`table_id`) REFERENCES `play_table`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`logged_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `play_game` ON `play` (`bgg_id`);--> statement-breakpoint
CREATE INDEX `play_played_on` ON `play` (`played_on`);--> statement-breakpoint
CREATE TABLE `play_player` (
	`id` text PRIMARY KEY NOT NULL,
	`play_id` text NOT NULL,
	`user_id` text,
	`guest_name` text,
	`winner` integer DEFAULT false NOT NULL,
	`score` integer,
	`confirmed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`play_id`) REFERENCES `play`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `play_player_play` ON `play_player` (`play_id`);--> statement-breakpoint
CREATE INDEX `play_player_user` ON `play_player` (`user_id`,`confirmed`);--> statement-breakpoint
CREATE TABLE `play_table` (
	`id` text PRIMARY KEY NOT NULL,
	`host_id` text NOT NULL,
	`bgg_id` integer NOT NULL,
	`place_id` text,
	`starts_at` integer NOT NULL,
	`seats` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bgg_id`) REFERENCES `game`(`bgg_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`place_id`) REFERENCES `place`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `play_table_status_start` ON `play_table` (`status`,`starts_at`);--> statement-breakpoint
CREATE INDEX `play_table_host` ON `play_table` (`host_id`);--> statement-breakpoint
CREATE TABLE `post` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`image_key` text,
	`ref_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_created` ON `post` (`created_at`);--> statement-breakpoint
CREATE INDEX `post_user` ON `post` (`user_id`);--> statement-breakpoint
CREATE TABLE `post_comment` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_comment_post` ON `post_comment` (`post_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `post_like` (
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`post_id`, `user_id`),
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `report` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `report_status` ON `report` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `table_player` (
	`table_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`table_id`, `user_id`),
	FOREIGN KEY (`table_id`) REFERENCES `play_table`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `table_player_user` ON `table_player` (`user_id`);