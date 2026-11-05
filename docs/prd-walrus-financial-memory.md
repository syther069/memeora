# PRD: Walrus Sovereign Financial Memory & Assistant Learning Loop

**Document Status:** Feature Specification & PRD  
**Target File:** `docs/prd-walrus-financial-memory.md`  
**Feature:** Sovereign Persistent Memory & Context-Aware Assistant Learning Loop  
**Users:** Budget-conscious consumers, gig workers, and savers tracking personal finance without AI math errors  
**Tech Stack:** Next.js 16 (App Router), TypeScript 5.8 (Strict), Supabase (PostgreSQL with RLS), Walrus Memory SDK (`@mysten/walrus`), Tatum Sui RPC Gateway, Tailwind CSS v4  

---

## 1. Problem & Success Measures

### The Problem
1. **Amnesiac Assistants:** Budgeting apps forget user preferences (e.g., "save ₹3,000 for emergency buffer") across sessions, forcing repetitive manual inputs.
2. **AI Arithmetic Hallucinations:** LLMs calculating balances and budget margins invent numbers, destroying trust in financial guidance.
3. **Unverifiable Web3 Claims:** Projects display superficial badges without demonstrable on-chain Sui RPC verification or verifiable Mainnet persistence.

### Success Measures (KPIs)
- **100% Deterministic Financial Math:** Zero arithmetic computed by the LLM. Integer minor units (paise) calculated server-side.
- **10+ Verified Mainnet Memories:** $\ge 10$ confirmed financial memories written to Walrus Memory Sui Mainnet under namespace `memeora`.
- **Observable Learning Loop:** 100% reproducible advice modulation when a memory is stored, updated, or deleted.
- **Graceful Degradation:** Core ledger entry, budget calculations, and offline viewing operate normally if Walrus, Tatum, or LLM are unreachable.
- **Real On-Chain Verification:** Valid Sui Mainnet sequence numbers retrieved via Tatum Sui RPC without fabricated data.

---

## 2. User Stories & Acceptance Criteria

### Story 1: Explicit Consent & Memory Ingestion (P0)
- **As a** privacy-conscious user, **I want to** explicitly toggle persistent memory consent and store financial rules, **so that** my savings targets and budget limits are sovereignly preserved without storing raw bank records.
- **Acceptance Criteria:**
  - Memory toggle updates `profiles.memory_consent_enabled`.
  - When consent is `false`, `POST /api/memory/remember` returns HTTP 403 Forbidden.
  - Stored memories accept categories `'goal'`, `'preference'`, or `'budget'` ($\ge 5$ characters).
  - Memory is stored locally with status `'pending'`, dispatched to Walrus, and marked `'confirmed'` with `walrusBlobId`.
  - UI displays reference identifier pill (e.g., `Ref: local_preview_wlr_03`) and an accessible toast.

### Story 2: Context-Aware Affordability Inquiry (P0)
- **As a** consumer managing monthly discretionary spending, **I want to** ask Memeora if a planned purchase fits my budget, **so that** I receive a deterministic calculation grounded in both my ledger and Walrus-stored rules.
- **Acceptance Criteria:**
  - Server verifies identity via `supabase.auth.getUser()`.
  - Server deterministically computes integer paise: `incomeMinor`, `expenseMinor`, `remainingBudgetMinor`, and post-purchase margin.
  - Server recalls active user memories from Walrus namespace `memeora`.
  - Server passes calculated numbers + recalled memory rules to the LLM system prompt.
  - LLM returns a 3-part structured answer: (1) Mathematical budget capacity, (2) Walrus memory goal protection, and (3) Practical advisability note.
  - UI renders a structured calculation context box (`CheckCircle2` icon, remaining capacity, proposed spend, verdict).

### Story 3: Memory Inspection, Deletion & Superseding (P0)
- **As a** user whose financial circumstances change, **I want to** view, filter, and delete my stored memories, **so that** outdated preferences never pollute subsequent assistant advice.
- **Acceptance Criteria:**
  - `/memory` displays all stored context preferences with category filter pills (`All`, `Preferences`, `Goals`, `Budgets`).
  - Clicking "Delete" marks the memory record `walrus_status = 'superseded'` and removes it from active recall.
  - Subsequent assistant queries immediately exclude the deleted memory rule.

### Story 4: On-Chain Tatum Sui Liveness Verification (P0)
- **As an** auditor or judge, **I want to** execute a real on-chain query via Tatum Sui RPC, **so that** I can cryptographically verify network liveness and object state on Sui Mainnet.
- **Acceptance Criteria:**
  - `/verification` executes JSON-RPC 2.0 to `https://api.tatum.io/v3/blockchain/node/sui-mainnet`.
  - Supports `sui_getLatestCheckpointSequenceNumber`, `sui_getObject`, and `sui_getTotalTransactionBlocks`.
  - Returns real sequence numbers and timestamps with a copyable JSON payload inspector.

---

## 3. What Belongs in v1 vs. What Doesn't

| Capability | In v1 MVP | Out of Scope (v1) | Rationale |
|---|:---:|:---:|---|
| **Explicit Memory Consent Toggle** | **YES** | NO | Core privacy non-negotiable |
| **Walrus Mainnet Memory Writes ($\ge 10$)** | **YES** | NO | Mandatory hackathon requirement |
| **Deterministic Integer Money Engine** | **YES** | NO | Eliminates floating point errors & hallucinated math |
| **Grounded AI Assistant** | **YES** | NO | Demonstrates observable learning loop |
| **Tatum Sui RPC Checkpoint Liveness** | **YES** | NO | Mandatory hackathon RPC verification |
| **Clear Current Tactile Pill UI** | **YES** | NO | Adheres to approved `@design.md` system |
| **Graceful Offline / Degraded Fallbacks** | **YES** | NO | Core finance tracker never crashes |
| *Bank Scraping / Plaid OAuth Sync* | NO | **YES** | Manual ledger entry only in v1 |
| *Raw Transactions Stored on Walrus* | NO | **YES** | Walrus stores high-level rules; DB is canonical |
| *LLM Arithmetic Execution* | NO | **YES** | Arithmetic strictly server-side TypeScript |
| *Custodial Crypto Wallets / Trading* | NO | **YES** | Out of scope for consumer budgeting track |
| *Client-side Secrets Exposure* | NO | **YES** | Zero `NEXT_PUBLIC_` for server API keys |

---

## 4. Data Changes & Schema Migrations

All tables enforce PostgreSQL Row-Level Security (RLS) linked to `auth.uid() = user_id`.

```sql
-- 1. Profiles (Consent)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  memory_consent_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

-- 2. Financial Memories (Walrus Sync Metadata & Local Cache)
CREATE TABLE IF NOT EXISTS public.financial_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('goal', 'preference', 'budget')),
  memory_text TEXT NOT NULL CHECK (length(memory_text) >= 5),
  walrus_blob_id VARCHAR(255),
  walrus_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (walrus_status IN ('pending', 'confirmed', 'failed', 'superseded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.financial_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memories" ON public.financial_memories FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_status ON public.financial_memories(user_id, walrus_status);
```

---

## 5. Edge Cases & Failure States

1. **Walrus Relayer Timeout or 5xx Error:** Memory stored locally with `walrus_status = 'pending_retry'`. Core expense tracking unaffected. Assistant falls back to canonical database records.
2. **Conflicting Memory vs. Canonical Ledger:** PostgreSQL database is strictly authoritative. If memory contradicts DB, DB values win and assistant explains discrepancy.
3. **User Revokes Memory Consent:** `profiles.memory_consent_enabled` set to `false`. Writes return HTTP 403 Forbidden. Assistant omits Walrus recall.
4. **Zero Recorded Memories:** Clean `EmptyState` rendered. Assistant provides default guidance without crashing.
5. **Tatum RPC Rate Limit (HTTP 429):** Cached checkpoint sequence served with clear timestamp attribution (`"Cached from HH:MM UTC"`).
6. **LLM Provider Outage (HTTP 500 / 503):** Deterministic math engine calculates figures and displays fallback calculation card directly in UI.
7. **Unauthenticated Request:** All API routes reject unauthorized calls with HTTP 401 Unauthorized.

---

## 6. Questions I Need to Answer

1. **Walrus Mainnet Delegate Key Provisioning:** Is the production Walrus delegate key (`MEMWAL_KEY`) funded with SUI/WAL tokens for the 10+ Mainnet writes, or should integration tests start on the Walrus staging relayer?
2. **LLM Provider Selection:** Does the team prefer Google Gemini 2.5 Flash via `google-genai` or Anthropic Claude 3.5 Sonnet for the server-side assistant adapter? (Both conform to `AssistantPort`).
3. **Embeddings vs. Tag-Based Memory Retrieval:** For v1 MVP, should memory recall use lightweight category/keyword filtering (`'preference'`, `'goal'`) or in-memory vector embedding similarity search?
4. **Local Development Fallback:** Should local development without live `MEMWAL_KEY` use an in-memory Walrus adapter returning deterministic blob IDs (`local_preview_wlr_*`), or block write operations until credentials are supplied?

