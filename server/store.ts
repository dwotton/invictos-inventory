// Small JSON-file store for clinics, sign-in sessions and shelf counts.
// Fine for testing and a handful of clinics; move to a database before wide rollout.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from './config';

export interface Clinic {
  id: string;
  name: string;
  /** NetSuite customer internal id. */
  netsuiteCustomerId: number;
  passwordHash: string | null;
  setupCode: { hash: string; expiresAt: number } | null;
  createdAt: number;
}

export interface ShelfEntry {
  onHand: number;
  par: number;
  loc: string;
}

export interface UsageEntry {
  itemId: number;
  qty: number;
  caseRef: string;
  at: number;
}

export interface Data {
  clinics: Clinic[];
  sessions: Record<string, { clinicId: string; expiresAt: number }>;
  /** clinicId → NetSuite item id → shelf entry */
  shelf: Record<string, Record<string, ShelfEntry>>;
  usage: Record<string, UsageEntry[]>;
}

const empty = (): Data => ({ clinics: [], sessions: {}, shelf: {}, usage: {} });

export function load(): Data {
  if (!existsSync(config.dataFile)) return empty();
  return { ...empty(), ...JSON.parse(readFileSync(config.dataFile, 'utf8')) };
}

function save(data: Data) {
  mkdirSync(dirname(config.dataFile), { recursive: true });
  const tmp = config.dataFile + '.' + process.pid + '.tmp';
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, config.dataFile);
}

/** Read, change and write the store in one step. */
export function update<T>(fn: (data: Data) => T): T {
  const data = load();
  const result = fn(data);
  save(data);
  return result;
}

export function nameKey(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function findClinicByName(data: Data, name: string) {
  const key = nameKey(name);
  return data.clinics.find(c => nameKey(c.name) === key);
}

export function newClinic(name: string, netsuiteCustomerId: number): Clinic {
  return {
    id: randomUUID(),
    name: name.trim().replace(/\s+/g, ' '),
    netsuiteCustomerId,
    passwordHash: null,
    setupCode: null,
    createdAt: Date.now(),
  };
}
