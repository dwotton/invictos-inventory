import type { Order, SessionInfo, StockLine } from '../shared/types';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Can’t reach the Invictos server. Check the connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'Something went wrong (' + res.status + ').', res.status);
  return data as T;
}

export const api = {
  session: () => call<SessionInfo>('GET', '/session'),
  login: (clinicName: string, password: string) => call('POST', '/auth/login', { clinicName, password }),
  setup: (clinicName: string, code: string, password: string) => call('POST', '/auth/setup', { clinicName, code, password }),
  logout: () => call('POST', '/auth/logout'),
  stock: () => call<StockLine[]>('GET', '/stock'),
  logUse: (itemId: number, qty: number, caseRef: string) => call('POST', '/usage', { itemId, qty, caseRef }),
  orders: () => call<Order[]>('GET', '/orders'),
  submitOrder: (lines: { itemId: number; qty: number }[], note: string) =>
    call<{ id: number; number: string }>('POST', '/orders', { lines, note }),
};
