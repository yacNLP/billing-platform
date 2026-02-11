/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import request from 'supertest';
import { Server } from 'http';

export type Credentials = {
  email: string;
  password: string;
};

export class E2EClient {
  private readonly client;
  private accessToken?: string;

  constructor(server: Server) {
    this.client = request(server);
  }

  // authenticate client using real login endpoint
  async login(credentials: Credentials): Promise<void> {
    const res = await this.client
      .post('/auth/login')
      .send(credentials)
      .expect(201);

    this.accessToken = res.body.accessToken;
  }

  // attach authorization header if logged in
  private withAuth(req: request.Test): request.Test {
    if (this.accessToken) {
      req.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return req;
  }

  get(url: string) {
    return this.withAuth(this.client.get(url));
  }

  post(url: string, body?: unknown) {
    const req = this.withAuth(this.client.post(url));
    if (body) req.send(body);
    return req;
  }

  patch(url: string, body?: unknown) {
    const req = this.withAuth(this.client.patch(url));
    if (body) req.send(body);
    return req;
  }

  delete(url: string) {
    return this.withAuth(this.client.delete(url));
  }
}
