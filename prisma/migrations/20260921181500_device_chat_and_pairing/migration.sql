ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEVICE_MESSAGE';

CREATE TABLE IF NOT EXISTS "DeviceConversationMessage" (
  "id" TEXT NOT NULL,
  "computerId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "senderId" TEXT,
  "senderName" TEXT NOT NULL,
  "senderTitle" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceConversationMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeviceConversationMessage_computerId_fkey" FOREIGN KEY ("computerId") REFERENCES "Computer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DeviceConversationMessage_computerId_createdAt_idx" ON "DeviceConversationMessage"("computerId", "createdAt");
CREATE INDEX IF NOT EXISTS "DeviceConversationMessage_computerId_direction_readAt_idx" ON "DeviceConversationMessage"("computerId", "direction", "readAt");

CREATE TABLE IF NOT EXISTS "DevicePairingCode" (
  "id" TEXT NOT NULL,
  "computerId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DevicePairingCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevicePairingCode_computerId_fkey" FOREIGN KEY ("computerId") REFERENCES "Computer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DevicePairingCode_computerId_key" ON "DevicePairingCode"("computerId");
CREATE INDEX IF NOT EXISTS "DevicePairingCode_expiresAt_usedAt_idx" ON "DevicePairingCode"("expiresAt", "usedAt");
