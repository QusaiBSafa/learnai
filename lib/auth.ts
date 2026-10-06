import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { cookies } from 'next/headers';

// Accounts live in a separate, writable SQLite file (the content DB is read-only).
// Set LEARNAI_USERS_DB to put it on a persistent volume.
const USERS_DB = process.env.LEARNAI_USERS_DB || join(process.cwd(), 'data', 'users.db');
export const SESSION_COOKIE = 'learnai_session';
const SESSION_DAYS = 30;

let db: DatabaseSync | null = null;
function conn() {
  if (db) return db;
  mkdirSync(dirname(USERS_DB), { recursive: true });
  db = new DatabaseSync(USERS_DB);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
  `);
  return db;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${(await scryptAsync(password, salt)).toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(':');
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Computed once so unknown-user logins cost the same as wrong-password ones.
const DUMMY_HASH = hashPassword('learnai-dummy-password');

export type User = { id: number; username: string };
export type AuthResult = { ok: true; user: User } | { ok: false; error: string; status: number };

export const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;

export function validateCredentials(username: unknown, password: unknown): string | null {
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) return 'Username must be 3–24 letters, numbers or underscores.';
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 200) return 'Password is too long.';
  return null;
}

export async function registerUser(username: string, password: string): Promise<AuthResult> {
  const bad = validateCredentials(username, password);
  if (bad) return { ok: false, error: bad, status: 400 };
  const hash = await hashPassword(password);
  try {
    const r = conn().prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)').run(username, hash, Date.now());
    return { ok: true, user: { id: Number(r.lastInsertRowid), username } };
  } catch (e) {
    if (String((e as Error).message).includes('UNIQUE')) return { ok: false, error: 'That username is taken.', status: 409 };
    throw e;
  }
}

export async function checkLogin(username: unknown, password: unknown): Promise<AuthResult> {
  const fail: AuthResult = { ok: false, error: 'Wrong username or password.', status: 401 };
  if (typeof username !== 'string' || typeof password !== 'string' || password.length > 200) return fail;
  const row = conn().prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username) as
    | { id: number; username: string; password_hash: string }
    | undefined;
  const good = await verifyPassword(password, row?.password_hash ?? (await DUMMY_HASH));
  return row && good ? { ok: true, user: { id: row.id, username: row.username } } : fail;
}

export async function startSession(userId: number) {
  const token = randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  conn().prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  conn().prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, expires);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expires),
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) conn().prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = conn()
    .prepare('SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .get(sha256(token), Date.now()) as User | undefined;
  return row ? { id: row.id, username: row.username } : null;
}
