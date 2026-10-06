ALTER TABLE "Computer"
  ADD COLUMN IF NOT EXISTS "domain" TEXT,
  ADD COLUMN IF NOT EXISTS "organizationalUnit" TEXT,
  ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "windowsUser" TEXT,
  ADD COLUMN IF NOT EXISTS "operatingSystem" TEXT,
  ADD COLUMN IF NOT EXISTS "inventorySource" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "lastHeartbeatAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastAdSyncAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "kioskVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "anyDeskId" TEXT,
  ADD COLUMN IF NOT EXISTS "tightVncAvailable" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Computer_lastHeartbeatAt_idx" ON "Computer"("lastHeartbeatAt");
CREATE INDEX IF NOT EXISTS "Computer_lastAdSyncAt_idx" ON "Computer"("lastAdSyncAt");
CREATE INDEX IF NOT EXISTS "Computer_inventorySource_idx" ON "Computer"("inventorySource");

CREATE TABLE IF NOT EXISTS "DeviceCredential" (
  "id" TEXT NOT NULL,
  "computerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "tokenPrefix" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP(3),
  "rotatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeviceCredential_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeviceCredential_computerId_fkey" FOREIGN KEY ("computerId") REFERENCES "Computer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceCredential_computerId_key" ON "DeviceCredential"("computerId");
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceCredential_tokenHash_key" ON "DeviceCredential"("tokenHash");

CREATE TABLE IF NOT EXISTS "Asset" (
  "id" TEXT NOT NULL,
  "assetTag" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "brand" TEXT,
  "model" TEXT,
  "serialNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
  "location" TEXT,
  "warrantyEndsAt" TIMESTAMP(3),
  "invoicePath" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_assetTag_key" ON "Asset"("assetTag");
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_serialNumber_key" ON "Asset"("serialNumber");
CREATE INDEX IF NOT EXISTS "Asset_type_idx" ON "Asset"("type");
CREATE INDEX IF NOT EXISTS "Asset_status_idx" ON "Asset"("status");

CREATE TABLE IF NOT EXISTS "AssetAssignment" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "returnedAt" TIMESTAMP(3),
  "note" TEXT,
  CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssetAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AssetAssignment_userId_returnedAt_idx" ON "AssetAssignment"("userId", "returnedAt");
CREATE INDEX IF NOT EXISTS "AssetAssignment_assetId_assignedAt_idx" ON "AssetAssignment"("assetId", "assignedAt");
