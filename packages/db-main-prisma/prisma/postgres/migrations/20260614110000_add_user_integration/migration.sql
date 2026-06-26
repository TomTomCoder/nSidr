-- CreateTable
CREATE TABLE "user_integration" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMP(3),
    "scopes" TEXT[],
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_time" TIMESTAMP(3),
    "connected_time" TIMESTAMP(3),
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_time" TIMESTAMP(3),

    CONSTRAINT "user_integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_integration_user_id_idx" ON "user_integration"("user_id");
