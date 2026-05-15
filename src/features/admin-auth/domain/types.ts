export interface AdminSession {
  email: string;
  issuedAt: number;
  expiresAt: number;
}

export interface AdminCredentials {
  email: string;
  password: string;
}

export const SESSION_COOKIE = "mf_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
