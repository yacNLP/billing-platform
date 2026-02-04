// test/utils/e2e-client.ts

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import request from 'supertest';
import { Server } from 'http';

// default tenant used in all e2e tests
const DEFAULT_TENANT_ID = 1;

// e2e http client with tenant automatically injected
export class E2EClient {
  private readonly client;
  private readonly tenantId: number;

  constructor(server: Server, tenantId: number = DEFAULT_TENANT_ID) {
    this.client = request(server);
    this.tenantId = tenantId;
  }

  // perform a get request with tenant header
  get(url: string) {
    return this.client.get(url).set('X-Tenant-Id', String(this.tenantId));
  }

  // perform a post request with tenant header
  post(url: string, body?: unknown) {
    const req = this.client.post(url).set('X-Tenant-Id', String(this.tenantId));
    if (body) req.send(body);
    return req;
  }

  // perform a patch request with tenant header
  patch(url: string, body?: unknown) {
    const req = this.client
      .patch(url)
      .set('X-Tenant-Id', String(this.tenantId));
    if (body) req.send(body);
    return req;
  }

  // perform a delete request with tenant header
  delete(url: string) {
    return this.client.delete(url).set('X-Tenant-Id', String(this.tenantId));
  }
}
