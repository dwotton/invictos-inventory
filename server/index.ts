import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import { createApp } from './app';
import { config, isSandboxAccount, ordersEnabled } from './config';

const app = createApp();

// In production, also serve the built app from dist/.
const dist = resolve(process.cwd(), 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}

app.listen(config.port, () => {
  const ns = config.netsuite;
  const source = ns.mode === 'sample'
    ? 'sample data (no NetSuite connection)'
    : 'NetSuite account ' + ns.accountId + (isSandboxAccount(ns.accountId) ? ' (sandbox)' : ' (LIVE account)');
  console.log('Invictos server on http://localhost:' + config.port);
  console.log('  Data source:      ' + source);
  console.log('  Submitting orders: ' + (ordersEnabled() ? 'ON' : 'off'));
});
