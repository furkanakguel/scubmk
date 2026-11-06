ALTER TABLE `admin_sessions` ADD `auth_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `admin_sessions_expiry` ON `admin_sessions` (`expires_at`);--> statement-breakpoint
ALTER TABLE `admin_users` ADD `auth_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `club_accounts` ADD `auth_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `club_sessions` ADD `auth_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `club_sessions_expiry` ON `club_sessions` (`expires_at`);--> statement-breakpoint
ALTER TABLE `game_scores` ADD `hidden` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `media` ADD `archived` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `admin_invites_expiry` ON `admin_invites` (`expires_at`);--> statement-breakpoint
CREATE INDEX `rate_limits_expiry` ON `rate_limits` (`expires_at`);