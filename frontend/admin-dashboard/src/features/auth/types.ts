export type AuthRole = "ADMIN" | "USER";

export type JwtPayload = {
  sub: number;
  tenantId: number;
  role: AuthRole;
  iat: number;
  exp: number;
};

export type AuthSession = {
  accessToken: string;
  userId: number;
  tenantId: number;
  role: AuthRole;
  expiresAt: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
};

export type AuthStatus = "loading" | "authenticated" | "anonymous";
