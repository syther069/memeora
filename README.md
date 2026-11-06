<div align="center">

# Memeora

**A finance assistant that keeps your sums exact and remembers your rules.**

[Live App](https://memora-mu-kohl.vercel.app) · [Documentation](https://memora-mu-kohl.vercel.app/docs) · [Architecture](docs/architecture.md) · [Security](SECURITY.md)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-RLS-4169E1?logo=postgresql&logoColor=white)
![Network](https://img.shields.io/badge/Sui-Mainnet-014BAA)

</div>

## Overview

Finance apps track spending, but they forget how you want to handle money. Memeora separates two jobs:

- **The sums** come from your private ledger and are calculated on the server, never by an AI model.
- **Your rules** come from memory. With your consent, a rule such as "always keep $300 untouched" is stored encrypted on Walrus Mainnet and recalled when you ask for advice.

The numbers stay the same. The advice changes.

Built for the [Total Recall hackathon](https://tatum.io/hackathon/total-recall) by Tatum and Walrus, in the Consumer Finance track.

## Who it is for

- **Individuals** who want to check a purchase against their budget, goals and personal rules before spending.
- **Founders, freelancers and small business owners** who want a clear view of revenue, spending and runway.

## Features

| Feature | Description |
|---|---|
| Transactions | Record income and expenses in USD, USDC, USDT, SUI, WAL or another currency |
| Budgets and goals | Set monthly budgets and track savings goals |
| Assistant | Ask whether you can afford something and get an exact answer that reflects your rules |
| Memory | Save, review and remove rules, with nothing stored until you opt in |
| Business workspace | A separate ledger, budget, goals and memories, plus revenue, profit, burn and runway |
| Proof | Check that a memory is certified, owned by your account and matches the app's record |
| Wallet sign in | Sign a message with a Sui wallet, with no password |

## How it works

```mermaid
flowchart LR
  U[Sui wallet user] --> A[Memeora on Next.js]
  A --> D[(PostgreSQL ledger)]
  A -->|encrypted rules| W[Walrus Memory Mainnet]
  A -->|proof reads| T[Tatum gRPC gateway]
  T --> S[Sui Mainnet]
  W --> S
  A -.->|optional wording| L[Groq LLM]
```

An outage in Walrus, Tatum or the LLM provider is designed not to block recording transactions or viewing budgets. Read the full [architecture notes](docs/architecture.md).

## Tech stack

| Area | Technology |
|---|---|
| Application | Next.js 16, React 19, TypeScript |
| Interface | Tailwind CSS 4, Framer Motion, GSAP, Iconoir |
| Data | PostgreSQL with forced row level security |
| Memory | [Walrus Memory](https://docs.wal.app/walrus-memory) |
| Blockchain | [Sui](https://docs.sui.io/) through [Tatum](https://docs.tatum.io/) |
| Testing | Vitest, PGlite |
| Hosting | Vercel, Neon |

## Mainnet evidence

| Item | Value |
|---|---|
| Agent ID | `21e97dd5c234315e39ea103cf804a7fff7eb56343155c5a93d2f62a80588121c` |
| Memory account | `0x744b1c4b7a65b912583961402337731114b21ab2ee65b490323f257f91d3b242` |
| Account owner | `0x32e0579deaaee0d182aae8125db37b1ce68d527990ac32ce5d148f9cbe5d5b59` |

On 6 November 2026 this agent had 25 certified memories on Mainnet, read from Sui through Tatum. Most were written by [the seeding script](scripts/seed-mainnet-memories.ts) and repeat the same sample texts. Wallets using the live app get their own memory accounts. See the [evidence file](docs/mainnet-memory-evidence.json).

## Quickstart

Requires Node.js 20.9 or later.

```bash
git clone https://github.com/syther069/memora.git
cd memora
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The landing page, docs and guest dashboard load with the placeholder values. Wallet accounts and saved data need a database.

### Database setup

Set your owner connection and apply the migrations:

```bash
export DATABASE_MIGRATION_URL="postgresql://owner:password@host:5432/memeora"
for f in db/migrations/*.sql; do psql "$DATABASE_MIGRATION_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Then enable the restricted runtime role with a password you generate:

```bash
psql "$DATABASE_MIGRATION_URL" -c "ALTER ROLE memeora_runtime LOGIN PASSWORD 'your-generated-password'"
```

Set `DATABASE_URL` to that role's connection string. See the [database guide](db/README.md).

### Environment variables

All values are server only. Never prefix them with `NEXT_PUBLIC_`, and never commit `.env.local`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Runtime connection as `memeora_runtime` |
| `DATABASE_MIGRATION_URL` | Applying migrations only |
| `MEMEORA_APP_ORIGIN` | Exact public origin, included in the signed login message |
| `MEMEORA_DELEGATE_KEY_SECRET` | Encrypts each wallet's Walrus key at rest (32 random bytes, base64) |
| `TATUM_API_KEY` | Sui Mainnet reads |
| `MEMWAL_RELAYER_URL`, `MEMWAL_NAMESPACE` | Walrus Memory relayer and namespace prefix |
| `MEMWAL_ACCOUNT_ID`, `MEMWAL_KEY` | Seeding script only |
| `LLM_API_KEY`, `LLM_MODEL` | Optional Assistant wording, using [Groq](https://console.groq.com/keys) |

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

Stop the development server before running tests, because the database tests can time out alongside it.

## Project structure

```text
src/
  app/          Pages, layouts and API routes
  components/   Interface components
  modules/      Finance, memory, assistant and verification logic
  lib/          Shared server utilities
db/             PostgreSQL migrations and guide
docs/           Architecture notes and Mainnet evidence
scripts/        Mainnet seeding script
tests/          Unit and integration tests
```

## Known limits

- A proof shows that a memory is stored, not what it says, because the text stays encrypted.
- Removing a memory hides it from Memeora but keeps its Walrus blob. Permanent deletion is a separate action signed by the owner wallet.
- Every currency keeps two decimals in the ledger, so token amounts under 0.01 cannot be recorded.
- Memeora gives general guidance and is not financial advice.

## Acknowledgements

Several landing page animations and interface components are adapted from free [Skiper UI](https://skiper-ui.com) components, and others take inspiration from its previews. Space Grotesk is used under the SIL Open Font License.

## AI disclosure

AI tools were used heavily to build this project.

- **Development:** AI coding assistants, including Claude Code and Antigravity, wrote much of the code, tests, migrations and documentation under the author's direction. The author set the requirements and product decisions, and tested the live app.
- **Content:** AI helped draft the blog post and the demo video script. The demo voice-over is synthetic.
- **In the product:** the Assistant can use an LLM through Groq to word its answers. All financial figures come from deterministic server code, not from the model.
