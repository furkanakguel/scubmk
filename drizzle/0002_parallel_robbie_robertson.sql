CREATE INDEX `events_visible_date` ON `events` (`published`,`archived`,`date`);--> statement-breakpoint
CREATE INDEX `media_created` ON `media` (`created_at`);--> statement-breakpoint
CREATE INDEX `registrations_created` ON `registrations` (`demo`,`created_at`);--> statement-breakpoint
CREATE INDEX `registrations_event_created` ON `registrations` (`demo`,`event_id`,`created_at`);