CREATE TABLE `club_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`club_role` text DEFAULT 'member' NOT NULL,
	`card_style` text DEFAULT 'forest' NOT NULL,
	`member_no` text NOT NULL,
	`card_code` text NOT NULL,
	`recovery_hash` text NOT NULL,
	`reset_hash` text,
	`reset_expires` integer,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `club_email` ON `club_accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `club_member_no` ON `club_accounts` (`member_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `club_card_code` ON `club_accounts` (`card_code`);--> statement-breakpoint
CREATE INDEX `club_role_created` ON `club_accounts` (`club_role`,`created_at`);--> statement-breakpoint
CREATE TABLE `club_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `club_sessions_user` ON `club_sessions` (`user_id`);