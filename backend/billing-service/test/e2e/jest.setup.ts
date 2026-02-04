import { execSync } from 'child_process';
import { seedTestData, disconnectPrisma } from './seed';

beforeAll(async () => {
  // apply prisma migrations to test database
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
  });

  await seedTestData();
});

afterAll(async () => {
  await disconnectPrisma();
});
