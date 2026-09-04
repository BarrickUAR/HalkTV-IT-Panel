import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Halktv2020', 10);
  
  await prisma.user.updateMany({
    data: { passwordHash: hash }
  });
  
  console.log('✅ Tüm şifreler başarıyla Halktv2020 olarak güncellendi.\n');

  const users = await prisma.user.findMany({
    select: { email: true, name: true, role: true },
    orderBy: { role: 'asc' }
  });

  console.log("👥 MEVCUT HESAPLAR:");
  users.forEach(u => {
    console.log(`- İsim: ${u.name ?? 'İsimsiz'} | Rol: ${u.role} | E-posta: ${u.email}`);
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
