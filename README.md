# Memeora

A personal and business finance assistant that keeps your sums exact and remembers your rules. Rules are stored encrypted on Walrus Memory, owned by your Sui wallet, and can be checked on Sui Mainnet through Tatum.

Built for the [Total Recall hackathon](https://tatum.io/hackathon/total-recall) by Tatum and Walrus, Consumer Finance track.

**[Live app](https://memora-mu-kohl.vercel.app)** · **[Documentation](https://memora-mu-kohl.vercel.app/docs)**

## Why Memeora

Finance apps track spending, but they forget how you want to handle money. Memeora separates two jobs:

- **The sums** come from your private ledger and are calculated on the server in integer minor units, never by an AI model.
- **Your rules** come from memory. With your consent, a rule such as "always keep $300 untouched" is recalled when you ask for advice.

The numbers stay the same. The advice changes.

## Features

- **Transactions:** record income and expenses in USD, USDC, USDT, SUI, WAL or another currency.
- **Budgets and goals:** set monthly budgets and track savings goals.
- **Assistant:** ask whether you can afford something and get an exact answer that reflects your rules.
- **Memory:** save, review and remove rules. Nothing is stored until you turn memory on.
- **Business workspace:** a separate ledger, budget, goals and memories, plus revenue, profit, burn and runway.
- **Proof:** check that each memory is certified, owned by your account and matches what the app recorded.
- **Wallet sign in:** sign a message with a Sui wallet. There is no password.

## How the integrations are used

| Service | What it does in Memeora |
|---|---|
| [Walrus Memory](https://docs.wal.app/walrus-memory) | Stores and recalls encrypted rules on Mainnet, in an account owned by the user's wallet |
| [Sui](https://docs.sui.io/) | Holds account ownership, delegate keys and memory blob objects |
| [Tatum](https://docs.tatum.io/) | Provides the Sui Mainnet gRPC gateway used for sign in checks and memory proofs |
| PostgreSQL | The source of truth for finances, with forced row level security per wallet |
| Groq (optional) | Words the Assistant's answer; without it, answers use the exact calculation only |

An outage in Walrus, Tatum or the LLM provider does not block recording transactions or viewing budgets.

## Mainnet evidence

| Item | Value |
|---|---|
| Agent ID (delegate public key) | `21e97dd5c234315e39ea103cf804a7fff7eb56343155c5a93d2f62a80588121c` |
| Memory account | `0x744b1c4b7a65b912583961402337731114b21ab2ee65b490323f257f91d3b242` |
| Account owner | `0x32e0579deaaee0d182aae8125db37b1ce68d527990ac32ce5d148f9cbe5d5b59` |

On 6 November 2026 this agent had 25 certified memories on Mainnet, read from Sui through Tatum. They were written by [the seeding script](scripts/seed-mainnet-memories.ts) and the app, and many repeat the same sample texts. Wallets using the live app get their own memory accounts. See the [evidence file](docs/mainnet-memory-evidence.json).

## Quickstart

Requires Node.js 20.9 or later.

```bash
git clone https://github.com/syther069/memora.git
cd memora
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The landing page, docs and guest dashboard work with the placeholder values. Wallet accounts and saved data need the database setup below.

### Connect a database

Set `DATABASE_MIGRATION_URL` in `.env.local` to a direct owner connection, then apply the migrations in order:

```bash
export DATABASE_MIGRATION_URL="postgresql://owner:password@host:5432/memeora"
for f in db/migrations/*.sql; do psql "$DATABASE_MIGRATION_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Migration `0003` creates the restricted `memeora_runtime` role. Give it a login with a password you generate:

```bash
psql "$DATABASE_MIGRATION_URL" -c "ALTER ROLE memeora_runtime LOGIN PASSWORD 'your-generated-password'"
```

Set `DATABASE_URL` to that role's connection string, using the pooled host if you have one. On Neon, never create this role in the Console, because Console roles can bypass row level security. See [db/README.md](db/README.md).

### Environment variables

All of these are server only. Never prefix them with `NEXT_PUBLIC_`, and never commit `.env.local`.

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | Runtime connection as `memeora_runtime` |
| `DATABASE_MIGRATION_URL` | Applying migrations only |
| `MEMEORA_APP_ORIGIN` | The exact public origin, included in the signed login message |
| `MEMEORA_DELEGATE_KEY_SECRET` | Encrypting each wallet's Walrus key at rest (32 random bytes, base64) |
| `TATUM_API_KEY` | Sui Mainnet reads; get one from [Tatum](https://docs.tatum.io/) |
| `MEMWAL_RELAYER_URL`, `MEMWAL_NAMESPACE` | Walrus Memory relayer and namespace prefix |
| `MEMWAL_ACCOUNT_ID`, `MEMWAL_KEY` | The seeding script only; the app uses per wallet accounts |
| `LLM_API_KEY`, `LLM_MODEL` | Optional wording for the Assistant, from [Groq](https://console.groq.com/keys) |

Generate the delegate key secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Development

On a fresh clone, generate Next.js types once before the type check:

```bash
npx next typegen
```

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | Run the TypeScript check |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite |

Stop the development server before running the tests, because the database tests can time out while it is running.

## Project structure

```text
src/
  app/          Pages, layouts and API routes
  components/   Interface components
  modules/
    finance/                Money, transactions, budgets and goals
    financial-memory/       Walrus Memory integration
    assistant/              Context assembly and prompt policy
    on-chain-verification/  Tatum and Sui reads
  lib/          Shared server configuration and utilities
db/migrations/  PostgreSQL schema and security policies
```

## Security

- Identity comes only from a verified wallet signature and a server session.
- Finance and memory tables use forced row level security under a least privilege role.
- Memory writes need recorded consent.
- Each wallet's Walrus key is stored only as AES-256-GCM ciphertext.

## Known limits

- A proof shows that a memory is stored, not what it says, because the text stays encrypted.
- Removing a memory in the app hides it from Memeora but does not delete its Walrus blob. Permanent deletion is a separate action signed by the owner wallet.

## More documentation

- [Product requirements](prd.md)
- [Architecture](architecture.md)
- [Operating rules](rules.md)
- [Design guide](design.md)
- [Project log and verification results](memory.md)
