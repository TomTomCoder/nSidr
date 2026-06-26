-- AlterTable: bring-your-own OAuth app credentials + allow pending rows (no token yet)
ALTER TABLE "user_integration" ADD COLUMN "client_id" TEXT;
ALTER TABLE "user_integration" ADD COLUMN "client_secret" TEXT;
ALTER TABLE "user_integration" ALTER COLUMN "access_token" DROP NOT NULL;
