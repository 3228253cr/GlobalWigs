import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@globalwigs.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin user ${adminEmail} already exists — skipping seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      displayName: 'GlobalWigs Admin',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Seeded admin user: ${admin.email} / password from SEED_ADMIN_PASSWORD env`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
