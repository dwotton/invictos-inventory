import { config } from '../config';
import type { NetSuiteGateway } from './gateway';
import { liveGateway } from './live';
import { sampleGateway } from './sample';

export function netsuite(): NetSuiteGateway {
  if (config.netsuite.mode === 'sample') return sampleGateway;
  const ns = config.netsuite;
  const missing = (['accountId', 'consumerKey', 'consumerSecret', 'tokenId', 'tokenSecret'] as const).filter(k => !ns[k]);
  if (missing.length) {
    throw new Error('NETSUITE_MODE=live but these .env settings are empty: ' + missing.join(', '));
  }
  return liveGateway;
}

export * from './gateway';
