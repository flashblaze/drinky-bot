ALTER TABLE `user` ADD `reminderEnabled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `reminderIntervalMinutes` integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `reminderStartTime` text DEFAULT '09:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `reminderTimezone` text DEFAULT 'UTC' NOT NULL;