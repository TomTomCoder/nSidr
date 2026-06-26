-- ponytail: create workflow if missing (parallel migration was never in this history)
CREATE TABLE IF NOT EXISTS "workflow" (
  "id"                 TEXT NOT NULL,
  "name"               TEXT NOT NULL,
  "base_id"            TEXT NOT NULL,
  "config"             JSONB,
  "is_active"          BOOLEAN NOT NULL DEFAULT false,
  "created_by"         TEXT NOT NULL,
  "created_time"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_modified_time" TIMESTAMP(3),
  "last_modified_by"   TEXT,
  CONSTRAINT "workflow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workflow_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "base"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "workflow_base_id_idx" ON "workflow"("base_id");

-- CreateTable
CREATE TABLE "workflow_run" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "steps" JSONB NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_run_workflow_id_started_at_idx" ON "workflow_run"("workflow_id", "started_at" DESC);

-- AddForeignKey
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
