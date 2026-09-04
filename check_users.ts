import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, name: true, role: true, username: true, status: true },
    orderBy: { role: 'asc' }
  });

  console.log("👥 KULLANICILARIN DETAYLI DURUMU:\n");
  users.forEach(u => {
    console.log(`İsim: ${u.name ?? 'İsimsiz'}`);
    console.log(`  E-posta:    ${u.email}`);
    console.log(`  Kullanıcı:  ${u.username ?? '❌ YOK'}`);
    console.log(`  Rol:        ${u.role}`);
    console.log(`  Durum:      ${u.status}`);
    console.log('');
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
