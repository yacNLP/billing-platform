import { E2EClient } from './e2e-client';

export async function login(
  client: E2EClient,
  email: string,
  password = 'password123',
) {
  await client.login({ email, password });
}

// optional sugar helpers
export async function loginAsAdmin(client: E2EClient) {
  return login(client, 'admin@test.com');
}

export async function loginAsUser(client: E2EClient) {
  return login(client, 'user@test.com');
}
