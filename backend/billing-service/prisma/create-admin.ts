import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

async function main() {
  const tenantName = process.env.TENANT_NAME?.trim() || 'RevenueOps';
  const adminEmail = getRequiredEnv('ADMIN_EMAIL').toLowerCase();
  const adminPassword = getRequiredEnv('ADMIN_PASSWORD');

  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long');
  }

  let tenant = await prisma.tenant.findFirst({
    where: { name: tenantName },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: tenantName },
    });
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    if (
      existingAdmin.role !== Role.ADMIN ||
      existingAdmin.tenantId !== tenant.id
    ) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          role: Role.ADMIN,
          tenantId: tenant.id,
        },
      });
    }

    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      role: Role.ADMIN,
      tenantId: tenant.id,
    },
  });

  console.log(`Created admin user: ${adminEmail}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
