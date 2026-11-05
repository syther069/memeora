# Memeora

> A context-aware personal finance assistant with persistent, user-controlled memory powered by Walrus Memory and verifiable on-chain data via Tatum Sui RPC. Built for the Total Recall Hackathon (Consumer Finance Apps Track).

> **Status (2026-11-04):** Sign-in is wallet-only: a one-time Sui Mainnet personal-message signature (Ed25519, or zkLogin verified through Tatum's Sui gRPC gateway) creates an HttpOnly Memeora session. All finance, memory and Assistant routes run on provider-neutral PostgreSQL with forced row-level security, as a least-privilege runtime role. Memories are written to and recalled from Walrus Memory on Mainnet, in one namespace per wallet. See [`memory.md`](memory.md) for verified evidence and open items.

---

## 1. Overview

Memeora helps individuals track spending, stay within budgets, and work toward savings goals with a transparent, context-aware AI assistant. Unlike traditional budget trackers, Memeora features **persistent financial memory**: with explicit user consent, it retains approved goals and preferences across sessions to deliver increasingly personalized, context-aware guidance without guessing or hallucinating numbers.

### Core Pillars
- **Authoritative Database Truth**: PostgreSQL is the canonical source for transactions, budgets, and savings goals. Memories add context; they never override these records.
- **Deterministic Financial Engine**: Money arithmetic, totals, budget utilization, and affordability assessments are calculated deterministically on the server in integer minor units (e.g., paise/cents)—never by an LLM.
- **Persistent Walrus Memory**: With recorded consent, approved rules and goals are written to Walrus Memory on Mainnet in the wallet's own namespace (`memeora:<wallet address>`), and the Assistant recalls them semantically for each question.
- **On-Chain Verification with Tatum**: Server-side Tatum Sui RPC integration provides verifiable on-chain metadata.
- **User Privacy & Control**: Complete transparency over stored memories with inspection, updating, and deletion controls.

---

## 2. Architecture & Design

Memeora follows a **Modular Monolith** pattern adhering to **Clean Architecture / Hexagonal Architecture** and Domain-Driven Design (DDD):

```text
Presentation Layer (Next.js App Router, React, Tailwind CSS)
        │
Application Layer (Use Cases, Orchestration, DTOs)
   ┌────┴──────────────────────────┐
   │                               │
Finance Domain             Financial Memory & Assistant Domain
(Pure arithmetic, money,    (Context assembly, prompt policy,
 budgets, invariant checks)  safe memory reconciliation)
   │                               │
   └───────────────┬───────────────┘
                   │
           Ports & Adapters
 ┌─────────────────┼─────────────────┬─────────────────┐
 │                 │                 │                 │
PostgreSQL         Walrus Memory   Tatum Sui RPC     LLM Adapter
(Adapter)           (Adapter)       (Adapter)         (Adapter)
```

For comprehensive details, refer to:
- [prd.md](file:///c:/memora/prd.md) — Product Requirements Document.
- [architecture.md](file:///c:/memora/architecture.md) — Architecture and Bounded Contexts.
- [rules.md](file:///c:/memora/rules.md) — Mandatory Operating & Security Rules.
- [memory.md](file:///c:/memora/memory.md) — Living Project Log & Verification Status.

---

## 3. Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript (Strict Mode enabled)
- **Styling**: Tailwind CSS v4
- **Database & Auth**: Provider-neutral PostgreSQL (`pg`) with forced RLS per wallet, and Sui wallet sign-in (Mysten dApp Kit). Developed against Neon.
- **Memory Store**: Walrus Memory TypeScript SDK
- **Blockchain RPC**: Tatum Sui RPC
- **Testing**: Vitest (Unit & Integration tests)
- **Linting & Formatting**: ESLint 9

---

## 4. Getting Started

### Prerequisites
- Node.js 20+ or 22+
- npm 10+

### Installation
```bash
git clone <repo-url> memeora
cd memeora
npm install
```

### Configuration

Copy `.env.example` to `.env.local` and fill in real values. `.env.local` is git-ignored; never commit it.
```bash
cp .env.example .env.local
```

| Variable | Description | Exposure |
|---|---|---|
| `DATABASE_URL` | Pooled connection for the `memeora_runtime` role (no table ownership, no `BYPASSRLS`) | **Server Only** |
| `DATABASE_MIGRATION_URL` | Direct owner connection, used only to apply migrations | **Server Only** |
| `MEMEORA_APP_ORIGIN` | Exact public origin, part of the signed login message (`http://localhost:3000` in development) | Server |
| `MEMWAL_ACCOUNT_ID` | Walrus Memory account object ID | **Server Only** |
| `MEMWAL_KEY` | Walrus Memory Ed25519 delegate private key | **Server Only** |
| `MEMWAL_RELAYER_URL` | Walrus Memory relayer (`https://relayer.memory.walrus.xyz`) | **Server Only** |
| `MEMWAL_NAMESPACE` | Namespace prefix (`memeora`) | **Server Only** |
| `TATUM_API_KEY` | Tatum API key for the Sui Mainnet gRPC gateway | **Server Only** |
| `LLM_API_KEY` | Groq API key for the Assistant's wording; without it, answers use the exact calculation only | **Server Only** |

> **Security Note**: Never prefix provider private keys or API keys with `NEXT_PUBLIC_`. All memory and blockchain calls run server-side.

### Database

Apply `db/migrations/0001` to `0005` in order with `DATABASE_MIGRATION_URL`. Migration `0003` creates the restricted `memeora_runtime` role; give it a login password outside migrations and use its pooled connection string as `DATABASE_URL`. On Neon, never create the runtime role in the Console: Console roles inherit `BYPASSRLS`. See [`db/README.md`](db/README.md).

---

## 5. Finance API

Wallet sessions are issued after a one-time Sui Mainnet personal-message signature. Every route resolves identity only from the HttpOnly Memeora session and binds it as transaction-local RLS context; `userId` or wallet values in requests are ignored.

| Route | Behavior |
|---|---|
| `GET /api/transactions?type=expense&category=Dining&limit=50` | Lists the authenticated user's transactions. `type` is `income` or `expense`; `limit` is 1–100 (default 50); `period=YYYY-MM` filters by month. |
| `POST /api/transactions` | Creates a transaction with `type`, positive safe-integer `amountMinor`, optional `currency` (`INR` or `USD`), `category`, optional `description`, and optional ISO date string `occurredAt`. |
| `PATCH/DELETE /api/transactions/:id` | Edits or deletes one of your transactions. |
| `GET /api/budgets?period=2026-11` | Returns the selected month's budget and all savings goals (active, then paused, then completed). `period` defaults to the current UTC month. |
| `POST /api/budgets` | Supports `set-budget`, `create-goal`, `update-goal`, `contribute-goal`, `set-goal-status`, and `delete-goal` actions. Amounts are integer minor units. |
| `GET/POST /api/onboarding` | Reads wallet profile status; atomically saves preferred currency, monthly budget, savings goal, and an explicit memory consent choice, or lets the user defer setup. |

| `POST /api/memory/remember` | With consent, submits a memory to Walrus Memory as a background job and returns at once (`202`, status `pending` with its `walrusJobId`). |
| `POST /api/memory/recall` | Lists the wallet's memories. Each call confirms finished Walrus jobs, retries unsent writes under the same idempotency key, and imports memories already in the wallet's namespace. |
| `GET/POST /api/memory/account` | The wallet's own Walrus account: status from Sui via Tatum, then the wallet-signed, gas-sponsored steps that create it and approve Memeora's per-wallet key. Saving is blocked until it is ready. |
| `DELETE /api/memory/:id` | Hides a memory from Memeora and the Assistant's context. The encrypted Walrus blob stays. |
| `GET/POST /api/memory/delete` | Permanent delete on Sui: the owner wallet signs and pays gas for Walrus `delete_blob`. A memory counts as deleted only after Tatum shows Walrus's `BlobDeleted` event for that blob in a successful transaction from that wallet. |
| `POST /api/assistant/chat` | Computes the answer from the ledger with exact integer maths, and recalls relevant memories from Walrus (`memorySource: walrus`, or `local_fallback` if Walrus does not answer). |

Responses use the standard `{ "success": true, "data": … }` envelope. Without `DATABASE_URL`, authenticated routes return `503`; there is no in-memory fallback.

---

## 6. Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `next dev` | Start local development server on `localhost:3000` |
| `npm run build` | `next build` | Build production Next.js bundle |
| `npm run start` | `next start` | Start production server |
| `npm run typecheck` | `tsc --noEmit` | Strict TypeScript verification |
| `npm run lint` | `eslint` | Check linting rules |
| `npm test` | `vitest run` | Run automated test suite |
| `npm run test:watch` | `vitest` | Run tests in interactive watch mode |

---

## 7. Verification & Quality Gates

Before any milestone is declared complete, the following gates must pass:
1. `npm run typecheck` exits with code 0.
2. `npm run lint` exits with code 0.
3. `npm test` exits with code 0.
4. `npm run build` exits with code 0.
5. All progress and integration statuses are truthfully recorded in [memory.md](file:///c:/memora/memory.md).
