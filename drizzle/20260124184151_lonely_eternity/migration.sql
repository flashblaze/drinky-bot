CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`telegramId` integer NOT NULL,
	`firstName` text,
	`lastName` text,
	`username` text NOT NULL,
	`languageCode` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `usernameIdx` ON `user` (`username`);--> statement-breakpoint
CREATE INDEX `userIdIdx` ON `user` (`id`);--> statement-breakpoint
CREATE INDEX `telegramIdIdx` ON `user` (`telegramId`);