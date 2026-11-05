# Memeora — Product Requirements Document (PRD)

**Document status:** Initial product specification  
**Version:** 1.0  
**Product:** Memeora  
**Category:** Consumer Finance / Personal Finance Assistant  
**Primary audience:** Product, design, engineering, and AI coding agents  
**Build approach:** Greenfield project; do not copy or modify Clario's codebase

---

## 1. Executive Summary

Memeora is a personal finance assistant that helps people understand their spending, stay within a budget, and make progress toward savings goals. Its defining capability is **persistent, user-controlled financial memory**: with permission, Memeora remembers relevant goals and preferences across sessions and uses them to provide more context-aware guidance over time.

Memeora combines:
- A clear personal-finance dashboard.
- Income, expense, budget, and savings-goal tracking.
- A conversational assistant grounded in the user's actual financial records.
- Walrus Memory for persistent, retrievable user-approved memories.
- Tatum Sui RPC for a meaningful, demonstrable on-chain data integration.
- Transparent explanations, privacy controls, and deterministic financial calculations.

Memeora is being built as a new application from scratch. Existing products may inform product thinking, but no source code, assets, branding, or proprietary implementation should be copied from another repository.

## 2. Product Vision

**Make personal finance feel understandable, personal, and consistent over time.**

Most expense trackers report what happened. Memeora should help users understand what happened, relate it to their own goals, and decide what to do next—without pretending to be a bank, financial adviser, or source of guaranteed outcomes.

### Product promise

> Memeora remembers the financial goals you choose to share, understands your recorded spending, and helps you make better-informed everyday decisions.

### What makes Memeora different

1. **Memory that changes the experience:** relevant saved goals and preferences are retrieved and used in later recommendations.
2. **Advice grounded in records:** budgets, totals, and affordability estimates come from deterministic application logic, not invented AI numbers.
3. **User control:** users can inspect, update, and delete their saved memories.
4. **Verifiable integration:** the application demonstrates actual Walrus Memory operations and meaningful Tatum Sui RPC usage rather than merely displaying integration logos.

## 3. Hackathon Context and Success Requirements

Memeora targets the **Consumer Finance Apps** track of the Total Recall hackathon associated with Tatum and Walrus.

The hackathon information reviewed for this project specifies the following submission requirements:
- Walrus Memory integration with successful writes on Mainnet.
- At least 10 memories stored on Mainnet.
- Tatum RPC used for relevant on-chain data where applicable; the integration must be real and demonstrable.
- A working demo and public source repository.
- A published blog post explaining the product, the Tatum/Walrus integrations, and how memory changes the product over time.

The reviewed judging weights are:
- 30% — Walrus/Tatum integration.
- 30% — technical quality, including successful Tatum Sui RPC integration.
- 20% — creativity.
- 20% — presentation.

**Agent instruction:** These are project-planning inputs, not a substitute for checking the live official rules before submission. Verify the official hackathon page and current documentation before relying on deadlines, endpoints, SDK APIs, network configuration, or final eligibility requirements. Never claim a Mainnet write, on-chain verification, or judging compliance unless it has actually been tested and evidenced.

## 4. Goals and Non-Goals

### 4.1 MVP goals

- Let a user securely access their own personal-finance workspace.
- Let a user record income and expenses.
- Let a user create and update a monthly budget and savings goal.
- Show accurate, explainable totals and budget progress.
- Provide a conversational assistant that uses the user's records and relevant saved memories.
- Store and recall user-approved memories using the official Walrus Memory SDK.
- Show users what Memeora remembers and let them update or delete memories.
- Integrate Tatum Sui RPC for a specific, documented on-chain read or verification flow.
- Provide useful loading, empty, error, and success states.
- Deliver a polished responsive web experience that can be demonstrated live.

### 4.2 Explicit non-goals for the initial MVP

Do not build these unless the MVP is stable and there is a clear reason:
- Direct bank account connections or payment initiation.
- Custody of money, wallets, or private keys.
- Automated investment, trading, lending, tax, or credit decisions.
- Claims that AI advice guarantees savings or financial outcomes.
- A complex multi-user family/business finance suite.
- A custom blockchain or custom memory protocol.
- A token, speculative tokenomics, or unnecessary on-chain transactions.
- Uploading raw sensitive financial data to public, unencrypted blob storage.
- Fake integrations, hard-coded verification claims, fabricated transactions, or simulated Mainnet success presented as real.

## 5. Target Users and Primary Jobs

### Primary user

A person who tracks everyday expenses, has a monthly budget or savings goal, and wants practical guidance without maintaining a complicated spreadsheet.

### Core jobs to be done

- “Help me understand where my money went this month.”
- “Help me see whether I am on track with my savings goal.”
- “Help me estimate whether a planned purchase fits my current budget.”
- “Remember the financial goals and preferences I have explicitly shared.”
- “Let me inspect and control what you remember about me.”

## 6. Core User Journey

1. User opens Memeora and creates an account or signs in.
2. User sees an onboarding flow explaining data use, financial-memory behavior, and privacy controls.
3. User sets a currency, monthly budget, and optional savings goal.
4. User adds income and expenses manually.
5. Dashboard updates from saved records using deterministic calculations.
6. User explicitly asks Memeora to remember a relevant preference or goal, or enables a clearly explained memory suggestion flow.
7. Memeora writes the approved memory through Walrus Memory and confirms success only after the SDK reports completion.
8. User asks a question such as: “Can I afford a ₹1,500 purchase this month?”
9. The server retrieves relevant memories and current financial records. The finance engine calculates the result. The assistant explains the result, assumptions, and trade-offs.
10. User changes a goal. The new value becomes the source of truth in the finance database; the corresponding memory is updated or superseded.
11. User can review, correct, or delete memories and can see the state of the Walrus and Tatum integrations.

### Key demo scenario

- Set a monthly budget of ₹15,000 and a savings goal of ₹3,000.
- Add several realistic expenses.
- Ask whether a ₹1,500 discretionary purchase fits the budget and savings goal.
- Show the retrieved memory and the calculation used to produce the answer.
- Change the savings goal and repeat the question.
- Demonstrate that the answer changes because the current goal/related memory changed—not because the assistant made up a different answer.
- Show evidence of a real Walrus Memory write/recall and a real Tatum Sui RPC response.

Use clearly labelled demo data. Never imply that fictional sample data represents the user's actual bank activity.

## 7. Functional Requirements

Priorities:
- **P0:** Required for a credible MVP.
- **P1:** Important improvement after the core flow works.
- **P2:** Optional extension.

### 7.1 Authentication and user isolation — P0

- Support account creation, sign-in, sign-out, and protected application routes.
- Every finance record and memory mapping must be scoped to the authenticated user.
- Enforce authorization on the server/database; hiding UI elements is not authorization.
- A user must never be able to read or mutate another user's records by changing an ID or request payload.
- Use the chosen auth provider's supported secure session pattern.
- Include appropriate loading, error, and expired-session behavior.

### 7.2 Onboarding and preferences — P0

- Ask for preferred currency; default to INR only when appropriate, and allow the user to change it.
- Let the user set an optional monthly budget and savings target.
- Explain what persistent memory does and request clear consent before storing personal preferences in Walrus Memory.
- Explain that memory may be processed by an external service and show a way to manage it later.
- Never silently persist sensitive financial details as long-term memory.

### 7.3 Dashboard — P0

Display:
- Total income for the selected period.
- Total expenses for the selected period.
- Net cash flow: income minus expenses.
- Budget spent, remaining budget, and percentage used.
- Savings-goal progress, where sufficient data exists.
- Expense breakdown by category.
- Recent transactions.
- A useful empty state for a new account.

Requirements:
- All figures must derive from database records and tested calculation functions.
- Period boundaries and currency formatting must be consistent.
- Do not treat transfers as spending unless product logic explicitly says so.
- Do not display a savings rate or projected balance without defining and implementing its formula.
- Charts must have accessible labels and useful non-chart alternatives.

### 7.4 Transactions and categories — P0

A transaction should support at least:
- Unique ID.
- User ID.
- Type: income or expense.
- Amount in the currency's supported precision.
- Currency.
- Category.
- Date/time.
- Description or merchant label (optional).
- Created/updated timestamps.

Users can:
- Add a transaction.
- View and filter transaction history.
- Edit a transaction.
- Delete a transaction with clear confirmation where appropriate.
- Filter by period, type, and category.

Validation:
- Amount must be positive; transaction type determines its meaning.
- Reject invalid dates, currencies, and unsupported precision.
- Validate all inputs on the server.
- Use database constraints and indexes where appropriate.
- Store amounts as integer minor units where practical, or use a suitable exact decimal type. Avoid floating-point arithmetic for financial totals.

Suggested initial categories can include groceries, dining, transport, housing, utilities, health, shopping, education, entertainment, salary, freelance income, and other. Allow categories to evolve without corrupting historical records.

### 7.5 Budgets and savings goals — P0

- Let users create or update a monthly spending budget.
- Let users create or update a savings goal with an optional target amount and target date.
- Show progress using clearly defined formulas.
- Keep the finance database as the canonical source of truth.
- If a goal changes, update the database first and then synchronise the relevant memory.
- If memory synchronisation fails, do not roll back a valid financial record. Show the sync status and provide a retry mechanism.
- Explain when data is insufficient to calculate progress.

### 7.6 Financial calculation engine — P0

Implement calculations as tested, deterministic server-side functions.

Required calculations:
- Income total for a period.
- Expense total for a period.
- Net cash flow.
- Remaining budget.
- Budget utilisation percentage.
- Savings-goal progress where required inputs exist.
- Optional-purchase scenario: estimated remaining budget and effect on a defined savings plan.

Rules:
- The LLM must not calculate authoritative totals itself.
- Do not double-count transactions.
- Handle date boundaries, edits, deletions, negative net cash flow, and empty periods.
- Explain assumptions, such as whether a proposed purchase is included in the monthly spending budget.
- Do not claim that a purchase is affordable based only on one budget number; distinguish “fits the recorded budget” from “financially advisable.”
- Include unit tests for edge cases and currency precision.

### 7.7 AI finance assistant — P0

The assistant should answer questions about recorded spending, budget progress, goals, and spending scenarios.

For every relevant request:
1. Authenticate the user.
2. Fetch only that user's required finance records.
3. Retrieve relevant approved memories when memory is enabled.
4. Run deterministic calculations in application code.
5. Send a minimal, structured context to the model.
6. Return a concise explanation grounded in the calculated facts.
7. Make uncertainty and missing data explicit.

Assistant behavior:
- Separate verified record-based facts from general suggestions.
- Cite or link to relevant in-app transactions/period summaries where practical.
- Never fabricate transactions, balances, memories, or chain activity.
- Never reveal another user's data, prompts, secrets, or internal credentials.
- Do not present general financial information as guaranteed professional advice.
- Ask a clarifying question when the request cannot be answered safely from available data.
- If the model is unavailable, finance tracking and calculations must continue to work.
- Do not send raw transaction descriptions or sensitive data to an LLM unless required for the user's request and covered by the privacy disclosure.

### 7.8 Walrus Memory integration — P0 / hackathon-critical

Use the current official Walrus Memory documentation and supported SDK. Verify exact API types, return values, job lifecycle, deletion behavior, and Mainnet configuration during implementation.

Required capabilities:
- Health/status check.
- Store an explicitly approved memory.
- Wait for and confirm the memory job's actual completion.
- Recall relevant memories for a user-specific query.
- Show memory state and errors clearly.
- Update or supersede stale information when user preferences change.
- Provide a deletion flow consistent with the SDK's current capabilities.
- Record enough operational metadata to troubleshoot without logging secret keys or full sensitive payloads.

Memory examples:
- “The user’s monthly savings target is ₹3,000.”
- “The user prefers to keep discretionary spending below ₹2,000 per month.”
- “The user is saving for a laptop by March.”

Memory rules:
- Obtain consent before enabling persistent personal memory.
- Use an explicit application namespace, e.g. `memeora`, and the supported per-user/account isolation model.
- Do not rely on namespace alone as an authorization boundary.
- Do not place private keys, passwords, bank credentials, seed phrases, payment-card data, or raw authentication tokens in memory.
- Do not store every transaction as a long-term memory. Store compact, user-approved goals/preferences and genuinely useful derived lessons.
- Include timestamps or versioning in the application's own metadata where useful, so stale memories can be identified.
- Treat recalled memory as contextual information, not as the canonical financial record.
- The finance database wins if a stored memory conflicts with a current goal or transaction record.
- Never claim a write succeeded until the SDK's supported completion check succeeds.
- Never hard-code successful Mainnet writes or fabricate memory counts.
- Never expose a Walrus delegate private key to browser code or commit it to source control. The target uses one owner-authorized delegate per wallet-owned account, encrypted in server-side secret storage; it must not use a shared global delegate.

Operational setup:
- Each user owns one Walrus Memory account for their verified Sui wallet and explicitly authorizes a distinct Memeora delegate onchain.
- Keep each delegate private key in encrypted server-side secret storage, bound to the verified wallet/account. Never use one shared global account/delegate in the target stack. Users can revoke their delegate onchain; disclose the delay and access limits of revocation.
- Use the official Mainnet relayer only for genuine Mainnet submission; use staging/dev only for development and label it clearly.
- Confirm current Mainnet requirements, quotas, fees/credits, and SDK behavior from official docs before deployment.

Potential environment variables (names may be adjusted to match the SDK and hosting setup):
- `MEMWAL_RELAYER_URL`
- `MEMWAL_NAMESPACE`

### 7.9 Tatum Sui RPC integration — P0 / hackathon-critical

Build one small, real, explainable integration rather than a superficial “connected” badge.

Requirements:
- Use the current official Tatum API documentation and a valid API key.
- Call a documented Tatum Sui RPC endpoint from the server.
- Select a concrete use case and document why it matters to Memeora.
- Possible use case: retrieve and display supported on-chain transaction/object information related to the Walrus Memory account or an integration-verification record, but only if the relevant Sui data model and relationship can be verified.
- Do not claim that an arbitrary Sui RPC response cryptographically proves a Walrus Memory payload. Explain precisely what the response establishes.
- Validate response status and schema; use timeouts, bounded retries, and safe error handling.
- Display network, query/action, result summary, timestamp, and a transaction/object identifier or explorer link when available and accurate.
- Keep the Tatum API key server-side.
- Avoid repeated polling that can exhaust rate limits.
- Provide a visible unavailable/error state if the RPC cannot be reached.
- Include an integration test or documented reproducible verification procedure.

Important architecture note: Walrus Memory ownership is Sui-based. Do not assume an EVM wallet address automatically owns a Walrus Memory account. Do not invent a relationship between a memory account and an on-chain object; confirm the current official data model before implementing any verification claim.

Potential environment variable:
- `TATUM_API_KEY`

### 7.10 Optional document vault — P2

Only after the P0 features are stable:
- Allow a user to attach a receipt or document to a transaction.
- Enforce access control and retention/deletion rules.
- Encrypt private content before using any storage path that does not provide the required privacy guarantees.
- Do not upload sensitive documents as public, unencrypted Walrus blobs.
- Clearly distinguish Walrus Memory from ordinary Walrus blob storage.

## 8. UX and Visual Design Requirements

### Design direction

Create a premium, calm, trustworthy consumer-finance interface. It should feel like a real fintech product, not a generic AI chat template or hackathon dashboard.

Desired qualities:
- Clear information hierarchy.
- Restrained color palette and consistent spacing.
- Readable typography and excellent number formatting.
- Purposeful charts, not decorative graphs.
- Consistent buttons, forms, cards, tables, dialogs, and status indicators.
- Useful empty, loading, error, success, and disabled states.
- Subtle motion only where it improves feedback.
- Responsive behavior for desktop, tablet, and mobile.
- Keyboard accessibility, visible focus states, and sufficient contrast.
- Respect reduced-motion preferences.

Avoid:
- Excessive gradients, glowing borders, floating glass cards everywhere, and gratuitous animations.
- Fake balances or misleading charts.
- A chat UI that dominates the whole product.
- Fake blockchain badges, fake transaction hashes, and hard-coded “verified” labels.
- Placeholder buttons that do nothing.

### Suggested navigation

- Overview
- Transactions
- Budgets & Goals
- AI Assistant
- My Memory
- Verification / Integrations
- Settings

Use the simplest navigation structure that works well on small screens.

## 9. Data Model

The implementation may adjust names to match the chosen database, but preserve the relationships and security rules.

### `profiles`
- `id` — same identifier as the authenticated user.
- `display_name` — optional.
- `preferred_currency`.
- `created_at`, `updated_at`.

### `transactions`
- `id`.
- `user_id`.
- `type` — `income` or `expense`.
- `amount_minor` or exact decimal amount.
- `currency`.
- `category_id` or category key.
- `description` — optional.
- `occurred_at`.
- `created_at`, `updated_at`.

### `budgets`
- `id`.
- `user_id`.
- `period` or explicit period start/end.
- `currency`.
- `amount_minor` or exact decimal amount.
- `created_at`, `updated_at`.

### `savings_goals`
- `id`.
- `user_id`.
- `name`.
- `target_amount_minor` or exact decimal amount.
- `current_amount_minor` only if there is a well-defined source of truth.
- `target_date` — optional.
- `status`.
- `created_at`, `updated_at`.

### `memory_preferences`
- `id`.
- `user_id`.
- `memory_enabled`.
- `consent_at`.
- `namespace`.
- `external_account_reference` or other non-secret identifier supported by the integration.
- `sync_status`, `last_synced_at`, and safe error metadata.
- `created_at`, `updated_at`.

Do not store the Walrus delegate private key in a client-readable table.

### `memory_items` (application metadata, not a substitute for Walrus Memory)
- `id`.
- `user_id`.
- `memory_type`.
- `source_entity_id` where relevant.
- `status` — e.g. active, superseded, deletion-pending, deleted.
- `version`.
- `created_at`, `updated_at`.
- Store only metadata needed to manage the memory lifecycle. Avoid duplicating sensitive memory payloads unnecessarily.

### `integration_events`
- `id`.
- `user_id` where applicable.
- `provider` — Walrus Memory or Tatum.
- `operation`.
- `status`.
- `external_reference` where safe.
- `occurred_at`.
- `safe_error_code` — optional.
- Never log secrets or full sensitive payloads.

Use PostgreSQL migrations, indexes, constraints, and row-level security for all user-owned data. Include the relevant migration files in source control. Supabase is not part of the target stack.

## 10. Architecture and Engineering Rules

### Concrete Production Stack

- **Framework:** Next.js 16.4.2 (App Router, Turbopack, React 19).
- **Language:** TypeScript 5.8 (Strict Mode).
- **Styling & Design System:** Tailwind CSS v4, Memeora Clear Current Palette (`#0D47A1` Deep Current, `#2196F3` Bright Current, `#90CAF9` Sky Blue, `#E3F2FD` Cloud Blue), tactile pill geometry, WCAG AA compliance.
- **Database & Authentication:** Provider-neutral PostgreSQL via a direct Node.js driver, with RLS on all user-owned tables; authenticate users by verifying Sui wallet signatures and issue Memeora-owned server sessions. Do not use Supabase.
- **Domain Finance Engine:** Pure TypeScript deterministic financial calculations using integer minor units (paise/cents). No binary floating-point money math.
- **Persistent Sovereign Memory:** Walrus Memory TypeScript SDK (`@mysten/walrus` / HTTP Relayer API on Sui Mainnet, namespace: `memeora`).
- **On-Chain Verification:** Tatum Sui RPC Gateway (`https://api.tatum.io/v3/blockchain/node/sui-mainnet`).
- **AI Assistant:** Server-side LLM Adapter (Gemini 2.5 Flash / Claude 3.5 Sonnet) with minimal structured context injection.
- **Testing:** Vitest 5.0.5 for unit and integration testing.

Use stable, compatible package versions and commit the lockfile. Do not invent SDK methods or copy unverified code snippets into production.

### Modular Monolith Boundaries (Clean Architecture)

Organized as ports-and-adapters in `src/modules/`:
- `src/modules/finance/` — pure domain models (`money.ts`, `calculations.ts`), use case ports, and PostgreSQL repository adapters.
- `src/modules/financial-memory/` — Walrus Memory client adapter, memory sync metadata, remember and recall use cases.
- `src/modules/assistant/` — minimal context assembly, prompt construction policy, and LLM adapter.
- `src/modules/on-chain-verification/` — Tatum Sui RPC client, schema validation, and checkpoint liveness verification.
- `src/lib/config/` — server-only environment validation (`env.ts`).
- `src/components/` — pure UI primitives (`card.tsx`, `button.tsx`, `badge.tsx`, `modal.tsx`, `toast.tsx`) and application shell.
- `src/app/api/` — authenticated Next.js route handlers.

The domain layer MUST NEVER import React, Next.js, PostgreSQL drivers, Supabase, Walrus, Tatum, or LLM SDKs. All external interactions must pass through application ports.

### Engineering requirements

- Enable TypeScript strict mode.
- Validate untrusted input at API boundaries.
- Keep secrets and provider SDKs in server-only modules.
- Apply least privilege to API keys and database policies.
- Use structured, redacted logs.
- Add request timeouts and bounded retries for external services.
- Handle partial failure explicitly; do not make a successful expense save depend on Walrus availability.
- Add idempotency or duplicate protection where retries could create duplicate records or memories.
- Avoid silent exception swallowing.
- Provide a useful error message to users without leaking internal details.
- Keep business logic in testable functions.
- Do not leave placeholder implementations that report success.
- Do not disable linting, types, or security checks just to get a build passing.

## 11. Security, Privacy, and Trust

- Enforce authentication and per-user authorization for every private operation.
- Never expose API keys, private keys, service-role credentials, or server environment variables to the client.
- Do not commit `.env.local` or real credentials.
- Provide `.env.example` with placeholders only.
- Explain what is stored in the database, what is sent to the LLM, and what is stored through Walrus Memory.
- Request explicit consent before enabling persistent memory.
- Give users access to review and manage their memories.
- Use a deletion process consistent with the actual provider APIs; show pending status if deletion is asynchronous.
- Avoid retaining raw prompts or financial data in logs.
- Sanitize descriptions before rendering; prevent XSS.
- Protect write endpoints against unauthorized access and abuse.
- Apply reasonable rate limits to AI and external-provider calls.
- Never ask users for seed phrases, wallet private keys, bank passwords, or payment-card security codes.
- Do not state that the product is audited or fully secure without evidence.

## 12. Error and Degraded-Service Behavior

The app should remain useful if an external service is unavailable.

| Failure | Required behavior |
|---|---|
| PostgreSQL unavailable | Show a clear error; do not show stale values as current without a label. |
| Walrus Memory unavailable | Finance tracking still works; indicate memory is unsynced and offer a safe retry. |
| Recall returns no memories | Answer from available financial records and state that no relevant saved preference was found. |
| Tatum RPC fails | Mark on-chain data temporarily unavailable; do not claim verification succeeded. |
| LLM provider fails | Allow transactions and deterministic calculations to work; show a retryable assistant error. |
| Invalid or stale memory conflicts with current goal | Prefer the database's current value and reconcile the memory. |
| User has no transactions | Show an actionable empty state instead of fabricated activity. |

## 13. Acceptance Criteria

The MVP is not complete until all applicable criteria below pass.

### Product behavior
- [ ] A user can create an account, sign in, and sign out.
- [ ] Protected pages require authentication.
- [ ] A user can create, view, edit, and delete their own transactions.
- [ ] A user can set and update a budget and savings goal.
- [ ] Dashboard totals match database records for tested periods.
- [ ] Empty, loading, error, and success states are implemented.
- [ ] A user can ask a budget question and receive an answer grounded in actual records and deterministic calculations.
- [ ] The assistant never invents transactions or authoritative financial totals.
- [ ] A user can inspect, update, and delete/manage saved memories according to supported provider capabilities.
- [ ] Updating a goal changes subsequent relevant recommendations.

### Walrus Memory
- [ ] The app uses the official SDK and documented configuration.
- [ ] User consent is required before personal persistent memory is enabled.
- [ ] A real memory write completes successfully in the configured environment.
- [ ] A real recall returns relevant memory in the correct user/account scope.
- [ ] Failure states do not pretend a write or recall succeeded.
- [ ] No secret is exposed to the browser or source repository.
- [ ] For hackathon submission, at least 10 real memories are stored on Mainnet and evidence is retained.

### Tatum Sui RPC
- [ ] A documented Tatum Sui RPC request runs from server-side code.
- [ ] The response is validated and shown in a useful product flow.
- [ ] The UI accurately explains what was read or verified.
- [ ] Errors and unavailable states are implemented.
- [ ] A reviewer can reproduce the integration from documentation.
- [ ] No fabricated transaction/object data or verification claims are shown.

### Quality and delivery
- [ ] `lint`, `typecheck`, tests, and production build pass.
- [ ] Critical financial calculation functions have unit tests.
- [ ] Database migrations and access policies are committed.
- [ ] `.env.example` documents required configuration without real secrets.
- [ ] The app works at desktop and mobile widths.
- [ ] The public repository has a clear README and setup instructions.
- [ ] Demo data is clearly labelled.
- [ ] Hackathon submission includes a working demo, public repo, explanatory blog post, and required Mainnet evidence.

## 14. Testing Strategy

### Unit tests
- Money parsing and formatting.
- Period-boundary logic.
- Income/expense totals.
- Remaining budget and budget utilisation.
- Savings-goal progress.
- Purchase-scenario calculations.
- Validation of assistant output against known calculation results.

### Integration tests
- Authenticated database access and user isolation.
- Transaction create/edit/delete.
- Budget and goal updates.
- Walrus Memory client wrapper using a mocked provider in normal CI.
- Tatum RPC client schema validation using fixtures or a mocked provider.
- Error and timeout handling.

### Manual end-to-end test
1. Sign in as a new user.
2. Complete onboarding and grant memory consent.
3. Create a budget and savings goal.
4. Add several transactions.
5. Verify the dashboard against manually calculated expected totals.
6. Save a memory and confirm its completed status.
7. Ask a question requiring both the goal and expense totals.
8. Change the goal and verify that the next answer reflects the new goal.
9. Review and manage the memory.
10. View the Tatum integration and confirm the displayed data matches a real response.
11. Repeat with a second user and confirm no data leaks between accounts.
12. Test external-service failures.

Do not require live Mainnet calls for every CI run. Use mocked integration tests in CI and a separately documented live verification procedure for real Mainnet checks.

## 15. Observability and Demo Evidence

Track safe operational metadata:
- Timestamp and status of memory writes/recalls.
- Provider request outcome and latency.
- Tatum request outcome and network/method.
- Integration error categories.
- AI request outcome without unnecessarily retaining raw financial prompts.
- Finance operation errors.

For the hackathon demo, prepare:
- A clean, reproducible demo account with clearly labelled sample data.
- A memory write and recall that can be shown live.
- A before/after example demonstrating memory changing a recommendation.
- A Tatum Sui RPC response with a clear explanation of its meaning.
- Evidence for 10 or more Mainnet memories.
- A short screen-recording fallback in case live provider services fail.
- A blog post explaining architecture, privacy, learning loop, and verified integrations.

Never expose credentials, private keys, private payloads, or personal user data in screenshots or recordings.

## 16. Implementation Plan

Build in small, testable milestones. Do not try to generate the whole application in one unreviewed change.

### Milestone 0 — Repository and environment
- Create a new Next.js TypeScript project.
- Set up formatting, linting, tests, and environment validation.
- Create `.env.example`.
- Add a README with local setup instructions.
- Verify the app runs locally.

**Exit gate:** clean starter app runs and checks pass.

### Milestone 1 — Design system and application shell
- Implement responsive navigation and page layout.
- Create reusable typography, buttons, cards, forms, tables, dialogs, and status components.
- Add loading, empty, error, and success patterns.
- Implement polished placeholder layouts without fake live data.

**Exit gate:** navigation and responsive UI are usable; no dead buttons.

### Milestone 2 — Authentication and database
- Configure the PostgreSQL host and secure wallet sessions.
- Add schema migrations, indexes, constraints, and row-level security.
- Implement user profiles and protected routes.
- Add server-side validation.

**Exit gate:** authenticated users can access only their own records.

### Milestone 3 — Finance core
- Implement transactions, categories, budgets, and savings goals.
- Implement deterministic money and period calculation functions.
- Connect dashboard to real persisted data.
- Add unit and integration tests.

**Exit gate:** all visible finance totals match test fixtures and persisted records.

### Milestone 4 — Walrus Memory
- Confirm the latest SDK docs and provision a dedicated account/delegate key.
- Implement a server-only client wrapper.
- Implement consent, remember, recall, status, update/supersede, and supported deletion behavior.
- Add a My Memory screen.
- Verify the memory learning loop with real provider calls.

**Exit gate:** actual stored memories can be recalled in the right account scope, and failures are visible.

### Milestone 5 — Tatum Sui RPC
- Confirm the current documented Sui RPC endpoint and response schema.
- Implement a server-side client and one concrete on-chain read.
- Add validation, timeout handling, and a clear verification page/panel.
- Document what the response does and does not prove.

**Exit gate:** a reviewer can reproduce a real Tatum request and understand its relevance.

### Milestone 6 — AI assistant
- Define typed tools/context for budget and expense questions.
- Fetch only necessary user-owned data.
- Retrieve relevant memories.
- Call deterministic finance functions before generating the response.
- Validate model output and add graceful fallback behavior.

**Exit gate:** demo questions produce grounded answers and changing goals demonstrably changes future guidance.

### Milestone 7 — Hardening and submission
- Run lint, typecheck, unit tests, integration tests, and production build.
- Review access control, environment variables, logging, and privacy.
- Fix responsive and accessibility issues.
- Test all external-service failure states.
- Create 10+ actual Walrus Memory Mainnet entries and retain evidence.
- Publish the repository, demo, and explanatory blog post.
- Recheck current official hackathon rules and deadline before submitting.

**Exit gate:** every P0 acceptance criterion is met or any limitation is transparently documented.

## 17. AI Coding Agent Operating Instructions

These instructions apply to any coding agent implementing Memeora from this PRD.

### Before changing code
1. Inspect the current repository structure and existing implementation.
2. Read `package.json`, configuration, current conventions, and available tests.
3. Check current official documentation for external SDKs and APIs.
4. Identify missing environment variables and services without printing secrets.
5. Propose a small plan for the next milestone.

### While implementing
- Implement one milestone or cohesive feature at a time.
- Prefer small, reviewable changes over wholesale rewrites.
- Use strict types and runtime validation.
- Add tests alongside business logic.
- Keep finance calculations separate from model prompts and UI components.
- Keep Walrus and Tatum credentials server-side.
- Do not fabricate provider responses or claim unperformed verification.
- Do not silently add unrelated features or dependencies.
- Follow existing repository conventions unless there is a clear, documented reason to change them.
- Ask before destructive operations, schema resets, or any action that could delete real user data.
- Do not commit secrets or real user financial data.

### After each milestone
1. Run relevant tests, lint, typecheck, and build.
2. Fix regressions before moving on.
3. Summarise files changed, behavior added, checks run, and results.
4. List required manual configuration.
5. State what is genuinely complete versus mocked, unconfigured, or unverified.
6. Do not claim that a live external integration works unless a real request was successfully tested.

### When requirements are ambiguous
- Prefer the simplest secure implementation that meets the PRD.
- Preserve financial correctness and user privacy over visual polish.
- Do not invent SDK APIs, chain schemas, or provider capabilities.
- Ask a focused question only when the ambiguity blocks a safe or meaningful implementation; otherwise document a reasonable assumption and proceed.

## 18. Definition of Done

Memeora is ready for hackathon submission when:
1. The core personal-finance workflow works end to end.
2. Financial totals and purchase scenarios are deterministic and tested.
3. The assistant demonstrably uses relevant persistent memories to change future guidance.
4. Users can inspect and manage memories and understand how their data is used.
5. Walrus Memory Mainnet writes have succeeded, with at least 10 real memories stored and evidence retained.
6. Tatum Sui RPC is used for a real, documented, meaningful on-chain read.
7. Authentication, data isolation, error handling, and secret management have been reviewed.
8. The app has a polished responsive interface and a reproducible live demo.
9. The public repository, README, demo, and explanatory blog post are available.
10. All remaining limitations are explicitly disclosed; no mock is represented as a live integration.

---

## 19. Formal Technical Feature Specification — Walrus Sovereign Financial Memory & Assistant Learning Loop

### 19.1 The Problem & Success Measures

#### The Problem
1. **Amnesiac & Siloed Budgeting:** Consumer budgeting apps forget user goals and personal habits between sessions. Users must constantly re-enter rules, or trust opaque centralized databases that trap private financial data without user sovereignty.
2. **AI Arithmetic Hallucinations:** AI assistants that calculate financial figures probabilistically hallucinate account balances, budget margins, and affordability math, destroying consumer trust.
3. **Unverifiable Integration Claims:** Web3 apps often show superficial marketing badges without demonstrating verifiable on-chain reads or real Mainnet persistence.

#### Success Measures (KPIs)
1. **100% Deterministic Financial Math:** Zero arithmetic computed by LLMs. All money values, category totals, budget utilization, and affordability calculations executed server-side in integer minor units (paise/cents).
2. **10+ Verified Mainnet Memories:** At least 10 persistent financial memories confirmed and written to Walrus Memory Sui Mainnet prior to hackathon submission, retaining real blob references.
3. **Observable Learning Loop:** 100% reproducible change in assistant guidance when a memory is stored, updated, or removed (e.g., saving a ₹3,000 emergency buffer rule visibly modulates affordability advice).
4. **Graceful Degradation:** Core ledger entry, budget viewing, and offline calculations remain 100% functional during Walrus, Tatum, or LLM network outages.
5. **Real On-Chain Verification:** 100% genuine Sui Mainnet checkpoint responses returned via Tatum Sui RPC without fabricated hashes.

---

### 19.2 Target Users & Context (Who Uses It + Why Now)
- **Who Uses It:** Budget-conscious consumers, gig-economy freelancers, and savers who want personal financial rules remembered without sacrificing data privacy or suffering from AI math errors.
- **Why Now:** Total Recall Hackathon (Consumer Finance Apps track). Demands a genuine integration between decentralized sovereign memory (Walrus Memory on Sui Mainnet) and verifiable on-chain RPC reads (Tatum).

---

### 19.3 User Stories with Acceptance Criteria

#### Story 1: Explicit Consent & Memory Ingestion
> **As a** privacy-conscious user,  
> **I want to** explicitly toggle persistent memory consent and store financial rules,  
> **So that** my personal savings targets and budget limits are sovereignly preserved without storing raw bank records.

- **Acceptance Criteria:**
  - Memory consent toggle on `/memory` reflects and updates `profiles.memory_consent_enabled`.
  - When consent is `false`, `/api/memory/remember` rejects new writes with HTTP 403 Forbidden.
  - Stored memories accept categories `'goal'`, `'preference'`, or `'budget'` and minimum 5 characters.
  - Writes are saved in PostgreSQL table `financial_memories` with `walrus_status = 'pending'`, dispatched to Walrus Memory Relayer, and transitioned to `'confirmed'` upon receipt of `walrusBlobId`.
  - UI displays reference identifier pill (e.g., `Ref: local_preview_wlr_03`) and triggers an accessible toast notification.

#### Story 2: Context-Aware Affordability Inquiry (The Learning Loop)
> **As a** consumer managing monthly discretionary spending,  
> **I want to** ask Memeora if a planned purchase fits my budget,  
> **So that** I receive a deterministic calculation grounded in both my ledger and Walrus-stored rules.

- **Acceptance Criteria:**
  - User submits inquiry (e.g., *"Can I afford a ₹1,500 purchase this month?"*).
  - Server verifies Sui wallet challenge signatures and validates Memeora-owned sessions.
  - Server deterministically computes integer minor units: `incomeMinor`, `expenseMinor`, `netCashMinor`, `remainingBudgetMinor`, and post-purchase margin.
  - Server recalls matching Walrus memories for the user's namespace.
  - Server passes calculated numbers + recalled memory rules to the LLM system prompt.
  - LLM response structures a 3-part answer: (1) Mathematical budget capacity, (2) Walrus memory goal protection, and (3) Practical advisability note.
  - UI renders a structured calculation context box (`CheckCircle2` icon, remaining capacity, proposed spend, verdict).

#### Story 3: Memory Inspection, Editing & Deletion
> **As a** user whose financial circumstances change,  
> **I want to** view, filter, copy, and delete my stored memories,  
> **So that** outdated preferences never pollute subsequent assistant advice.

- **Acceptance Criteria:**
  - `/memory` displays all stored context preferences with category filter pills (`All`, `Preferences`, `Goals`, `Budgets`).
  - Clicking "Delete" marks the memory record `walrus_status = 'superseded'` and removes it from active recall.
  - Subsequent assistant queries immediately exclude the deleted memory rule.
  - Deletion triggers an accessible confirmation toast.

#### Story 4: On-Chain Tatum Sui Liveness Verification
> **As an** auditor or judge,  
> **I want to** execute a real on-chain query via Tatum Sui RPC,  
> **So that** I can cryptographically verify network liveness and object state on Sui Mainnet.

- **Acceptance Criteria:**
  - `/verification` provides a method switcher for `sui_getLatestCheckpointSequenceNumber`, `sui_getObject`, and `sui_getTotalTransactionBlocks`.
  - Server executes JSON-RPC 2.0 call to `https://api.tatum.io/v3/blockchain/node/sui-mainnet`.
  - Returns real sequence numbers and timestamps with a copyable JSON payload inspector.
  - UI clearly explains what the query proves (network liveness) and what it does not prove (internal PostgreSQL ledger state).

---

### 19.4 What Belongs in v1 vs. What Doesn't (Scope Matrix)

| Feature / Capability | Belongs in v1 (P0 MVP) | Out of Scope / Non-Goals (v1) | Rationale |
|---|:---:|:---:|---|
| **Explicit Memory Consent** | **YES** | NO | Core privacy non-negotiable (`rules.md` §7) |
| **Walrus Mainnet Memory Writes (10+)** | **YES** | NO | Mandatory hackathon requirement |
| **Deterministic Integer Money Engine** | **YES** | NO | Prevents floating point math & LLM hallucination |
| **Grounded AI Assistant** | **YES** | NO | Demonstrates observable learning loop |
| **Tatum Sui RPC Checkpoint Liveness** | **YES** | NO | Mandatory hackathon RPC verification |
| **Clear Current Tactile Pill UI** | **YES** | NO | Adheres to approved `@design.md` system |
| **Graceful Offline / Degraded Fallbacks** | **YES** | NO | Ensures core finance tracker never crashes |
| *Bank Scraping / Plaid OAuth Sync* | NO | **YES** | Manual ledger entry only in v1 |
| *Raw Transactions Stored on Walrus* | NO | **YES** | Walrus stores high-level rules; DB is canonical |
| *LLM Arithmetic Execution* | NO | **YES** | Arithmetic strictly server-side TypeScript |
| *Custodial Crypto Wallets / Trading* | NO | **YES** | Out of scope for consumer budgeting track |
| *Client-side Secrets Exposure* | NO | **YES** | Zero `NEXT_PUBLIC_` for server API keys |

---

### 19.5 Data Changes & Schema Migrations

All tables enforce PostgreSQL Row-Level Security (RLS) linked to `auth.uid() = user_id`.

```sql
-- 1. Profiles Table with Memory Consent
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  memory_consent_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

-- 2. Transactions Table (Integer Minor Units: Paise)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  category VARCHAR(50) NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
  ON public.transactions(user_id, occurred_at DESC);

-- 3. Budgets Table (Integer Minor Units)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- e.g. '2026-10'
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budgets"
  ON public.budgets FOR ALL
  USING (auth.uid() = user_id);

-- 4. Savings Goals Table (Integer Minor Units)
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  target_amount_minor BIGINT NOT NULL CHECK (target_amount_minor > 0),
  current_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (current_amount_minor >= 0),
  target_date VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own savings goals"
  ON public.savings_goals FOR ALL
  USING (auth.uid() = user_id);

-- 5. Financial Memories Table (Local Cache & Walrus Sync Metadata)
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

CREATE POLICY "Users can manage own financial memories"
  ON public.financial_memories FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_memories_user_status 
  ON public.financial_memories(user_id, walrus_status);
```

---

### 19.6 Edge Cases & Failure States

1. **Walrus Relayer Timeout or 5xx Error:** Local database stores memory with `walrus_status = 'pending_retry'`. Core expense tracking is unaffected. Assistant uses database math and notes: *"Answering from current verified records; memory context temporarily unreachable."*
2. **Conflicting Memory vs. Canonical Ledger:** The PostgreSQL database is strictly authoritative. If a memory states "budget cap is ₹30,000" but the database records ₹35,000, the database figure is used in all arithmetic, and the assistant explicitly highlights the discrepancy.
3. **User Revokes Memory Consent:** `profiles.memory_consent_enabled` is set to `false`. Writes to `/api/memory/remember` return HTTP 403 Forbidden. The assistant completely omits Walrus recall and operates in local-database mode.
4. **Zero Recorded Memories / New Account:** Clean `EmptyState` components render without errors. Assistant greets user with guidance on establishing their first budget cap.
5. **Tatum RPC Rate Limit (HTTP 429):** Cached checkpoint sequence is served with clear timestamp attribution (`"Cached response from HH:MM UTC"`).
6. **LLM Provider Outage (HTTP 500 / 503):** The deterministic math engine calculates the response numbers, and the UI displays a fallback deterministic calculation card directly, bypassing model generation without crashing.
7. **Unauthenticated Session Requests:** All API routes reject requests without a valid server session with HTTP 401 Unauthorized (`{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}`).

---

### 19.7 Questions I Need to Answer

1. **Walrus Mainnet account provisioning:** The user confirmed one owner account per wallet and signed Security Delete. Before enabling memory, the connected wallet must create/find its account and authorize a distinct app delegate; fund and verify each required Mainnet operation through the documented Walrus flow.
2. **LLM Provider Selection:** Does the team prefer Google Gemini 2.5 Flash via `google-genai` or Anthropic Claude 3.5 Sonnet for the server-side assistant adapter? (Both adapters conform to the same `AssistantPort` interface).
3. **Embeddings vs. Tag-Based Memory Retrieval:** For v1 MVP, should memory recall use lightweight category/keyword filtering (`'preference'`, `'goal'`) or an in-memory vector embedding similarity search?
4. **Local Development Fallback:** Do not fake Walrus success. Without a user-owned account, approved delegate, or live relayer, disable memory writes/recall with a clear unavailable state while finance features continue to work.

---

### 19.8 Technical Specifications: Behavior, API Contracts & UI States

#### Behavioral Cases (Given / When / Then Summary)
- Detailed in § 19.3 Stories 1–4 and § 19.6 Cases 1–7.

#### API Specifications & Contracts

##### 1. `POST /api/memory/remember`
- **Request Body:**
  ```json
  {
    "category": "preference",
    "text": "Keep discretionary dining and coffee spend under ₹3,500.00 per month."
  }
  ```
- **Response (HTTP 201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "mem_01ha4b89x...",
      "category": "preference",
      "text": "Keep discretionary dining and coffee spend under ₹3,500.00 per month.",
      "walrusBlobId": "local_preview_wlr_03",
      "status": "confirmed",
      "createdAt": "2026-10-20T06:40:00Z"
    }
  }
  ```
- **Error Codes:** 400 (validation error), 401 (unauthorized), 403 (consent disabled), 503 (sync queued).

##### 2. `POST /api/memory/recall`
- **Request Body:** `{"query": "Can I afford dining out?", "limit": 3}`
- **Response (HTTP 200 OK):** `{"success": true, "data": {"memories": [{"id": "...", "category": "preference", "text": "...", "relevance": 0.94}]}}`

##### 3. `DELETE /api/memory/:id`
- **Response (HTTP 200 OK):** `{"success": true, "data": {"id": "...", "status": "superseded"}}`

##### 4. `POST /api/assistant/chat`
- **Request Body:** `{"prompt": "Can I afford a ₹1,500 purchase this month?"}`
- **Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "I evaluated your October 2026 ledger against your active spending cap...",
      "calculationContext": {
        "remainingBudgetFormatted": "₹6,600.00",
        "proposedPurchaseFormatted": "₹1,500.00",
        "verdict": "Fits budget & preserves ₹3,000.00 monthly savings reserve"
      },
      "recalledMemories": ["User prioritizes saving ₹3,000.00 every month into liquid emergency reserves..."],
      "timestamp": "10:02 AM"
    }
  }
  ```

##### 5. `GET /api/verification/sui-checkpoint`
- **Response (HTTP 200 OK):** `{"success": true, "data": {"network": "sui-mainnet", "sequenceNumber": "68249120", "verified": true, "timestamp": "2026-10-29T16:30:00Z"}}`

#### UI State Matrix

| View / Component | Loading State | Empty State | Error State | Success State |
|---|---|---|---|---|
| **`/dashboard`** | Skeleton cards for KPIs and budget tracks | Zero-transaction prompt to add first income/expense | Inline retry card if DB read fails; cached values labeled | Tabular numerals, active progress fill, live net surplus badge |
| **`/transactions`** | Skeleton list items with pulsing placeholders | `EmptyState` component with "Reset filters" action button | Toast error on malformed input; form data preserved | Toast notification on record addition; instantaneous ledger update |
| **`/budgets`** | Shimmer progress bars and card skeletons | Zero-goal empty state with "Create Goal" pill trigger | Validation errors under input field with red outline | Updated utilization percentage, milestone progress animation |
| **`/assistant`** | Bouncing dot bot avatar with "Calculating deterministic scenario..." | Welcome greeting explaining deterministic calculation engine | Fallback deterministic math card with manual retry button | Multi-turn speech bubbles, structured calculation context box, copy button |
| **`/memory`** | Skeleton memory cards with animated pulse | "No stored memories found" card with "Store New Memory" trigger | Amber warning card when consent paused or write fails | Confirmed badge with Walrus object reference tag and delete button |
| **`/verification`** | Spinner in "Run Preview Probe" button (`isLoading`) | N/A (Static inspection payload defaults available) | Red warning card showing Tatum 429/timeout with retry | Monospace JSON payload inspector with live checkpoint sequence number |

---

### 19.9 Line-by-Line Acceptance Verification Checklist

- [ ] **1. Clean Architecture:** Domain logic in `src/modules/finance/domain/` has zero external dependencies (no React, Next.js, PostgreSQL driver, Supabase, Walrus, or LLM imports).
- [ ] **2. Integer Arithmetic:** All money totals and affordability values are represented as integer paise (minor units) throughout the database and engine.
- [ ] **3. Strict Server Secrets:** `DATABASE_URL`, migration credentials, the wallet-session signing key, `MEMWAL_KEY`, `TATUM_API_KEY`, and `LLM_API_KEY` remain server-only and have no `NEXT_PUBLIC_` prefix.
- [ ] **4. User Authorization:** A server-verified Sui wallet session is the sole identity source for all `/api/memory/*`, `/api/transactions/*`, and `/api/assistant/*` routes; PostgreSQL RLS enforces the transaction-scoped wallet identity.
- [ ] **5. Memory Consent Enforcement:** When `memory_consent_enabled` is false, `/api/memory/remember` returns HTTP 403, and `/api/assistant/chat` omits Walrus context.
- [ ] **6. Walrus Mainnet Integration:** Walrus Memory client successfully writes user preferences under namespace `memeora` with confirmed job status.
- [ ] **7. Verified Memory Count:** At least 10 genuine persistent memories are stored on Sui Mainnet before final submission, with recorded blob references.
- [ ] **8. Observable Learning Loop:** Adding a ₹3,000 savings memory observably alters the assistant's answer to *"Can I afford a ₹1,500 purchase?"* from unconstrained to reserve-aware.
- [ ] **9. Memory Superseding:** Editing or deleting a goal in the database correctly updates the corresponding memory status without leaving orphan context.
- [ ] **10. Truthful Status:** The UI never displays "Mainnet Verified" or "Stored" unless the underlying SDK call has succeeded. Unconnected states are clearly marked as sample/preview.
- [ ] **11. Tatum Sui RPC Client:** Server makes a real JSON-RPC call to `https://api.tatum.io/v3/blockchain/node/sui-mainnet` verifying `sui_getLatestCheckpointSequenceNumber`.
- [ ] **12. Transparent Verification:** The `/verification` screen explains that Tatum verifies network liveness and object state, not internal PostgreSQL transactions.
- [ ] **13. Graceful Degradation:** Core ledger entry, budget viewing, and local calculations remain functional during Walrus, Tatum, or LLM outages.
- [ ] **14. Clear Current Design:** UI adheres to Clear Current palette (Deep Current `#0D47A1`, Bright Current `#2196F3`, Sky Blue `#90CAF9`, Cloud Blue `#E3F2FD`) and tactile pill geometry.
- [ ] **15. Responsive Layout:** Navigation, cards, and modal dialogs function seamlessly on desktop (1440px), tablet (768px), and mobile (375px).
- [ ] **16. Touch Targets:** All interactive controls on mobile meet or exceed `48x48px` minimum touch target guidelines.
- [ ] **17. Accessibility (WCAG 2.2):** Skip link is functional; all inputs have associated labels; progress bars have `role="progressbar"`; screen-reader announcements use `aria-live="polite"`.
- [ ] **18. Reduced Motion:** All animations respect `prefers-reduced-motion` settings.
- [ ] **19. Unit Test Coverage:** Comprehensive unit tests for `money.ts`, `calculations.ts`, and memory sync adapters pass with 100% exit code 0.
- [ ] **20. Lint & Typecheck Clean:** `npm run typecheck` and `npm run lint` report 0 errors and 0 warnings.
- [ ] **21. Production Build:** `npm run build` succeeds cleanly with Turbopack generating all static and dynamic routes.
- [ ] **22. Updated Project Memory:** `memory.md` is updated with truthful status entries, exact command outputs, and verified milestones.

---

## Official References

Agents must re-check these links before implementation because SDK APIs and hackathon requirements can change.

- Hackathon overview and submission requirements: https://tatum.io/hackathon/total-recall
- Walrus Memory documentation: https://docs.wal.app/walrus-memory
- Walrus Memory quick start: https://docs.wal.app/walrus-memory/getting-started/quick-start
- Walrus Memory agent/runtime guide: https://docs.wal.app/walrus-memory/guides/agent-runtimes
- Walrus storage documentation: https://docs.wal.app/
- Tatum documentation: https://docs.tatum.io/
- Tatum getting started/API keys: https://docs.tatum.io/docs/getting-started
- Next.js documentation: https://nextjs.org/docs

**Final instruction:** Treat this PRD as the product source of truth. If a requested implementation conflicts with privacy, financial correctness, real integration requirements, or user isolation, do not implement the unsafe shortcut; explain the conflict and propose a compliant alternative.
