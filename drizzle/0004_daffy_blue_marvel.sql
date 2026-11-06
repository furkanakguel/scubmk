CREATE TABLE `club_password_resets` (
	`challenge_hash` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`credential_hash` text NOT NULL,
	`code_hash` text NOT NULL,
	`delivery_status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`verified_hash` text,
	`verified_expires_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `club_reset_verified` ON `club_password_resets` (`verified_hash`);--> statement-breakpoint
CREATE INDEX `club_reset_user` ON `club_password_resets` (`user_id`);--> statement-breakpoint
CREATE INDEX `club_reset_expiry` ON `club_password_resets` (`expires_at`);