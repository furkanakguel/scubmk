CREATE TABLE `game_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`player_hash` text NOT NULL,
	`day` text NOT NULL,
	`seed` integer NOT NULL,
	`version` integer NOT NULL,
	`started_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer
);
--> statement-breakpoint
CREATE INDEX `game_runs_expiry` ON `game_runs` (`expires_at`);--> statement-breakpoint
CREATE TABLE `game_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`player_hash` text NOT NULL,
	`day` text NOT NULL,
	`nickname` text NOT NULL,
	`score` integer NOT NULL,
	`ticks` integer NOT NULL,
	`bits` integer NOT NULL,
	`chain` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_daily_player` ON `game_scores` (`day`,`player_hash`);--> statement-breakpoint
CREATE INDEX `game_daily_score` ON `game_scores` (`day`,`score`);