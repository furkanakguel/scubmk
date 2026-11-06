CREATE TABLE `admin_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_invites_token` ON `admin_invites` (`token_hash`);--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_sessions_user` ON `admin_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_created` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`uploaded_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`role` text NOT NULL,
	`team` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`year` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`photo_id` text DEFAULT '' NOT NULL,
	`photo_alt` text DEFAULT '' NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`skills` text DEFAULT '[]' NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_slug` ON `members` (`slug`);--> statement-breakpoint
CREATE INDEX `members_public` ON `members` (`published`,`archived`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `events` ADD `details` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `image_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `image_alt` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `registration_open` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `archived` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `updated_at` integer DEFAULT 0 NOT NULL;