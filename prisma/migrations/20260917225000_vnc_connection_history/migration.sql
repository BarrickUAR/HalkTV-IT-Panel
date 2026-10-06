ALTER TABLE "Computer"
  ADD COLUMN IF NOT EXISTS "lastVncConnectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastVncConnectionStatus" TEXT;

CREATE TABLE IF NOT EXISTS "RemoteConnection" (
  "id" TEXT NOT NULL,
  "targetComputerId" TEXT,
  "targetComputerName" TEXT,
  "targetIp" TEXT NOT NULL,
  "sourceComputerName" TEXT,
  "actorId" TEXT,
  "actorName" TEXT,
  "actorTitle" TEXT,
  "method" TEXT NOT NULL DEFAULT 'TIGHTVNC',
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RemoteConnection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RemoteConnection_targetIp_createdAt_idx" ON "RemoteConnection"("targetIp", "createdAt");
CREATE INDEX IF NOT EXISTS "RemoteConnection_actorId_createdAt_idx" ON "RemoteConnection"("actorId", "createdAt");
