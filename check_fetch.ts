import { fetchContacts } from "./src/app/(app)/messages/actions";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true }});
  console.log("All users:", users.map(u => u.name + " (" + u.role + ")").join(", "));
}
run().finally(() => prisma.$disconnect());
