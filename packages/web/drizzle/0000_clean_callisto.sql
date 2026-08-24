CREATE TABLE `demo_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`status` text NOT NULL,
	`step` text NOT NULL,
	`payload_json` text NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_demo_applications_expires_at` ON `demo_applications` (`expires_at`);