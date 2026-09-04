import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const admin = await prisma.user.update({
    where: { username: "admin" },
    data: { role: "SUPER_ADMIN" }
  });
  console.log("Updated admin:", admin.role);
}
run().finally(() => prisma.$disconnect());
