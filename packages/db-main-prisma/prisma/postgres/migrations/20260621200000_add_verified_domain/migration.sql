CREATE TABLE "verified_domain" (
  "id"                 TEXT NOT NULL,
  "space_id"           TEXT NOT NULL,
  "domain"             TEXT NOT NULL,
  "verification_token" TEXT NOT NULL,
  "dns_record_name"    TEXT NOT NULL,
  "dns_record_value"   TEXT NOT NULL,
  "verified_at"        TIMESTAMP(3),
  "created_by"         TEXT NOT NULL,
  "created_time"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "verified_domain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "verified_domain_space_id_domain_key" ON "verified_domain"("space_id", "domain");
CREATE INDEX "verified_domain_space_id_idx" ON "verified_domain"("space_id");
