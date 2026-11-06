CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`date` text NOT NULL,
	`location` text NOT NULL,
	`capacity` integer NOT NULL,
	`published` integer DEFAULT 1 NOT NULL,
	`question` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`event_title` text NOT NULL,
	`event_date` text NOT NULL,
	`event_location` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`department` text NOT NULL,
	`year` text NOT NULL,
	`answer` text NOT NULL,
	`token_hash` text NOT NULL,
	`checkin_hash` text NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`checked_in_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_event_email` ON `registrations` (`event_id`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_token` ON `registrations` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_checkin` ON `registrations` (`checkin_hash`);--> statement-breakpoint
CREATE INDEX `registrations_event` ON `registrations` (`event_id`);