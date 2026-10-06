CREATE TABLE "DeviceConversationAssignment" (
    "id" TEXT NOT NULL,
    "computerId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceConversationAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceConversationAssignment_computerId_key" ON "DeviceConversationAssignment"("computerId");
CREATE INDEX "DeviceConversationAssignment_assigneeId_idx" ON "DeviceConversationAssignment"("assigneeId");

ALTER TABLE "DeviceConversationAssignment" ADD CONSTRAINT "DeviceConversationAssignment_computerId_fkey" FOREIGN KEY ("computerId") REFERENCES "Computer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceConversationAssignment" ADD CONSTRAINT "DeviceConversationAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
