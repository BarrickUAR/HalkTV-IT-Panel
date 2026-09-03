import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Veritabanı kurulumu ve başlangıç verileri yükleniyor...");

  // Ticket numarası için sequence
  try {
    await prisma.$executeRawUnsafe(
      "CREATE SEQUENCE IF NOT EXISTS ticket_number_seq",
    );
  } catch (e) {
    console.warn("Sequence oluşturma uyarısı:", e);
  }

  // 1. Varsayılan Departmanlar
  const defaultDepartments = [
    "Haber Merkezi",
    "Reji & Yayın",
    "Kurgu & Montaj",
    "Teknik Servis & IT",
    "Stüdyo & Kamera",
    "Muhasebe & Finans",
    "İnsan Kaynakları",
    "Yönetim",
  ];

  for (const deptName of defaultDepartments) {
    await prisma.department.upsert({
      where: { name: deptName },
      update: {},
      create: { name: deptName },
    });
  }
  console.log("✅ Varsayılan departmanlar oluşturuldu.");

  // IT Departmanını al
  const itDept = await prisma.department.findUnique({
    where: { name: "Teknik Servis & IT" },
  });

  // 2. İlk TEKNIK_MUDUR Hesabı
  const username = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "HalkTV2026!";
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@halktv.com.tr";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      email,
      name: "Teknik Müdür",
      role: "TEKNIK_MUDUR",
      status: "ACTIVE",
      departmentId: itDept?.id,
      passwordHash,
    },
  });

  console.log("\n🔑 İlk Yönetici Hesabı Hazır:");
  console.log(`   Kullanıcı Adı: ${admin.username}`);
  console.log(`   E-posta:       ${admin.email}`);
  console.log(`   Şifre:         ${password}\n`);

  // 3. Örnek Envanter Cihazları
  const rejiDept = await prisma.department.findUnique({ where: { name: "Reji & Yayın" } });
  const haberDept = await prisma.department.findUnique({ where: { name: "Haber Merkezi" } });

  const sampleComputers = [
    { name: "REJI-PROMPTER-01", departmentId: rejiDept?.id, notes: "Stüdyo 1 Prompter Bilgisayarı" },
    { name: "REJI-GRAFIK-01", departmentId: rejiDept?.id, notes: "Canlı Yayın Alt Yazı & Grafik" },
    { name: "HABER-EDITOR-PC1", departmentId: haberDept?.id, notes: "Haber Masası 1. Bölüm" },
    { name: "IT-DESK-YONETIM", departmentId: itDept?.id, userId: admin.id, notes: "IT Ana Yönetim Bilgisayarı" },
  ];

  for (const comp of sampleComputers) {
    await prisma.computer.upsert({
      where: { name: comp.name },
      update: {},
      create: comp,
    });
  }
  console.log("✅ Örnek cihaz envanteri tanımlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
