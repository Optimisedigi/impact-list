ALTER TABLE `tasks` ADD `timeline_start` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `timeline_end` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `show_on_timeline` integer DEFAULT false NOT NULL;