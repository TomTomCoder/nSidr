CREATE TABLE "app_builder" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "base_id" TEXT NOT NULL,
  "content" JSONB,
  "created_by" TEXT NOT NULL,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_modified_time" TIMESTAMP(3),
  "last_modified_by" TEXT,
  CONSTRAINT "app_builder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "app_builder_base_id_idx" ON "app_builder"("base_id");
