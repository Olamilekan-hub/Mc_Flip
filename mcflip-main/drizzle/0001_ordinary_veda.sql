CREATE TABLE IF NOT EXISTS "subscription" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"user_id" varchar(255),
	"creation_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"activation_date" timestamp with time zone,
	"expiration_date" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
