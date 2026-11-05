# Memeora Product Hardening and Sui Wallet Plan

**Date:** 2026-11-04  
**Goal:** Deliver the requested consumer-finance improvements and a real Sui Mainnet wallet sign-in flow for the Walrus + Tatum prototype.  
**Governing documents:** [`AGENTS.md`](../AGENTS.md), [`rules.md`](../rules.md), [`prd.md`](../prd.md), [`architecture.md`](../architecture.md), [`design.md`](../design.md), [`memory.md`](../memory.md).

## Scope and current baseline

This plan covers all twelve requested product improvements plus Sui wallet connect/sign-in. Work must remain a vertical slice, preserve deterministic finance calculations and PostgreSQL RLS, and leave the project green after every implementation slice (`npm run typecheck`, `npm run lint`, `npm test`; run `npm run build` at the milestone gates below). Live provider checks are separate from deterministic test suites and must report the provider's real status. The target is provider-neutral PostgreSQL with a direct Node.js database driver; Supabase is removed from the app.

The savings-goal backend is already present: `POST /api/budgets` supports creating, updating, contributing to, changing status, and deleting a goal, and integration tests cover core actions. The visible gap is the Budgets screen: it has no create/edit form and currently says goal creation is unavailable. Avoid duplicating the existing API.

Other known gaps to address include profile/onboarding creation, memory consent defaulting on in the current schema, no local active/superseded memory version model, a delete adapter that cannot delete Walrus data, monthly totals based on the latest 100 entries, and a Verification page that does not yet prove each memory's chain anchor. The existing Walrus seeder/evidence is useful evidence, but its namespace and ownership model must be reconciled with real wallet accounts before treating it as user-owned memory.

## Product and security invariants

- PostgreSQL remains canonical for transactions, budgets, savings goals, and memory lifecycle state. Walrus is contextual memory only.
- Server-side verified identity is the only source of `user_id`. User IDs in request bodies or query strings never grant access.
- All amounts and finance rules use deterministic server-side integer minor-unit math. LLMs may explain but do not calculate.
- Memory writes require recorded opt-in consent and an explicit user action for suggested lessons. No transaction is written to Walrus automatically.
- If Walrus, Tatum, or the LLM is unavailable, ledger, budget, and goal features continue working and show an honest pending/unavailable state.
- UI tests may mock provider boundaries; the running product must not display fabricated Walrus, Tatum, or financial data as real.
- Do not promise remote deletion, encryption properties, ownership, or expiry behavior beyond what the selected Walrus deployment and official API actually confirm.

## Decision gates before wallet rollout

These are implementation blockers, not reasons to fabricate a bridge or weaken RLS.

1. **Wallet authentication — confirmed (2026-11-04).** Use direct Sui wallet sign-in only. Connect the Sui wallet, verify a single-use SIWS challenge in Memeora, and establish a Memeora-owned session. Do not use Supabase Auth or require email/password. The session supplies a verified wallet identity to each server request.
2. **Walrus ownership/account model — superseded (2026-11-04).** The user chose a separate user-owned `MemWalAccount` per Sui wallet so user-signed remote deletion can be supported. Walrus enforces one account per Sui address; account creation and delegate registration require the wallet owner's on-chain authorization. The app must get explicit user approval for a Memeora delegate key, store that per-user delegate private key only in encrypted server-side secret storage, and disclose that the authorized delegate can access the user's memories until revoked. Never use the current shared operator account or one global delegate for this target. Removing a delegate may take up to 30 seconds to stop authenticating and does not retract plaintext already read.
3. **Memory removal semantics.** Implement immediate local hiding/exclusion first and the confirmed wallet-authorized Security Delete flow for the first usable release. Until a deletion batch returns confirmed success, report that the memory is hidden from Memeora and remote deletion is pending/failed; do not claim it was erased or that it will expire at a particular time.
4. **Sui network — confirmed.** Use Sui Mainnet, as confirmed by the user on 2026-11-04. Keep network identity explicit in signatures, config, and explorer links.
5. **Consent.** Consent should be optional and default off; a user can finish onboarding and use finance features after declining memory storage.
6. **Database boundary — confirmed (2026-11-04).** Remove Supabase entirely and retain PostgreSQL through a provider-neutral direct adapter. The user selected migrating existing data and choosing the eventual host after the local adapter works. Use a least-privilege runtime role, a separate migration role, `FORCE ROW LEVEL SECURITY`, and transaction-local wallet context set only from the verified server session. No process may connect as a table owner or `BYPASSRLS` role for normal requests.
7. **Remote deletion — confirmed for first usable release (2026-11-04).** Implement Walrus Security Delete using the user's wallet for challenge authentication and prepared transaction signing. This requires the user-owned account model above; shared operator-owned memory cannot be represented as user-wallet-deletable.

## Roadmap

### Phase 0 — Resolve provider and identity risks

**Purpose:** Establish real account ownership and authentication boundaries before adding user-visible wallet or proof claims.

**Work:**
- Confirm the direct PostgreSQL adapter can run safe transaction-scoped work with a least-privilege runtime role and force-enabled RLS.
- Define the wallet-address identity schema and direct session verification. A wallet address must never be accepted from a request body as proof of identity.
- Verify the per-wallet `MemWalAccount` owner, delegate scope and encrypted key handling. Require the owner wallet to create/find its account and approve Memeora's delegate key before server-side memory access is enabled. Use a stable wallet-derived namespace only as an organizational field; the account and registered delegate are the access boundary.
- Before cutover, capture legacy ownership claims while the old app can still verify its existing signed-in session: require that session plus a fresh Sui Mainnet signature over a single-use migration challenge bound to the legacy UUID. Export the resulting UUID↔wallet mapping with the data snapshot. If a user cannot complete the claim before cutover, preserve their rows as unassigned and require a separately reviewed recovery proof; never infer ownership from email or financial content.
- Implement the import as a repeatable, checksum/count-verified process: export a consistent source snapshot, map legacy UUID owners through a verified wallet claim, import in dependency order, compare row counts and deterministic checksums, and retain a rollback window with the old project read-only. Do not discard unclaimed legacy rows; quarantine them for later verified claims.
- Use an internal account UUID as the stable row key and a separate wallet-identity mapping table with a unique canonical Sui address. During each request, bind the verified wallet address to a transaction-local PostgreSQL setting; RLS resolves ownership only through that table. This preserves foreign-key structure while making the cryptographically verified wallet the authority for access.
- Validate how the official Walrus blob ID maps to the Sui `Blob` object and transaction data available through Tatum. Use the existing seeded evidence as a starting point, not as a substitute for live lookup.
- Verify the official remote Security Delete endpoints, wallet ownership requirement, challenge/signature flow, sponsored transaction behavior, and terminal statuses. Phase 6 implements the flow; never claim deletion on timeout or pending status.

**Gate:** No wallet-authenticated database access ships until two distinct wallet identities cannot read or mutate each other's PostgreSQL rows under `FORCE ROW LEVEL SECURITY`. No Walrus write/recall ships until the connected wallet owns the account and has explicitly registered Memeora's delegate. Remote deletion reports success only after the Walrus deletion batch reaches a confirmed terminal success state. The user-facing explanation must say that the authorized delegate can access memory contents until the user revokes it, and that revocation does not erase data already read.

**Phase 0 status (2026-11-04):** The user confirmed direct Sui wallet sessions, removing Supabase entirely, provider-neutral PostgreSQL, migrating existing data, user-owned Walrus accounts, and wallet-signed remote deletion in the first usable release. A target PostgreSQL schema and transaction-local RLS helper now exist. The actual migration was applied in ephemeral PGlite PostgreSQL tests using a non-owner `NOBYPASSRLS` runtime role; the production transaction helper exercised real cross-wallet reads and inserts, which were isolated/rejected as expected. The production `pg.Pool` has not connected to an external server, and app repositories/routes have not migrated. The existing Supabase deployment remains source-only and untouched until export/import validation. Choose the hosted PostgreSQL provider after a local adapter works against PostgreSQL. Legacy Supabase UUID rows require a verified wallet mapping.

### Phase 1 — Onboarding and savings-goal experience

**Scope:** Requested items 1 and 2.

**Likely files:** `src/app/(app)/budgets/page.tsx`, profile/onboarding routes and components, PostgreSQL migrations/repositories, `src/app/(app)/layout.tsx` or authenticated routing, relevant API and integration tests.

**Work:**
- Add a first-run onboarding flow for currency, monthly budget, a savings goal, and a plain-language Walrus memory explanation with explicit opt-in/decline.
- Create or upsert the profile row server-side. Add onboarding completion and consent audit fields through an additive migration. Change new-profile consent default to false and ensure migration does not silently opt existing users in.
- Add goal create and edit forms using the existing `/api/budgets` actions. Include validation, loading, save/error states, and the empty state. Remove the stale “creation is not available” message.
- Keep goal amount, progress, currency, status, and date values authoritative in PostgreSQL.

**Acceptance:** A new wallet-only account can complete or defer onboarding, sees a profile row, can decline memory and still use finance features, and can create/edit a goal that remains after reload. API tests prove user scoping and invalid inputs remain rejected.

### Phase 2 — Versioned memory lifecycle and truthful removal

**Scope:** Requested items 3 and 4.

**Likely files:** additive PostgreSQL migration(s), financial-memory domain/ports/repositories, Walrus adapter, goal update path, Assistant context assembly, Memory UI/API, integration tests.

**Work:**
- Introduce a user-owned `memory_items` lifecycle table (or perform a documented safe rename/backfill from `financial_memories`). Include source type/ID, version, Walrus blob/job IDs, namespace, state, created/replaced/hidden timestamps, and sync status. Add foreign keys/constraints and RLS.
- When a goal changes, persist the new canonical goal, mark its previous local memory version superseded, then enqueue/write the replacement. Make failure retryable without reviving the superseded version.
- Filter semantic recall against the current user's active local memory IDs before adding any text to Assistant context. Stale remote results must never override current goal data.
- Make hide/delete update local state first so the Assistant stops using the memory immediately. Offer official remote Security Delete only after the user signs the documented flow; show pending/confirmed/failed outcomes truthfully.
- Show a clear notice that hiding a memory resets Memeora's context, while the Walrus copy may remain if remote deletion has not been confirmed.

**Acceptance:** Goal change leaves one active local rule; an old Walrus recall cannot affect an answer. Hiding excludes it immediately across all Assistant requests. Retry states are visible, and no UI calls local hiding “deleted from Walrus.” RLS tests cover cross-user reads and writes.

### Phase 3 — Accurate totals and explainable Assistant answers

**Scope:** Requested items 5 and 7.

**Likely files:** SQL migration/RPC or paged repository, finance application services, Dashboard/Budgets pages, Assistant API/context builder/page, unit and integration tests.

**Work:**
- Add an RLS-safe server-side monthly aggregate over all matching transactions (or complete cursor paging if that better fits the current schema). Use explicit period boundaries, currency grouping, and integer minor units. Recent activity can stay limited; totals cannot.
- Remove “latest 100” caveats from totals only after the all-record calculation is wired. Do not combine currencies.
- Return a structured explanation payload from the deterministic context builder: selected period, income/expense totals, budget remaining, applicable buffer/rule, and the exact active memories used with recall distance and blob ID.
- Add a “Why this answer” panel that presents those server-computed facts and links to proof when available. If proof lookup is unavailable, show the blob ID and an honest unavailable status rather than a fake link.

**Acceptance:** Tests include more than 100 transactions, boundary dates, mixed currencies, no budget, and buffer rule cases. The displayed explanation matches the deterministic context and exact memories used by the answer.

### Phase 4 — Sui Mainnet wallet connection and wallet-only sign-in

**Scope:** Sui wallet-connect requirement and the Phase 0 identity decision.

**Current official integration direction:** Use current Sui dApp Kit v2 (`@mysten/dapp-kit-react` / `@mysten/dapp-kit-core`, `createDAppKit`, `DAppKitProvider`, Wallet Standard). Do not copy the supplied legacy `@mysten/dapp-kit` 1.x `createNetworkConfig` / `SuiClientProvider` / `WalletProvider` recipe or add React Query unless the current official package docs require it. Standard-compatible Slush, Suiet, and Sui Wallet are discovered through Wallet Standard.

**Likely files:** `package.json`, client provider/root layout, sign-in page, header, wallet challenge/verification/session routes, short-lived nonce and session storage, wallet identity/profile schema and repository, PostgreSQL migrations/RLS policies, tests.

**Work:**
- Connect/disconnect on Sui Mainnet and display the selected address. Sign-in is wallet-only: do not retain email/password authentication or create a second credential-based account path.
- The app creates a short-lived, single-use challenge bound to app origin, wallet address, Sui Mainnet, purpose, issue/expiry time, and random nonce. The connected wallet signs the exact message with `signPersonalMessage`.
- Memeora verifies the signature/address with the official Sui verification API, checks nonce/expiry/domain/network, consumes the nonce once, and rate-limits attempts. It then creates a Memeora-owned session; do not call Supabase Auth or mint a Supabase Auth user.
- Run each authenticated repository operation inside a PostgreSQL transaction; set transaction-local wallet context only from the verified server session. RLS policies compare the current wallet context to the row owner, with a least-privilege role that is neither table owner nor `BYPASSRLS`. Migrate ownership keys/FKs away from `auth.users` and prove two-wallet isolation before allowing wallet sessions to access finance data.
- Resolve the user's own `MemWalAccount` from the verified wallet identity. If none exists, create it only through a wallet-authorized Mainnet flow. Generate a per-account Memeora delegate key and require the owner wallet to register it onchain before enablement. Encrypt the delegate private key at rest, bind it to the verified account ID, and never share a delegate across users. A namespace may be wallet-derived for organization but is not the security boundary. Disclose that the user owns the account while Memeora's authorized delegate can access memories until revoked; explain revocation delay and that it cannot retract data already read.
- Store verified wallet identity against the internal user UUID. Header shows a truncated address and a one-click sign-out; signing out clears the application session. Existing valid app sessions should not unexpectedly require a wallet popup on each page load.
- Never request or handle seed phrases/private keys.

**Acceptance:** Tests cover valid signature, wrong address, tampered message, expired/replayed nonce, unsupported signature, wrong network/origin, session expiry/revocation, and two-wallet data isolation under the chosen database. Browser verification confirms supported wallets connect and sign the challenge; no-wallet browser shows a clear fallback. Live Mainnet sign-in is recorded separately from mocked signature unit tests.

### Phase 5 — Per-memory Walrus proof through Tatum

**Scope:** Requested item 6.

**Likely files:** on-chain verification port/client/domain types, verification API, memory repository metadata, Verification and Assistant views, Tatum tests.

**Work:**
- Persist real Walrus blob ID and namespace on successful writes; resolve and persist the actual Sui Blob object ID and relevant transaction digest from verified chain data. Never derive IDs or digests from a memory string.
- Extend Tatum's Sui gRPC client to fetch/validate the specific object and transaction for each memory. Validate object type, blob ID field, owner, network, and returned digest against known schema before presenting the result.
- Add per-memory proof rows with Walrus blob ID, Sui object, transaction digest, current lookup status/time, and validated SuiScan Mainnet links.
- Explain the proof scope: chain evidence confirms the referenced on-chain storage metadata/lifecycle relation; it does not reveal encrypted memory plaintext or independently prove that a given natural-language statement is true.
- Treat the current seeder's `previous_transaction` as the last transaction that touched the object unless the lookup proves it is the original write transaction.

**Acceptance:** Each displayed proof comes from a live Tatum response or a clearly labeled cached response with timestamp. Missing or pruned data displays unavailable. Tests validate malformed objects, mismatched blob IDs, provider errors, and correct explorer URL construction.

### Phase 6 — Restore and remote deletion controls

**Scope:** Requested item 8 plus the remote side of item 4. Wallet-signed Security Delete is required for the first usable release and depends on user-owned Walrus accounts and an owner-approved Memeora delegate.

**Work:**
- Add a user-triggered “Rebuild memory search index from Walrus” action using official `MemWal.restore(namespace, limit?)`, scoped to the verified account/namespace and consent state.
- Reconcile restored blob IDs against local `memory_items`; restore only eligible active records and never reactivate superseded or locally hidden items automatically.
- Report its actual scope and result count: Walrus restore rebuilds search/vector metadata for the selected namespace; it does not recreate arbitrary Memeora PostgreSQL records.
- Add wallet-authorized Security Delete flow using the documented challenge → prepare → wallet-sign → submit → status flow. Require a dry-run list of exact blob IDs, explicit confirmation, idempotent batch tracking, timeout reconciliation, and clear irreversible-deletion copy. Keep local hide immediate and separate from remote deletion status.

**Acceptance:** Restore is idempotent, bounded by supported SDK limits, and cannot cross namespaces. UI reports partial/provider failures and does not claim a full database backup restore.

### Phase 7 — Suggested lessons, recurring charges, and monthly check-in

**Scope:** Requested items 9, 10, and 11.

**Likely files:** pure finance insight/rule services, API routes, approval UI, check-in persistence/schema, Assistant/memory integration, unit/integration tests.

**Work:**
- Suggested memories: deterministic pattern detection over canonical transactions and complete periods. Present the exact observation and proposed rule for review/edit/approve/reject. Only after approval, explicit memory consent, and user confirmation write the lesson to Walrus.
- Recurring bills/subscriptions: detect candidate merchant/description, cadence, and amount patterns. Ask the user to confirm, dismiss, or edit before classifying a recurring item. Compare confirmed subscriptions with the current cap rule using same-currency minor units.
- Monthly check-in: compute each active rule as met, exceeded, insufficient data, or currency mismatch from canonical monthly aggregates. Store a historical snapshot only under documented retention rules; keep rule evaluation deterministic.

**Acceptance:** Tests cover false positives, changed merchants/amounts, incomplete periods, duplicate proposals, consent off, and multiple currencies. No user-facing lesson, recurring bill, or check-in is invented by an LLM.

### Phase 8 — CSV statement import

**Scope:** Requested item 12.

**Likely files:** import schema/API, parser/validation domain services, transaction repository, import preview/confirmation UI, tests.

**Work:**
- Accept user-selected CSV files only; parse locally or server-side with strict size/row/column limits. Preview column mapping, date, description, amount, type, currency, and validation errors before saving.
- Normalize amounts to integer minor units and dates to an explicit timezone/period interpretation. Add idempotency/deduplication that does not silently discard legitimate repeated transactions.
- Confirm import before an atomic user-scoped batch insert; show inserted, skipped-duplicate, and rejected row counts with downloadable or viewable row errors.
- Do not send raw bank statements to Walrus or the LLM. A separate user-approved summary may be proposed later through the suggested-memory flow.

**Acceptance:** Tests cover malformed rows, decimals/paise, debit/credit sign mapping, timezone boundaries, duplicate rows, oversized files, interrupted imports, and RLS isolation.

### Phase 9 — End-to-end Mainnet demo readiness

**Work:**
- Run full checks and production build after the final slice; keep a dated verification record in `memory.md` with exact command exit codes and counts.
- Verify the full user story with real credentials: wallet-only sign-in → onboarding and explicit memory choice → create/change goal → consented Walrus memory write → Assistant explanation → changed goal supersedes old context → per-memory Tatum proof → restore or hide/delete path.
- Verify at least 10 genuine Walrus Mainnet memories with their actual blob IDs and chain evidence, in the namespace/account model used by the live demo. Existing seed evidence counts only if account ownership, active status, and demo namespace are validated.
- Verify two-wallet PostgreSQL RLS and memory isolation. Record Walrus and Tatum status as `VERIFIED ON MAINNET` only for actions that were actually checked live; distinguish that from unit/integration test status.
- Update demo and submission materials only after the application flow is verified. No provider outage may be presented as successful write/proof.

## Cross-cutting verification gates

For each implementation slice, run the repository-required `npm run typecheck`, `npm run lint`, and `npm test`; include `npm run build` at least at Phases 1, 4, 5, 8, and 9, and after any change affecting routing, bundling, or server/client boundaries. Record exact results in `memory.md`. Add tests for domain rules, route validation, RLS user isolation, and provider response mapping. Real Walrus/Tatum operations require an explicitly credentialed live verification run, with real evidence persisted; CI mocks test only adapter behavior and never substitute for Mainnet evidence.

## Prioritization

**Dependency order:** Because wallet-only accounts are required, implement the direct PostgreSQL/RLS adapter and Phase 4 wallet identity before Phase 1 onboarding. Then proceed Phase 1 → 2 → 3 → 5 → 6 → 7 → 8 → 9. The Supabase data import must be verified before switching the demo environment.

1. **Demo-critical foundation:** Phase 0 decisions, Phase 4 wallet-only identity, Phase 1 onboarding/goal UI, Phase 2 memory versioning/hide behavior, Phase 3 complete totals and “Why this answer,” Phase 5 per-memory proof.
2. **Memory ownership controls:** Phase 6 restore and signed remote deletion decision.
3. **Consumer learning loop:** Phase 7 suggested lessons, recurring charges, monthly check-in.
4. **Activation and scale:** Phase 8 CSV import.
5. **Submission proof:** Phase 9 live end-to-end Mainnet validation.

All requested items remain in scope; this order resolves authentication, authorization, and data correctness before optional learning and import features.

## Verified documentation

- [Sui dApp Kit](https://sdk.mystenlabs.com/dapp-kit) — current v2 packages and deprecation status of legacy `@mysten/dapp-kit`.
- [Sui self-custodial wallets](https://www.docs.sui.io/onchain-finance/asset-custody/wallets/self-custody) — Wallet Standard and current provider setup.
- [Sui intent signing](https://www.docs.sui.io/develop/transactions/transaction-auth/intent-signing) — personal message signing and anti-replay context.
- [Walrus Memory SDK API](https://docs.wal.app/walrus-memory/sdk/api-reference) — `MemWal`, remember/recall, restore, and returned identifiers.
- [Walrus ownership and delegates](https://docs.wal.app/walrus-memory/fundamentals/concepts/ownership-and-access) and [delegate key management](https://docs.wal.app/walrus-memory/contract/delegate-key-management) — owner-authorized delegate registration/revocation and access scope.
- [Walrus blob tracking](https://docs.wal.app/walrus-memory/fundamentals/architecture/tracking-agent-storage) — blob and Sui object relationship and ownership caveats.
- [Walrus memory management](https://docs.wal.app/walrus-memory/guides/manage-your-memory) and [Security Delete API](https://docs.wal.app/walrus-memory/guides/delete-memories-programmatically) — restore and user-authorized deletion flow.
- [Walrus security model](https://docs.wal.app/walrus-memory/fundamentals/architecture/data-flow-security-model) — trust and encryption considerations to verify for the selected deployment.
- [Tatum Sui gRPC](https://docs.tatum.io/oa/reference/sui-grpc) and [Sui migration guide](https://docs.tatum.io/oa/docs/sui-migration-guide-from-json-rpc-to-grpc) — current Sui read path and object/transaction lookup.

## Confirmed decisions and migration rules

1. **Confirmed:** direct Sui wallet sign-in and a Memeora-owned session; do not use Supabase Auth or email/password login.
2. **Confirmed:** include wallet-signed remote Walrus Security Delete in the first usable release. This supersedes the earlier shared operator-owned MemWalAccount choice and requires one owner account per wallet plus an owner-approved, per-account Memeora delegate.
3. Memory consent remains explicit opt-in; finance features remain usable if a wallet user declines.
4. **Confirmed:** remove Supabase Auth and the Supabase database service; use provider-neutral PostgreSQL. Migrate existing data. Choose a hosting provider after the local PostgreSQL adapter works. Keep the source Supabase project/data intact until import validation and rollback window are complete.
5. **Migration ownership rule:** only link old UUID-owned rows to a Sui wallet after the legacy owner completes a verified claim (for example, access to the legacy account plus signing a fresh Sui challenge). Preserve rows without a verified claim in an unassigned migration set; never guess ownership from email or transaction content.

