import { execSync } from 'node:child_process';
import { seedTestData, truncateAll, disconnectPrisma } from './seed';

beforeAll(async () => {
  // Reset database using Prisma (drops all data and re-applies migrations)
  execSync('npx prisma migrate reset --force --skip-generate --skip-seed', {
    stdio: 'inherit',
  });

  // Insert minimal fake data
  await seedTestData();
});

/**
 * Runs after each test.
 * - Clean database (truncate all rows)
 * - Re-seed a fresh minimal state so each test starts clean
 */

afterEach(async () => {
  await truncateAll();
  await seedTestData();
});

// close Prisma after all tests
afterAll(async () => {
  await disconnectPrisma();
});
