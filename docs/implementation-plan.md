# Memeora — Production & Walrus Mainnet Implementation Plan

**Track:** Consumer Finance Apps (Total Recall Hackathon)  
**Objective:** Transform Memeora from a disconnected UI mockup with synthetic integrations into a fully integrated, production-built consumer finance application running on **Walrus Mainnet** with meaningful **Tatum Sui RPC** verification.  
**Governing Documents:** [`prd.md`](../prd.md), [`architecture.md`](../architecture.md), [`rules.md`](../rules.md), [`memory.md`](../memory.md), [`design.md`](../design.md).

> **Plan extension (2026-11-04):** The requested product hardening, wallet-only Sui authentication, provider-neutral PostgreSQL, migration, and consumer feature roadmap is documented in [`product-hardening-and-wallet-plan.md`](product-hardening-and-wallet-plan.md). This file records the earlier implementation history; steps that name Supabase repositories/auth are historical descriptions of the current source implementation and are superseded as target architecture by the new plan. Do not extend the Supabase application integration. Keep its project/data intact as the migration source until import validation and rollback are complete.

---

## Plan Principles & Architectural Constraints

1. **Compiles & Runs After Every Single Step:** Every step leaves the repository in a green state (`npm run typecheck`, `npm run lint`, and `npm test` passing).
2. **Riskiest Unknowns First:** Resolve compiler/build blockers, the official Walrus SDK integration, and Tatum RPC realignment before modifying UI components.
3. **Zero Fabricated APIs:** Replace all hand-rolled fake REST endpoints with official SDKs (`@mysten-incubation/memwal`).
4. **Single Source of Truth:** Connect Dashboard, Transactions, Budgets, and the AI Assistant directly to PostgreSQL (via Supabase repositories), eliminating client-only mock state.
5. **Deterministic Financial Math:** Maintain pure integer minor units (paise) calculation logic with zero LLM arithmetic.

---

## Build Sequence Matrix

| Step | Title | Size | Risk Level | Needs Migration / Dependency | Status |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **01** | Unbreak Next.js Production Build | `[S]` | Blocker | None | ✅ **Completed** |
| **02** | Install Official Walrus SDK & Update Config | `[M]` | High | New Packages (`@mysten-incubation/memwal`, `@mysten/sui`) | ✅ **Completed** |
| **03** | Rewrite Walrus Client with Official SDK & Fallback | `[M]` | High | None | ✅ **Completed** |
| **04** | Realign Tatum Sui RPC to Verify Walrus Memory Anchor | `[M]` | Medium | New Packages (`@grpc/grpc-js`, `@protobuf-ts/grpc-transport`) | ✅ **Completed** |
| **05** | Implement Backend API Routes for Transactions & Budgets | `[M]` | Medium | None | ✅ **Completed** |
| **06** | Wire Frontend Views (Dashboard, Tx, Budgets) to Real APIs | `[L]` | Medium | None | 🟡 Implemented; browser session verification pending credentialed sign-in |
| **07** | Harmonize AI Assistant Calculations with Live Database | `[M]` | Low | None | 🟡 Implemented; live session verification pending credentialed sign-in |
| **08** | Standardize Client Authentication & Session Management | `[M]` | Medium | None | ⏳ Queued |
| **09** | Clean Up Dead Code & Deprecate Unused Simulators | `[S]` | Low | None | ⏳ Queued |
| **10** | Walrus Mainnet 10-Memory Seeder Script & Evidence Log | `[M]` | High | None | ⏳ Queued |
| **11** | Final Production Build, Blog Post & Submission Verification | `[S]` | Low | None | ⏳ Queued |

---

## Detailed Step Specifications

### Step 1: Unbreak Next.js Production Build `[S]` ✅ (Completed)
- **Problem:** `npm run build` failed with `TurbopackInternalError` due to experimental caching flags interacting with Tailwind v4 in Next.js 16.4.2.
- **Files Modified:**
  - `next.config.ts`: Removed experimental `cacheComponents` and `partialPrefetching`.
  - `package.json`: Configured `"build": "next build --webpack"`.
- **Verification:**
  - `npm run build` exit code `0`.
  - `npm run typecheck` exit code `0`.
  - `npm run lint` exit code `0`.
  - `npm test` passed 46/46 unit/integration tests.

---

### Step 2: Install Official Walrus Memory SDK & Update Config `[M]`
- **Objective:** Install the official Mysten Labs Walrus Memory SDK and align server environment variables.
- **Dependencies Required:**
  ```bash
  npm install @mysten-incubation/memwal @mysten/sui
  ```
- **Files Touched:**
  - `package.json`
  - `src/lib/config/env.ts`
  - `.env.example`
- **What Changes:**
  - Add official `@mysten-incubation/memwal` and `@mysten/sui` dependencies.
  - Standardize environment keys in `env.ts` and `.env.example`:
    - `MEMWAL_KEY`: Ed25519 delegate private key.
    - `MEMWAL_ACCOUNT_ID`: Sui object ID for the user's Walrus memory account.
    - `MEMWAL_RELAYER_URL`: `https://relayer.memory.walrus.xyz` (production default).
    - `MEMWAL_NAMESPACE`: `memeora`.
- **Verification Gate:**
  - `npm run typecheck` (verifies SDK typings resolve cleanly in Next.js 16).
  - `npm test` (verifies existing tests remain passing).

---

### Step 3: Rewrite Walrus Client with Official SDK & Resilient Fallback `[M]`
- **Objective:** Replace the fabricated REST client (`POST /v1/namespaces/.../memories`) with the official `MemWal` client.
- **Files Touched:**
  - `src/modules/financial-memory/application/ports/walrus-port.ts`
  - `src/modules/financial-memory/infrastructure/walrus-client.ts`
  - `tests/unit/walrus-client.test.ts`
- **What Changes:**
  - Initialize the official `MemWal` client via `MemWal.create({ key, accountId, serverUrl, namespace })`.
  - Map `writeMemory()` to `memwal.rememberAndWait(text, metadata)` with timeout controls.
  - Map `recallMemories()` to semantic vector search: `memwal.recall({ query, limit })`.
  - Maintain a clean offline/unconfigured fallback returning `pending_retry` when keys are omitted, ensuring CI and tests run without live network dependencies.
- **Verification Gate:**
  - `npm test tests/unit/walrus-client.test.ts`.
  - Verify missing keys return `pending_retry` without unhandled rejections.
  - Verify live/mock results map to typed domain `MemoryRecord` instances.

---

### Step 4: Realign Tatum Sui RPC to Verify Walrus Memory On-Chain Anchor `[M]`
- **Objective:** Connect Tatum Sui RPC to meaningful application state rather than an isolated block height check.
- **Files Touched:**
  - `src/modules/on-chain-verification/application/ports/tatum-rpc-port.ts`
  - `src/modules/on-chain-verification/infrastructure/tatum-sui-client.ts`
  - `src/modules/on-chain-verification/domain/verification-types.ts`
  - `src/app/api/verification/sui-checkpoint/route.ts`
  - `src/app/(app)/verification/page.tsx`
  - `tests/unit/tatum-sui-client.test.ts`
  - `tests/integration/api-routes.test.ts`
  - `package.json` and `package-lock.json`
- **What Changes:**
  - Use Tatum's Sui Mainnet gRPC endpoint `sui-mainnet-grpc.gateway.tatum.io:443`, authenticated via `x-api-key`, with `@mysten/sui` and its gRPC transport.
  - Follow Tatum's current Sui migration guidance: JSON-RPC is deprecated; use `LedgerService/GetServiceInfo` for checkpoint height and `LedgerService/GetObject` for the configured account object.
  - Keep successful results in a module-level 60-second cache and return explicit unconfigured/unavailable states when credentials or the provider are unavailable.
  - Implement two scoped checks: Mainnet checkpoint progression, and whether `MEMWAL_ACCOUNT_ID` resolves to the Walrus Memory `MemWalAccount` Move type. The account-object check does not prove a namespace or memory blob exists.
  - Update `/verification` to show both checks, returned evidence, cache state, and truthful scope disclosures.
- **Verification Gate:**
  - `npm test tests/unit/tatum-sui-client.test.ts`.
  - `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
  - Without production credentials, verify that the API returns `not_configured` rather than fabricated chain data.

---

### Step 5: Implement Backend API Routes for Transactions and Budgets `[M]`
- **Objective:** Create the missing REST route handlers backed by existing Supabase PostgreSQL repositories.
- **Files Touched:**
  - `src/app/api/transactions/route.ts` (NEW)
  - `src/app/api/budgets/route.ts` (NEW)
  - `src/lib/supabase/server.ts`
  - `src/modules/finance/application/ports/repositories.ts`
  - `src/modules/finance/infrastructure/supabase-transaction-repository.ts`
  - `src/modules/finance/infrastructure/supabase-budget-repository.ts`
  - `src/modules/finance/infrastructure/supabase-savings-goal-repository.ts`
  - `tests/integration/api-routes.test.ts`
- **What Changes:**
  - `GET /api/transactions`: Returns user-scoped transactions with category/type filters and limit.
  - `POST /api/transactions`: Validates input, creates a domain `Transaction` in paise, and saves via `SupabaseTransactionRepository`.
  - `GET /api/budgets`: Returns current period budget and active savings goals via `SupabaseBudgetRepository` and `SupabaseSavingsGoalRepository`.
  - `POST /api/budgets`: Sets monthly budget limit or updates goal progress in integer minor units.
- **Verification Gate:**
  - `npm test tests/integration/api-routes.test.ts` verifying authenticated listing/creation, filtering, budget upsert, savings-goal contribution, validation, and user isolation.
  - `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

---

### Step 6: Connect Frontend Views (Dashboard, Transactions, Budgets) to Real APIs `[L]`
- **Objective:** Eliminate disconnected in-memory `useState` arrays and wire all UI actions to backend routes.
- **Files Touched:**
  - `src/app/(app)/dashboard/page.tsx`
  - `src/app/(app)/transactions/page.tsx`
  - `src/app/(app)/budgets/page.tsx`
  - `src/components/layout/add-transaction-modal.tsx`
  - `src/components/layout/header.tsx`
  - `src/lib/finance-api.ts`
- **What Changes:**
  - Replace static mock arrays with authenticated `fetch('/api/transactions')` and `fetch('/api/budgets')` requests on mount.
  - Update `AddTransactionModal` to submit `POST /api/transactions` and trigger parent view re-fetch.
  - Fix default date in `AddTransactionModal` from `'2026-10-20'` to `new Date().toISOString().split('T')[0]`.
  - Wire goal contribution in `budgets/page.tsx` to `POST /api/budgets` goal updates.
  - Handle loading, empty, success, error, and offline states across the ledger screens.
  - Keep dashboard period totals scoped to the latest 100 returned ledger entries, and label this bounded data window. The transaction API does not yet offer pagination or server-side aggregates.
  - Remove create/delete savings-goal controls because the current API supports goal contributions only.
- **Verification Gate:**
  - Entering a transaction in the UI persists across full browser refreshes.
  - Totals on Dashboard reflect actual database transactions.
  - The code paths are implemented and project checks pass. Step 8 now provides the Supabase browser sign-in/session; live browser persistence verification is pending a credentialed sign-in against the connected project.

---

### Step 7: Harmonize AI Assistant Calculations with Live Database Records `[M]`
- **Objective:** Align conversational AI responses with actual ledger records, removing hardcoded fallback figures.
- **Files Touched:**
  - `src/app/api/assistant/chat/route.ts`
  - `src/app/(app)/assistant/page.tsx`
  - `src/app/(app)/dashboard/page.tsx`
  - `src/modules/assistant/application/build-finance-context.ts` (NEW)
  - `src/modules/assistant/application/ports/assistant-port.ts`
  - `src/modules/assistant/application/prompt-policy.ts`
  - `src/modules/assistant/infrastructure/fallback-assistant-client.ts`
  - `src/modules/assistant/infrastructure/gemini-assistant-client.ts`
  - `src/modules/financial-memory/infrastructure/supabase-memory-repository.ts`
  - `tests/unit/assistant-finance-context.test.ts` (NEW)
  - `tests/unit/assistant-prompt-policy.test.ts`
  - `tests/unit/supabase-repositories.test.ts`
  - `tests/integration/api-routes.test.ts`
  - `tests/e2e/learning-loop.test.ts`
- **What Changes:**
  - Removed the hardcoded ₹15,000 budget, ₹8,400 spending, ₹25,000 inflow, and ₹3,000 monthly reserve defaults. The server now loads the user's latest 100 transactions, selected-period budget, and savings goals through a request-scoped Supabase client so RLS sees the authenticated bearer token.
  - Added a pure context builder that filters to the selected UTC month and the budget/ledger currency, then calculates income, expenses, net cash flow, category totals, budget remainder, and goal progress using integer minor units. Dashboard and Assistant cash-flow totals now share the same finance-domain calculation.
  - If no budget exists, the context says so and does not call a purchase affordable. It also states that ledger cash flow is not a bank balance. Cross-currency purchase questions are not converted.
  - Updated both model and deterministic fallback prompts to use calculated category and goal data without doing arithmetic. API/data errors do not generate a fabricated answer; Assistant network errors preserve the question for retry.
  - Memory recall reports used, none found, not consented, or unavailable. Missing consent now defaults to false; consent-read failures surface as unavailable instead of silently enabling memory.
  - Step 8 now provides the sign-in/session setup. Live browser verification remains pending a credentialed sign-in; the shared calculation and API behavior are covered by tests, and no live user prompt was sent to the model in this step.
- **Verification Gate:**
  - `npm test tests/e2e/learning-loop.test.ts` and the full suite pass.
  - Unit tests cover empty accounts, real budget arithmetic, month/currency filtering, category totals, goal progress, and no currency conversion.
  - A real browser prompt using a live account remains to be verified after signing in through the new Step 8 flow. The Assistant does not infer bank balances from ledger data.

---

### Step 8: Standardize Client Authentication & Session Management `[M]`
- **Objective:** Eliminate hardcoded `'x-user-id': 'usr_active_session'` header injection in favor of secure session resolution.
- **Files Touched:**
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/client.ts`
  - `src/app/(app)/layout.tsx`
  - `src/app/api/auth/session/route.ts`
  - `src/app/sign-in/page.tsx`
  - `src/app/auth/callback/page.tsx`
  - `src/components/auth/app-session-guard.tsx`
  - `src/lib/finance-api.ts`
  - `src/app/api/memory/consent/route.ts`
  - `src/app/(app)/memory/page.tsx`
  - Memory API routes (request-scoped RLS clients)
  - `tests/integration/api-routes.test.ts`
- **What Changes:**
  - If Supabase Auth is configured, resolve session exclusively from the verified Bearer JWT (`auth.getUser()`).
  - Added email/password sign-in, account creation and email callback handling, an app session guard, and local sign-out.
  - Removed the hardcoded memory-page user ID headers. `x-user-id` remains accepted only in the test environment; live and development requests require verified Supabase identity.
  - Unconfigured environments show a clear Supabase setup message and cannot create a local/demo session or access in-memory finance fallback records through the UI.
  - Memory routes now create request-scoped Supabase clients for RLS. Added authenticated read/update endpoints for persistent memory consent; the UI reads consent before enabling writes and records changes.
  - Corrected memory status labels so the page does not claim unverified Mainnet storage or fabricate a Walrus reference.
  - Fully satisfy Prime Directive 5: Server-side identity resolution.
- **Verification Gate:**
  - API routes reject unauthenticated requests when live credentials are active.
  - Tests verify unconfigured session status and spoofed header rejection.
  - `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
  - A live browser sign-in against the configured Supabase project is still required to verify a real account session end-to-end.

---

### Step 9: Clean Up Dead Code & Deprecate Unused Simulators `[S]`
- **Objective:** Maintain a lean codebase without unused adapters or obsolete mocks.
- **Files Touched:**
  - `src/modules/financial-memory/infrastructure/simulated-walrus-client.ts` (DELETED)
  - `src/modules/financial-memory/infrastructure/walrus-client.ts`
  - `tests/unit/walrus-client.test.ts`
- **What Changes:**
  - Delete `simulated-walrus-client.ts`.
  - Move mock test fixtures strictly into `tests/fixtures/`.
  - Keep production adapters focused and single-purpose.
- **Verification Gate:**
  - `npm run typecheck` and `npm test` pass with 0 errors.

---

### Step 10: Walrus Mainnet 10-Memory Seeder Script & Evidence Log `[M]`
- **Objective:** Fulfill the Total Recall hackathon requirement of at least 10 verified memories stored on Walrus Mainnet.
- **Files Touched:**
  - `scripts/seed-mainnet-memories.ts` (NEW)
  - `memory.md`
- **What Changes:**
  - Write an automated CLI script that takes `MEMWAL_KEY` and `MEMWAL_ACCOUNT_ID`, stores 10 real consumer financial memories on Walrus Mainnet, and recalls each to confirm indexing.
  - Record the verified Walrus Blob IDs, Sui transaction digests, timestamps, and hashes in `memory.md`.
- **Verification Gate:**
  - Execute `npx tsx scripts/seed-mainnet-memories.ts` with live credentials.
  - `memory.md` evidence log reflects 10 verified Mainnet records.

---

### Step 11: Final Production Build, Blog Post & Submission Verification `[S]`
- **Objective:** Final end-to-end verification and preparation of hackathon deliverables.
- **Files Touched:**
  - `docs/blog-post.md` (NEW)
  - `README.md`
  - `memory.md`
- **What Changes:**
  - Draft the required hackathon blog post explaining Memeora's architecture, Walrus persistent memory layer, Tatum Sui RPC verification, and the learning loop demonstration.
  - Update `README.md` with setup instructions, demo URL, and architecture overview.
  - Complete the final dated entry in `memory.md`.
- **Verification Gate:**
  - `npm run typecheck` (exit code 0).
  - `npm run lint` (exit code 0).
  - `npm test` (all tests passing).
  - `npm run build` (production build succeeds with exit code 0).

