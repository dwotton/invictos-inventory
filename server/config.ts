import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env from the project root if present (Node 20.12+ / 22).
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

const env = process.env;

export const config = {
  port: Number(env.PORT ?? 8787),
  dataFile: resolve(process.cwd(), env.DATA_FILE ?? 'data/store.json'),
  production: env.NODE_ENV === 'production',
  netsuite: {
    /** "sample" (default) or "live". */
    mode: env.NETSUITE_MODE === 'live' ? ('live' as const) : ('sample' as const),
    accountId: env.NETSUITE_ACCOUNT_ID ?? '',
    consumerKey: env.NETSUITE_CONSUMER_KEY ?? '',
    consumerSecret: env.NETSUITE_CONSUMER_SECRET ?? '',
    tokenId: env.NETSUITE_TOKEN_ID ?? '',
    tokenSecret: env.NETSUITE_TOKEN_SECRET ?? '',
    /**
     * Submitting orders: "off" (default), "on" (sandbox accounts only),
     * or "on-production" (also allowed on the live account).
     */
    orders: (env.NETSUITE_ORDERS ?? 'off') as 'off' | 'on' | 'on-production',
    /** NetSuite location id app orders ship from (1 = Main Warehouse). */
    locationId: Number(env.NETSUITE_LOCATION_ID ?? 1),
  },
};

export function isSandboxAccount(accountId: string) {
  return /_SB\d*$/i.test(accountId.trim());
}

export function ordersEnabled() {
  const ns = config.netsuite;
  if (ns.mode === 'sample') return true;
  if (ns.orders === 'on-production') return true;
  return ns.orders === 'on' && isSandboxAccount(ns.accountId);
}
