PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY,
	`telegramId` integer NOT NULL,
	`firstName` text,
	`lastName` text,
	`username` text NOT NULL,
	`languageCode` text NOT NULL,
	`goal` integer DEFAULT 0 NOT NULL,
	`reminderEnabled` integer DEFAULT false NOT NULL,
	`reminderIntervalMinutes` integer DEFAULT 60 NOT NULL,
	`reminderStartTime` text DEFAULT '09:00' NOT NULL,
	`reminderTimezone` text DEFAULT 'UTC' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`(`id`, `telegramId`, `firstName`, `lastName`, `username`, `languageCode`, `goal`, `reminderEnabled`, `reminderIntervalMinutes`, `reminderStartTime`, `reminderTimezone`, `createdAt`, `updatedAt`) SELECT `id`, `telegramId`, `firstName`, `lastName`, `username`, `languageCode`, `goal`, `reminderEnabled`, `reminderIntervalMinutes`, `reminderStartTime`, `reminderTimezone`, `createdAt`, `updatedAt` FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `usernameIdx` ON `user` (`username`);--> statement-breakpoint
CREATE INDEX `userIdIdx` ON `user` (`id`);--> statement-breakpoint
CREATE INDEX `telegramIdIdx` ON `user` (`telegramId`);