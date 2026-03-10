CREATE TABLE `analytics_caches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cache_key` varchar(255) NOT NULL,
	`data` json,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_caches_id` PRIMARY KEY(`id`),
	CONSTRAINT `analytics_caches_cache_key_unique` UNIQUE(`cache_key`)
);
--> statement-breakpoint
CREATE TABLE `crime_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`district_id` int NOT NULL,
	`crime_type` varchar(100) NOT NULL,
	`predicted_year` int NOT NULL,
	`predicted_value` int NOT NULL,
	`confidence` decimal(5,2) DEFAULT '0',
	`trend` enum('increasing','decreasing','stable') NOT NULL,
	`risk_level` enum('low','medium','high','critical') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crime_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crime_statistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`district_id` int NOT NULL,
	`year` int NOT NULL,
	`rape_cases` int DEFAULT 0,
	`homicide` int DEFAULT 0,
	`attempted_homicide` int DEFAULT 0,
	`abduction` int DEFAULT 0,
	`kidnapping` int DEFAULT 0,
	`arson` int DEFAULT 0,
	`theft_over_50k` int DEFAULT 0,
	`grievous_hurt` int DEFAULT 0,
	`hurt_by_knife` int DEFAULT 0,
	`robbery` int DEFAULT 0,
	`extortion` int DEFAULT 0,
	`unnatural_offense` int DEFAULT 0,
	`sexual_abuse` int DEFAULT 0,
	`total` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crime_statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crime_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crime_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `crime_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `data_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_size` int,
	`records_imported` int DEFAULT 0,
	`status` enum('pending','processing','completed','failed') DEFAULT 'pending',
	`error_message` text,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `data_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `districts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`latitude` decimal(10,6) NOT NULL,
	`longitude` decimal(10,6) NOT NULL,
	`province` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `districts_id` PRIMARY KEY(`id`),
	CONSTRAINT `districts_name_unique` UNIQUE(`name`)
);
