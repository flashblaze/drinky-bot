CREATE TABLE `water_log` (
	`id` text PRIMARY KEY,
	`userId` text,
	`amount` integer NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	CONSTRAINT `fk_water_log_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`)
);
