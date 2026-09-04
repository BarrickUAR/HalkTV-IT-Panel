import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
    }
  });
  console.log("Users:", users.length);
  
  const me = users[0];
  console.log("ME:", me);

  const query = await prisma.user.findMany({
    where: { 
      id: { not: me.id },
      status: "ACTIVE"
    },
    select: {
      id: true, 
      name: true,
      dmSent: {
        where: { recipientId: me.id, deletedByRecipient: false },
        take: 1,
      },
      dmReceived: {
        where: { senderId: me.id, deletedBySender: false },
        take: 1,
      }
    },
  });

  console.log("Query result:", query);
}

main().catch(console.error).finally(() => prisma.$disconnect());
