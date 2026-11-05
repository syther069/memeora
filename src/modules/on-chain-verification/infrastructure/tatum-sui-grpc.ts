import { ChannelCredentials } from '@grpc/grpc-js';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { GrpcTransport } from '@protobuf-ts/grpc-transport';

/** Tatum's Sui Mainnet gRPC gateway (https://docs.tatum.io/changelog/sui-grpc-available-tatum). */
export const TATUM_SUI_GRPC_HOST = 'sui-mainnet-grpc.gateway.tatum.io:443';

/**
 * Sui Mainnet gRPC client authenticated to Tatum. The API key is set as
 * default call metadata, so calls the Sui SDK makes internally (for example
 * zkLogin signature verification) are authenticated too. Server-only.
 */
/**
 * Tatum's free plan allows 3 requests per second (https://docs.tatum.io/docs/plans-limits).
 * Calls that may run in bursts go through `tatumCall`, which spaces call starts
 * and retries a rate-limited (HTTP 429) call with growing waits.
 */
const MIN_CALL_INTERVAL_MS = 350;
const RETRY_WAITS_MS = [1000, 2000, 4000];
let nextCallAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isRateLimited(error: unknown): boolean {
  return error instanceof Error && /\b429\b|RESOURCE_EXHAUSTED|too many requests/i.test(error.message);
}

export async function tatumCall<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const now = Date.now();
    const startAt = Math.max(now, nextCallAt);
    nextCallAt = startAt + MIN_CALL_INTERVAL_MS;
    if (startAt > now) await sleep(startAt - now);
    try {
      return await call();
    } catch (error) {
      if (!isRateLimited(error) || attempt >= RETRY_WAITS_MS.length) throw error;
      await sleep(RETRY_WAITS_MS[attempt]);
    }
  }
}

export function createTatumSuiGrpcClient(apiKey: string): SuiGrpcClient {
  const transport = new GrpcTransport({
    host: TATUM_SUI_GRPC_HOST,
    channelCredentials: ChannelCredentials.createSsl(),
    meta: { 'x-api-key': apiKey },
  });
  return new SuiGrpcClient({ network: 'mainnet', transport });
}

/** Unwraps a protobuf `Value` (the gRPC `json` read mask) into plain JSON. */
export function fromProtoValue(value: unknown): unknown {
  const kind = (value as { kind?: { oneofKind?: string } & Record<string, unknown> } | undefined)?.kind;
  if (!kind?.oneofKind) return null;
  const inner = kind[kind.oneofKind];
  if (kind.oneofKind === 'structValue') {
    const fields = (inner as { fields: Record<string, unknown> }).fields;
    return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, fromProtoValue(field)]));
  }
  if (kind.oneofKind === 'listValue') return (inner as { values: unknown[] }).values.map(fromProtoValue);
  return inner;
}
