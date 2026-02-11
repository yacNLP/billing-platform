import { E2EClient } from './e2e-client';

export async function loginAsAdmin(client: E2EClient) {
  await client.login({
    email: 'admin@test.com',
    password: 'password123',
  });
}

export async function loginAsUser(client: E2EClient) {
  await client.login({
    email: 'user@test.com',
    password: 'password123',
  });
}
