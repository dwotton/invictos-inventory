import express, { type NextFunction, type Request, type Response } from 'express';
import type { SessionInfo, StockLine } from '../shared/types';
import {
  MIN_PASSWORD, SESSION_TTL_MS, checkPassword, checkSetupCode, clearFailures, createSession,
  endAllSessions, endSession, hashPassword, isLockedOut, noteFailure, sessionClinic,
} from './auth';
import { config, ordersEnabled } from './config';
import { APP_REFERENCE_PREFIX, NetSuiteError, netsuite } from './netsuite';
import { type Clinic, type Data, findClinicByName, load, nameKey, update } from './store';

const COOKIE = 'ivs';
const ORDER_HISTORY_DAYS = 120;

type Authed = Request & { clinic: Clinic };

function readCookie(req: Request, name: string) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: config.production, maxAge: SESSION_TTL_MS, path: '/',
  });
}

const fail = (res: Response, status: number, message: string) => res.status(status).json({ error: message });

/** Builds the clinic's shelf list from its saved counts, NetSuite item details and open orders. */
async function stockFor(clinic: Clinic, data: Data): Promise<StockLine[]> {
  const shelf = data.shelf[clinic.id] ?? {};
  const ids = Object.keys(shelf).map(Number);
  const gw = netsuite();
  const [items, orders] = await Promise.all([gw.getItems(ids), gw.getOrders(clinic.netsuiteCustomerId, ORDER_HISTORY_DAYS)]);

  const onOrder = new Map<number, number>();
  for (const o of orders) {
    if (o.status === 'cancelled' || o.status === 'closed' || o.status === 'shipped') continue;
    for (const l of o.lines) onOrder.set(l.itemId, (onOrder.get(l.itemId) ?? 0) + Math.max(0, l.qty - l.shipped));
  }
  const usage = data.usage[clinic.id] ?? [];

  return items
    .map(it => {
      const s = shelf[it.id];
      return {
        ...it,
        onHand: s.onHand,
        par: s.par,
        loc: s.loc,
        onOrder: onOrder.get(it.id) ?? 0,
        usage: usage.filter(u => u.itemId === it.id).slice(-6).map(u => u.qty),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '50kb' }));

  // Wrap async handlers so errors reach the error handler.
  const h = (fn: (req: Authed, res: Response) => Promise<unknown> | unknown) =>
    (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req as Authed, res)).catch(next);

  // ── Sign-in ───────────────────────────────────────────────────
  app.post('/api/auth/setup', h((req, res) => {
    const { clinicName, code, password } = req.body ?? {};
    if (typeof clinicName !== 'string' || typeof code !== 'string' || typeof password !== 'string') {
      return fail(res, 400, 'Enter the clinic name, setup code and a new password.');
    }
    if (password.length < MIN_PASSWORD) return fail(res, 400, 'Choose a password of at least ' + MIN_PASSWORD + ' characters.');
    const key = 'setup:' + nameKey(clinicName) + ':' + req.ip;
    if (isLockedOut(key)) return fail(res, 429, 'Too many attempts. Wait 15 minutes and try again.');

    const token = update(data => {
      const clinic = findClinicByName(data, clinicName);
      if (!clinic || !checkSetupCode(clinic, code)) return null;
      clinic.passwordHash = hashPassword(password);
      clinic.setupCode = null; // one use only
      endAllSessions(data, clinic.id);
      return createSession(data, clinic.id);
    });
    if (!token) {
      noteFailure(key);
      return fail(res, 401, 'That clinic name and setup code don’t match, or the code has expired. Ask Invictos for a new code.');
    }
    clearFailures(key);
    setSessionCookie(res, token);
    res.json({ ok: true });
  }));

  app.post('/api/auth/login', h((req, res) => {
    const { clinicName, password } = req.body ?? {};
    if (typeof clinicName !== 'string' || typeof password !== 'string') {
      return fail(res, 400, 'Enter the clinic name and password.');
    }
    const key = 'login:' + nameKey(clinicName) + ':' + req.ip;
    if (isLockedOut(key)) return fail(res, 429, 'Too many attempts. Wait 15 minutes and try again.');

    const token = update(data => {
      const clinic = findClinicByName(data, clinicName);
      if (!clinic || !checkPassword(clinic, password)) return null;
      return createSession(data, clinic.id);
    });
    if (!token) {
      noteFailure(key);
      return fail(res, 401, 'Clinic name or password is incorrect.');
    }
    clearFailures(key);
    setSessionCookie(res, token);
    res.json({ ok: true });
  }));

  app.post('/api/auth/logout', (req, res) => {
    update(data => endSession(data, readCookie(req, COOKIE)));
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  // ── Everything below needs a signed-in clinic ─────────────────
  app.use('/api', (req, res, next) => {
    const clinic = sessionClinic(load(), readCookie(req, COOKIE));
    if (!clinic) return fail(res, 401, 'Please sign in.');
    (req as Authed).clinic = clinic;
    next();
  });

  app.get('/api/session', (req, res) => {
    const info: SessionInfo = {
      clinic: { name: (req as Authed).clinic.name },
      netsuite: { mode: config.netsuite.mode, ordersEnabled: ordersEnabled() },
    };
    res.json(info);
  });

  app.get('/api/stock', h(async (req, res) => {
    res.json(await stockFor(req.clinic, load()));
  }));

  app.post('/api/usage', h(async (req, res) => {
    const itemId = Number(req.body?.itemId);
    const qty = Number(req.body?.qty);
    const caseRef = typeof req.body?.caseRef === 'string' ? req.body.caseRef.trim().slice(0, 80) : '';
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) return fail(res, 400, 'Quantity must be between 1 and 50.');

    const ok = update(data => {
      const entry = data.shelf[req.clinic.id]?.[itemId];
      if (!entry) return false;
      entry.onHand = Math.max(0, entry.onHand - qty);
      (data.usage[req.clinic.id] ??= []).push({ itemId, qty, caseRef, at: Date.now() });
      return true;
    });
    if (!ok) return fail(res, 404, 'That item isn’t on this clinic’s list.');
    res.json({ ok: true });
  }));

  app.get('/api/orders', h(async (req, res) => {
    res.json(await netsuite().getOrders(req.clinic.netsuiteCustomerId, ORDER_HISTORY_DAYS));
  }));

  app.post('/api/orders', h(async (req, res) => {
    if (!ordersEnabled()) return fail(res, 403, 'Submitting orders is switched off while the app is being tested.');
    const raw = Array.isArray(req.body?.lines) ? req.body.lines : [];
    const shelf = load().shelf[req.clinic.id] ?? {};
    const lines = raw
      .map((l: { itemId: unknown; qty: unknown }) => ({ itemId: Number(l?.itemId), qty: Number(l?.qty) }))
      .filter((l: { itemId: number; qty: number }) => shelf[l.itemId] && Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= 999);
    if (!lines.length || lines.length !== raw.length) return fail(res, 400, 'The reorder has an item or quantity that isn’t allowed.');

    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    const order = await netsuite().createOrder({
      customerId: req.clinic.netsuiteCustomerId,
      lines,
      reference: APP_REFERENCE_PREFIX + (note ? ' · ' + note : ''),
    });
    res.json(order);
  }));

  app.use('/api', (_req, res) => fail(res, 404, 'Not found.'));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof NetSuiteError) return fail(res, 502, err.message);
    console.error(err);
    fail(res, 500, err.message.startsWith('NETSUITE_MODE') ? err.message : 'Something went wrong on the server.');
  });

  return app;
}
