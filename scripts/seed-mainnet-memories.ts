/**
 * Seeds 10 consumer-finance memories on Walrus Mainnet through the official
 * MemWal SDK, recalls each one to confirm it is indexed, and writes an
 * evidence file.
 *
 * Usage (Node >= 22.6 strips the TypeScript types natively):
 *   node scripts/seed-mainnet-memories.ts [--wallet <0x Sui address>]
 *   npx tsx scripts/seed-mainnet-memories.ts [--wallet <0x Sui address>]
 *
 * Reads MEMWAL_KEY, MEMWAL_ACCOUNT_ID, MEMWAL_RELAYER_URL, MEMWAL_NAMESPACE and
 * TATUM_API_KEY from the environment or .env.local. Secret values are never
 * printed. With --wallet, memories are written to the same per-wallet namespace
 * the app's WalrusClient reads (`<namespace>:<wallet address>`), so they surface
 * in the app (imported on the next Memory page load or Assistant question).
 */
import { existsSync, writeFileSync } from 'node:fs';
import { ChannelCredentials } from '@grpc/grpc-js';
import { MemWal } from '@mysten-incubation/memwal';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { GrpcTransport } from '@protobuf-ts/grpc-transport';
import type { RecallMemory, RememberResult } from '@mysten-incubation/memwal';

type Category = 'goal' | 'preference' | 'budget';

const SEED_MEMORIES: { category: Category; text: string; probe: string }[] = [
  {
    category: 'preference',
    text: 'Always keep a minimum ₹3,000 liquid buffer in the savings account before any discretionary purchase.',
    probe: 'minimum liquid buffer before discretionary purchases',
  },
  {
    category: 'budget',
    text: 'Cap dining out and food delivery at ₹3,500 per month.',
    probe: 'monthly limit for dining out and food delivery',
  },
  {
    category: 'goal',
    text: 'Build an emergency fund of ₹25,000 by March 2027.',
    probe: 'emergency fund target and deadline',
  },
  {
    category: 'budget',
    text: 'Keep entertainment subscriptions (streaming and music) under ₹800 per month in total.',
    probe: 'streaming and music subscription spending cap',
  },
  {
    category: 'goal',
    text: 'Save ₹4,500 for noise-canceling headphones without dipping into the emergency fund.',
    probe: 'saving for noise-canceling headphones',
  },
  {
    category: 'preference',
    text: 'Move ₹2,000 into savings on salary day, before paying any discretionary bills.',
    probe: 'automatic transfer to savings on salary day',
  },
  {
    category: 'budget',
    text: 'Limit cab and ride-hailing spending to ₹1,500 per month; prefer metro for the daily commute.',
    probe: 'cab and ride-hailing monthly budget',
  },
  {
    category: 'preference',
    text: 'Wait 48 hours before any non-essential purchase above ₹2,000.',
    probe: 'waiting period before large non-essential purchases',
  },
  {
    category: 'goal',
    text: 'Set aside ₹1,200 every month toward a ₹15,000 Goa trip in December 2027.',
    probe: 'monthly savings for the Goa trip',
  },
  {
    category: 'budget',
    text: 'Keep monthly grocery spending under ₹6,000 and avoid impulse buys from quick-commerce apps.',
    probe: 'grocery spending limit and quick-commerce impulse buys',
  },
];

// Same Tatum Sui gRPC gateway the app's TatumSuiClient uses.
const TATUM_SUI_GRPC_HOST = 'sui-mainnet-grpc.gateway.tatum.io:443';

interface Evidence {
  index: number;
  category: Category;
  text: string;
  namespace: string;
  memoryId: string;
  jobId: string | null;
  blobId: string;
  owner: string;
  storedAt: string;
  recallVerified: boolean;
  recallDistance: number | null;
  suiObjectId: string | null;
  suiTransactionDigest: string | null;
}

function loadEnv(): void {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set (environment or .env.local).`);
  return value;
}

function parseWalletArg(): string | undefined {
  const index = process.argv.indexOf('--wallet');
  if (index < 0) return undefined;
  const wallet = process.argv[index + 1];
  if (!/^0x[0-9a-f]{64}$/.test(wallet ?? '')) throw new Error('--wallet needs a full lowercase 0x Sui address.');
  return wallet;
}

/** Walrus blob IDs are the base64url encoding of a little-endian u256. */
function blobIdToU256(blobId: string): string {
  const bytes = Buffer.from(blobId, 'base64url');
  let value = BigInt(0);
  for (let i = bytes.length - 1; i >= 0; i--) {
    value = value * BigInt(256) + BigInt(bytes[i]);
  }
  return value.toString();
}

/** Reads a string field from a protobuf Struct value returned by the gRPC `json` read mask. */
function structField(json: unknown, field: string): string | undefined {
  const kind = (json as { kind?: { structValue?: { fields?: Record<string, { kind?: Record<string, unknown> }> } } })
    ?.kind;
  const value = kind?.structValue?.fields?.[field]?.kind;
  const raw = value?.stringValue ?? value?.numberValue;
  return raw === undefined ? undefined : String(raw);
}

/**
 * Lists the Sui Blob objects owned by the memory owner through Tatum's Sui
 * gRPC gateway and maps each Walrus blob ID to its object ID and the digest of
 * the last transaction that touched it. Blobs that are not found (for example,
 * not owned by this address) are reported as unresolved rather than guessed.
 */
async function resolveSuiBlobObjects(
  apiKey: string,
  owner: string,
  blobIds: string[]
): Promise<Map<string, { objectId: string; digest: string | null }>> {
  const transport = new GrpcTransport({
    host: TATUM_SUI_GRPC_HOST,
    channelCredentials: ChannelCredentials.createSsl(),
  });
  const client = new SuiGrpcClient({ network: 'mainnet', transport });
  const wanted = new Map(blobIds.map((id) => [blobIdToU256(id), id]));
  const found = new Map<string, { objectId: string; digest: string | null }>();
  let pageToken: Uint8Array | undefined;

  try {
    for (let page = 0; page < 50 && found.size < wanted.size; page++) {
      const result = await client.stateService.listOwnedObjects(
        {
          owner,
          pageSize: 100,
          pageToken,
          readMask: { paths: ['object_id', 'object_type', 'previous_transaction', 'json'] },
        },
        { meta: { 'x-api-key': apiKey }, timeout: 15000 }
      ).response;
      for (const object of result.objects) {
        if (!object.objectType?.endsWith('::blob::Blob') || !object.objectId) continue;
        const blobId = wanted.get(structField(object.json, 'blob_id') ?? '');
        if (blobId) found.set(blobId, { objectId: object.objectId, digest: object.previousTransaction ?? null });
      }
      if (!result.nextPageToken?.length) break;
      pageToken = result.nextPageToken;
    }
  } finally {
    transport.close();
  }

  return found;
}

async function main(): Promise<void> {
  loadEnv();
  const key = requireEnv('MEMWAL_KEY');
  const accountId = requireEnv('MEMWAL_ACCOUNT_ID');
  const serverUrl = process.env.MEMWAL_RELAYER_URL?.trim() || 'https://relayer.memory.walrus.xyz';
  const baseNamespace = process.env.MEMWAL_NAMESPACE?.trim() || 'memeora';
  const wallet = parseWalletArg();
  const namespace = `${baseNamespace}:${encodeURIComponent(wallet ?? 'mainnet-seed')}`;
  const evidencePath = wallet ? `docs/mainnet-memory-evidence.${wallet}.json` : 'docs/mainnet-memory-evidence.json';

  const memwal = MemWal.create({ key, accountId, serverUrl, namespace, requestTimeoutMs: 30000 });
  const evidence: Evidence[] = [];

  try {
    console.log(`Relayer: ${serverUrl}`);
    console.log(`Account: ${accountId}`);
    console.log(`Namespace: ${namespace}\n`);

    for (const [i, memory] of SEED_MEMORIES.entries()) {
      const text = `Memeora category: ${memory.category}. ${memory.text}`;
      // dedupe makes re-runs resolve to the existing blob instead of paying again.
      const stored: RememberResult = await memwal.rememberAndWait(text, namespace, {
        dedupe: true,
        timeoutMs: 180000,
      });
      const storedAt = new Date().toISOString();

      // The relayer can return an empty page while its index warms up; retry
      // empty results a few times before reporting the memory as not recalled.
      let hit: RecallMemory | undefined;
      for (let attempt = 0; attempt < 4 && !hit; attempt++) {
        if (attempt) await new Promise((resolve) => setTimeout(resolve, 2000));
        const recall = await memwal.recall({ query: memory.probe, limit: 10, namespace });
        hit = recall.results.find((r) => r.blob_id === stored.blob_id);
        if (recall.results.length) break;
      }

      evidence.push({
        index: i + 1,
        category: memory.category,
        text: memory.text,
        namespace: stored.namespace,
        memoryId: stored.id,
        jobId: stored.job_id ?? null,
        blobId: stored.blob_id,
        owner: stored.owner,
        storedAt,
        recallVerified: Boolean(hit && hit.text === text),
        recallDistance: hit?.distance ?? null,
        suiObjectId: null,
        suiTransactionDigest: null,
      });
      console.log(`[${i + 1}/10] blob ${stored.blob_id} recall=${hit ? 'verified' : 'NOT FOUND'}`);
    }
  } finally {
    memwal.destroy();
  }

  const tatumKey = process.env.TATUM_API_KEY?.trim();
  if (tatumKey && evidence.length) {
    try {
      const objects = await resolveSuiBlobObjects(tatumKey, evidence[0].owner, evidence.map((e) => e.blobId));
      for (const entry of evidence) {
        const object = objects.get(entry.blobId);
        entry.suiObjectId = object?.objectId ?? null;
        entry.suiTransactionDigest = object?.digest ?? null;
      }
      console.log(`\nSui Blob objects resolved via Tatum: ${objects.size}/${evidence.length}`);
    } catch (error) {
      console.log(`\nSui Blob object lookup via Tatum failed: ${(error as Error).message}`);
    }
  } else {
    console.log('\nTATUM_API_KEY not set; skipping Sui Blob object lookup.');
  }

  writeFileSync(
    evidencePath,
    JSON.stringify({ generatedAt: new Date().toISOString(), accountId, relayer: serverUrl, memories: evidence }, null, 2)
  );

  const verified = evidence.filter((e) => e.recallVerified).length;
  console.log(`Recall verified: ${verified}/${evidence.length}`);
  console.log(`Evidence written to ${evidencePath}`);
  if (verified < SEED_MEMORIES.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`Seeder failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
