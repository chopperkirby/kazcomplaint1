CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`regionId` int NOT NULL,
	`nameRu` varchar(128) NOT NULL,
	`nameKz` varchar(128),
	`nameEn` varchar(128),
	`lat` float,
	`lng` float,
	`isCapital` boolean DEFAULT false,
	CONSTRAINT `cities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaint_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`isStaffReply` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaint_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaint_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complaint_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text NOT NULL,
	`category` enum('roads','utilities','housing','public_transport','parks','lighting','waste','safety','noise','water','heating','traffic','other') NOT NULL,
	`department` enum('akimat','city_management','gov_services') NOT NULL,
	`status` enum('new','pending_approval','in_progress','completed','rejected') NOT NULL DEFAULT 'new',
	`priority` float NOT NULL DEFAULT 0,
	`supportCount` int NOT NULL DEFAULT 0,
	`regionId` int,
	`cityId` int,
	`districtId` int,
	`address` text,
	`lat` float,
	`lng` float,
	`photoUrls` json DEFAULT ('[]'),
	`videoUrls` json DEFAULT ('[]'),
	`assignedStaffId` int,
	`staffNote` text,
	`aiSuggestion` text,
	`videoAiAnalysis` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `districts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`nameRu` varchar(128) NOT NULL,
	`nameKz` varchar(128),
	`lat` float,
	`lng` float,
	CONSTRAINT `districts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameRu` varchar(128) NOT NULL,
	`nameKz` varchar(128),
	`nameEn` varchar(128),
	`code` varchar(32) NOT NULL,
	`lat` float,
	`lng` float,
	CONSTRAINT `regions_id` PRIMARY KEY(`id`),
	CONSTRAINT `regions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `traffic_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int,
	`regionId` int,
	`title` varchar(256) NOT NULL,
	`description` text,
	`lat` float NOT NULL,
	`lng` float NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`congestionIndex` float DEFAULT 0,
	`status` enum('active','resolved') NOT NULL DEFAULT 'active',
	`aiSolution` text,
	`address` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	CONSTRAINT `traffic_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','staff') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `department` enum('akimat','city_management','gov_services');--> statement-breakpoint
ALTER TABLE `users` ADD `regionId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `cityId` int;