import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ select: { name: true, email: true, username: true }});
  console.log(users);
}
run().finally(() => prisma.$disconnect());
