CREATE TABLE "audit_log" (
  "id"            TEXT NOT NULL,
  "created_time"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id"       TEXT,
  "space_id"      TEXT,
  "base_id"       TEXT,
  "event"         TEXT NOT NULL,
  "resource_type" TEXT,
  "resource_id"   TEXT,
  "ip"            TEXT,
  "payload"       JSONB,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_log_base_id_created_time_idx"  ON "audit_log"("base_id",  "created_time");
CREATE INDEX "audit_log_space_id_created_time_idx" ON "audit_log"("space_id", "created_time");
CREATE INDEX "audit_log_user_id_created_time_idx"  ON "audit_log"("user_id",  "created_time");
