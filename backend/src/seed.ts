import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@klabu.site';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is required to seed the admin account.');
  }

  const hashed = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashed,
      role: 'ADMIN',
    },
  });

  console.log(`Admin account ready: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
