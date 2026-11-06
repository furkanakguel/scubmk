ALTER TABLE `game_runs` ADD `verified_tick` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_runs` ADD `checkpoint` text;--> statement-breakpoint
ALTER TABLE `game_runs` ADD `checkpoint_hash` text;