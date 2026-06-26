-- AddPluginExtensionFields (Phase 19 EXT-02)
ALTER TABLE "plugin" ADD COLUMN IF NOT EXISTS "is_extension" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plugin" ADD COLUMN IF NOT EXISTS "requested_scopes" JSONB;
ALTER TABLE "plugin" ADD COLUMN IF NOT EXISTS "consented_at" TIMESTAMPTZ;
