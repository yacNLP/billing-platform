import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.customer.createMany({
    data: [
      { name: 'ACME Corp', email: 'billing@acme.com' },
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
      { name: 'Charlie', email: 'charlie@example.com' },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded customers');
}

main().finally(() => prisma.$disconnect());
