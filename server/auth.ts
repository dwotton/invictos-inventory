import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Clinic, Data } from './store';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
const CODE_TTL_MS = 14 * 24 * 3600 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
export const MIN_PASSWORD = 10;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Creates a fresh one-time setup code for a clinic and returns it.
 * Nothing is sent anywhere: whoever runs the admin command hands it over.
 */
export function issueSetupCode(clinic: Clinic): string {
  let raw = '';
  for (let i = 0; i < 10; i++) raw += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  clinic.setupCode = { hash: sha256(raw), expiresAt: Date.now() + CODE_TTL_MS };
  return raw.slice(0, 5) + '-' + raw.slice(5);
}

export function checkSetupCode(clinic: Clinic, code: string) {
  const sc = clinic.setupCode;
  if (!sc || sc.expiresAt < Date.now()) return false;
  return safeEqualHex(sha256(normalizeCode(code)), sc.hash);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return 'scrypt$' + salt + '$' + hash;
}

export function checkPassword(clinic: Clinic, password: string) {
  if (!clinic.passwordHash) return false;
  const [, salt, hash] = clinic.passwordHash.split('$');
  return safeEqualHex(scryptSync(password, salt, 64).toString('hex'), hash);
}

export function createSession(data: Data, clinicId: string) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  for (const [k, s] of Object.entries(data.sessions)) if (s.expiresAt < now) delete data.sessions[k];
  data.sessions[sha256(token)] = { clinicId, expiresAt: now + SESSION_TTL_MS };
  return token;
}

export function sessionClinic(data: Data, token: string | undefined) {
  if (!token) return null;
  const s = data.sessions[sha256(token)];
  if (!s || s.expiresAt < Date.now()) return null;
  return data.clinics.find(c => c.id === s.clinicId) ?? null;
}

export function endSession(data: Data, token: string | undefined) {
  if (token) delete data.sessions[sha256(token)];
}

export function endAllSessions(data: Data, clinicId: string) {
  for (const [k, s] of Object.entries(data.sessions)) if (s.clinicId === clinicId) delete data.sessions[k];
}

// In-memory brake on repeated failed sign-ins.
const failures = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

export function isLockedOut(key: string) {
  const f = failures.get(key);
  return !!f && f.count >= MAX_FAILURES && f.until > Date.now();
}
export function noteFailure(key: string) {
  const f = failures.get(key);
  if (!f || f.until < Date.now()) failures.set(key, { count: 1, until: Date.now() + WINDOW_MS });
  else f.count++;
}
export function clearFailures(key: string) {
  failures.delete(key);
}
