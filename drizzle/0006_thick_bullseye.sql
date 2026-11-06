DROP INDEX `game_daily_player`;--> statement-breakpoint
DROP INDEX `game_daily_score`;--> statement-breakpoint
ALTER TABLE `game_scores` ADD `version` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `game_daily_player` ON `game_scores` (`day`,`version`,`player_hash`);--> statement-breakpoint
CREATE INDEX `game_daily_score` ON `game_scores` (`day`,`version`,`score`);