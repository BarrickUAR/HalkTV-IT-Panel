ALTER TABLE "DeviceCommand" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "DeviceCommand_status_expiresAt_idx" ON "DeviceCommand"("status", "expiresAt");
