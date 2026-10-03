-- Preserve rating history and foreign keys; this is domain data, not an identity store.
ALTER TABLE "users" RENAME TO "player_ratings";
ALTER TABLE "player_ratings" RENAME CONSTRAINT "users_pkey" TO "player_ratings_pkey";
ALTER INDEX "users_core_user_id_key" RENAME TO "player_ratings_core_user_id_key";
ALTER INDEX "users_display_name_key" RENAME TO "player_ratings_display_name_key";
ALTER TABLE "player_ratings" ALTER COLUMN "core_user_id" TYPE VARCHAR(64);
ALTER TABLE "player_ratings" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "problems" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "test_cases" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "match_rounds" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "submissions" ADD COLUMN "evaluation_started_at" TIMESTAMP(3);
UPDATE "submissions" SET "status" = 'PENDING' WHERE "status" = 'EVALUATING';
ALTER TABLE "player_ratings" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "problems" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "test_cases" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "submissions" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "match_queue" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "matches" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "match_rounds" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
