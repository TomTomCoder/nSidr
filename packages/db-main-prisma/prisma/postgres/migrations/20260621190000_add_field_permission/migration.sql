CREATE TABLE "field_permission" (
  "id"           TEXT NOT NULL,
  "field_id"     TEXT NOT NULL,
  "principal"    TEXT NOT NULL,
  "action"       TEXT NOT NULL,
  "allowed"      BOOLEAN NOT NULL,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"   TEXT NOT NULL,
  CONSTRAINT "field_permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "field_permission_field_id_principal_action_key"
  ON "field_permission"("field_id", "principal", "action");
CREATE INDEX "field_permission_field_id_idx" ON "field_permission"("field_id");
