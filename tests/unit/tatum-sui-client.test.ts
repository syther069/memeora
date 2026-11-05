import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getVerificationExplanation } from '../../src/modules/on-chain-verification/domain/verification-types';
import { TatumSuiClient } from '../../src/modules/on-chain-verification/infrastructure/tatum-sui-client';

const makeReader = (overrides: {
  serviceInfo?: { chain?: string; chainId?: string; checkpointHeight?: bigint };
  object?: { objectId?: string; version?: bigint; digest?: string; objectType?: string; owner?: { kind?: number } };
  reject?: Error;
} = {}) => {
  const getServiceInfo = vi.fn(() => ({ response: overrides.reject ? Promise.reject(overrides.reject) : Promise.resolve(overrides.serviceInfo ?? {}) }));
  const getObject = vi.fn(() => ({ response: overrides.reject ? Promise.reject(overrides.reject) : Promise.resolve({ object: overrides.object }) }));
  return { reader: { ledgerService: { getServiceInfo, getObject } }, getServiceInfo, getObject };
};

describe('Verification scope disclosures', () => {
  it('explains checkpoint scope and limits', () => {
    const explanation = getVerificationExplanation('checkpoint');
    expect(explanation.proves).toContain('checkpoint height');
    expect(explanation.doesNotProve).toContain('Walrus memory write');
  });

  it('explains that an account object does not prove stored memories', () => {
    const explanation = getVerificationExplanation('walrus-account');
    expect(explanation.proves).toContain('Move type');
    expect(explanation.doesNotProve).toContain('memory blob');
  });
});

describe('TatumSuiClient', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    new TatumSuiClient({ apiKey: '' }).clearCache();
  });

  it('returns not_configured without making a provider request when the API key is missing', async () => {
    const client = new TatumSuiClient({ apiKey: '' });
    const result = await client.executeRpcQuery('checkpoint');
    expect(result.status).toBe('not_configured');
    expect(result.verified).toBe(false);
    expect(result.sequenceNumber).toBeUndefined();
  });

  it('calls Tatum Sui gRPC GetServiceInfo with API key and timeout', async () => {
    const { reader, getServiceInfo } = makeReader({ serviceInfo: { chain: 'mainnet', chainId: 'sui-mainnet', checkpointHeight: BigInt('68250000') } });
    const client = new TatumSuiClient({ apiKey: 'test-api-key', timeoutMs: 2500, clientFactory: () => reader });
    const result = await client.executeRpcQuery('checkpoint');
    expect(getServiceInfo).toHaveBeenCalledWith({}, { meta: { 'x-api-key': 'test-api-key' }, timeout: 2500 });
    expect(result.status).toBe('verified');
    expect(result.sequenceNumber).toBe('68250000');
    expect(result.method).toBe('sui.rpc.v2.LedgerService/GetServiceInfo');
  });

  it('does not verify or cache a service response that is not identified as Mainnet', async () => {
    const { reader, getServiceInfo } = makeReader({ serviceInfo: { chain: 'testnet', checkpointHeight: BigInt('12') } });
    const result = await new TatumSuiClient({ apiKey: 'test-api-key', clientFactory: () => reader }).executeRpcQuery('checkpoint');
    expect(result.status).toBe('unexpected_network');
    expect(result.verified).toBe(false);
    expect(getServiceInfo).toHaveBeenCalledTimes(1);
  });

  it('checks the configured object id and verifies only the MemWalAccount Move type', async () => {
    const { reader, getObject } = makeReader({ object: {
      objectId: '0xabc123', version: BigInt('14'), digest: 'digest-value',
      objectType: '0x123::account::MemWalAccount', owner: { kind: 1 },
    } });
    const client = new TatumSuiClient({ apiKey: 'test-api-key', accountId: '0xabc123', clientFactory: () => reader });
    const result = await client.executeRpcQuery('walrus-account');
    expect(getObject).toHaveBeenCalledWith({
      objectId: '0xabc123',
      readMask: { paths: ['object_id', 'version', 'digest', 'object_type', 'owner'] },
    }, { meta: { 'x-api-key': 'test-api-key' }, timeout: 5000 });
    expect(result.status).toBe('verified');
    expect(result.accountObject?.version).toBe('14');
  });

  it('rejects a different Move object type', async () => {
    const { reader } = makeReader({ object: { objectId: '0xabc123', version: BigInt('1'), digest: 'd', objectType: '0x2::coin::Coin' } });
    const result = await new TatumSuiClient({ apiKey: 'test-api-key', accountId: '0xabc123', clientFactory: () => reader }).executeRpcQuery('walrus-account');
    expect(result.status).toBe('unexpected_object');
    expect(result.verified).toBe(false);
  });

  it('serves successful checkpoint results from the 60 second module cache', async () => {
    const { reader, getServiceInfo } = makeReader({ serviceInfo: { chain: 'mainnet', checkpointHeight: BigInt('68250100') } });
    const client = new TatumSuiClient({ apiKey: 'test-api-key', accountId: '0xabc123', clientFactory: () => reader });
    const first = await client.executeRpcQuery('checkpoint');
    const second = await client.executeRpcQuery('checkpoint');
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.cachedAt).toBeDefined();
    expect(getServiceInfo).toHaveBeenCalledTimes(1);
  });

  it('returns a graceful unavailable result on a provider failure', async () => {
    const { reader } = makeReader({ reject: new Error('connection timed out') });
    const result = await new TatumSuiClient({ apiKey: 'test-api-key', clientFactory: () => reader }).executeRpcQuery('checkpoint');
    expect(result.status).toBe('unavailable');
    expect(result.verified).toBe(false);
    expect(result.error).toContain('unavailable');
  });
});
