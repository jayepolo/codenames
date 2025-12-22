import { cookies } from 'next/headers';

const ADMIN_SESSION_COOKIE = 'admin_session';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

// Simple session token (in production, use proper session management)
const SESSION_SECRET = 'admin-session-secret-' + (process.env.NODE_ENV || 'dev');

export function hashPassword(password: string): string {
  // Simple hash for session token (not for password storage)
  // In production, use proper crypto
  return Buffer.from(`${SESSION_SECRET}:${password}`).toString('base64');
}

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  const sessionToken = hashPassword(ADMIN_PASSWORD);

  cookieStore.set(ADMIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return false;
  }

  const expectedToken = hashPassword(ADMIN_PASSWORD);
  return sessionToken === expectedToken;
}
