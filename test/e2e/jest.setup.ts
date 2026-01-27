import { seedTestData, disconnectPrisma } from './seed';

beforeAll(async () => {
  await seedTestData();
});

afterAll(async () => {
  await disconnectPrisma();
});
