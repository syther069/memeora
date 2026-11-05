# Memeora — Software Architecture

**Status:** Target architecture; provider-neutral PostgreSQL and direct Sui wallet authentication supersede the original Supabase baseline  
**Version:** 1.1  
**Audience:** AI coding agents, engineers, reviewers  
**Related source of truth:** `prd.md`  
**Architecture style:** Modular monolith + Clean Architecture + Hexagonal Architecture + pragmatic Domain-Driven Design (DDD)

---

## 1. Purpose

This document defines how Memeora should be structured so that product behavior remains testable, secure, understandable, and easy to evolve.

Memeora is a consumer-finance web application. It needs a reliable financial domain, authenticated user data, an AI assistant, persistent memory through Walrus Memory, and a meaningful Tatum Sui RPC integration.

The architecture must prevent:
- Financial calculations being hidden inside React components or LLM prompts.
- Database models leaking into business rules.
- Vendor SDKs spreading across the codebase.
- External-service failures breaking core expense tracking.
- Client-side code accessing provider secrets.
- AI-generated claims being treated as authoritative financial data.
- A premature microservices architecture that adds operational complexity to a hackathon MVP.

**Architecture decision:** Start with one deployable Next.js application organized as a modular monolith. Use explicit module boundaries and ports/adapters. Split services only if measured needs justify it.

## 2. Architecture Principles

1. **Dependencies point inward.** Domain logic does not import Next.js, PostgreSQL drivers, Walrus SDKs, Tatum SDKs, or an LLM provider.
2. **The database is the financial source of truth.** Persistent memory is contextual, not authoritative accounting data.
3. **Money arithmetic is deterministic.** Use integer minor units or a suitable exact decimal representation; never use JavaScript floating-point arithmetic for authoritative money calculations.
4. **External providers are adapters.** Hide PostgreSQL, Walrus, Tatum, and model APIs behind narrow interfaces.
5. **User authorization is enforced server-side.** Every read and mutation is scoped to the authenticated user.
6. **Core functionality degrades gracefully.** A Walrus, Tatum, or LLM outage must not prevent a user from recording an expense.
7. **No fake success.** A UI status may say “verified” or “stored” only after the relevant operation has actually succeeded.
8. **Test business rules without network access.** Use in-memory repositories and fake provider adapters in unit tests.
9. **One domain, one ubiquitous language.** Use consistent terms such as `Transaction`, `Budget`, `SavingsGoal`, `FinancialMemory`, `RememberMemory`, and `RecallMemory`.
10. **Prefer simple boundaries over abstractions without purpose.** Add a port when it isolates business logic from a volatile or external dependency, or creates a meaningful test seam.

## 3. High-Level System Context

```text
                         ┌────────────────────────────┐
                         │        User / Browser      │
                         └──────────────┬─────────────┘
                                        │ HTTPS
                         ┌──────────────▼─────────────┐
                         │       Next.js Web App      │
                         │ Pages, React UI, Forms     │
                         └──────────────┬─────────────┘
                                        │ Server actions /
                                        │ route handlers
                         ┌──────────────▼─────────────┐
                         │ Application Use Cases      │
                         │ AuthZ, orchestration, DTOs  │
                         └───────┬────────┬───────────┘
                                 │        │
                    ┌────────────┘        └───────────────┐
                    │                                     │
          ┌─────────▼──────────┐               ┌──────────▼─────────┐
          │ Finance Domain     │               │ Assistant Domain   │
          │ Money, budgets,    │               │ Context assembly,  │
          │ transactions,      │               │ memory-aware flow  │
          │ scenarios          │               │ and output policy  │
          └─────────┬──────────┘               └──────┬─────────────┘
                    │                                  │ ports
                    │ ports                            │
       ┌────────────┼──────────────────────────────────┼────────────┐
       │            │                                  │            │
┌──────▼──────┐ ┌───▼─────────────┐ ┌─────────────────▼─┐ ┌────────▼──────┐
│ PostgreSQL  │ │ Walrus Memory   │ │ Tatum Sui RPC     │ │ LLM Provider  │
│ adapter +   │ │ adapter         │ │ adapter           │ │ adapter       │
│ Memeora auth│ │ remember/recall │ │ documented reads  │ │ response text │
└─────────────┘ └─────────────────┘ └───────────────────┘ └───────────────┘
```

This diagram is conceptual. The browser must never call a privileged provider adapter directly.

## 4. Architecture Style and Layer Responsibilities

### 4.1 Domain layer — core business rules

Contains pure business models and calculations.

Responsibilities:
- Represent money and currency.
- Represent transactions, budgets, and savings goals.
- Enforce invariants.
- Calculate totals, budget utilization, savings progress, and purchase scenarios.
- Define domain errors and relevant domain events.

Must not:
- Import React, Next.js, PostgreSQL drivers, Walrus, Tatum, or an LLM SDK.
- Read environment variables.
- Perform HTTP, database, filesystem, or blockchain calls.
- Generate natural-language financial advice.

### 4.2 Application layer — use cases

Coordinates a complete user action using domain objects and ports.

Example use cases:
- `CreateTransaction`
- `UpdateTransaction`
- `DeleteTransaction`
- `GetDashboardSummary`
- `SetMonthlyBudget`
- `UpdateSavingsGoal`
- `AnswerFinanceQuestion`
- `RememberFinancialPreference`
- `RecallFinancialContext`
- `GetOnChainVerificationStatus`
- `DeleteFinancialMemory` (only to the extent supported by the current provider)

Responsibilities:
- Accept validated request DTOs.
- Apply authenticated-user authorization.
- Load and save domain state through repository ports.
- Invoke domain calculations.
- Orchestrate external ports.
- Return typed results that the UI can safely present.

Must not:
- Depend on concrete PostgreSQL clients or provider SDKs.
- Accept user IDs from untrusted request bodies as proof of identity.
- Mix presentation formatting with domain logic.

### 4.3 Ports — interfaces owned by the application/domain

Ports define capabilities needed by the inner layers.

Examples:
- `TransactionRepository`
- `BudgetRepository`
- `SavingsGoalRepository`
- `FinancialMemoryPort`
- `OnChainDataPort`
- `FinanceAssistantPort`
- `Clock` (only if deterministic time testing needs it)

Use TypeScript interfaces or small abstract contracts. Keep interfaces narrow and aligned with a use case. Do not create a generic “service manager” interface that exposes every provider operation.

### 4.4 Adapters and infrastructure — outer layer

Contains concrete technology details:
- Provider-neutral PostgreSQL repository adapters.
- Sui wallet challenge verification and Memeora-owned session integration.
- Walrus Memory SDK adapter.
- Tatum RPC HTTP/client adapter.
- LLM provider adapter.
- Environment/configuration parsing.
- Logging, rate limiting, and external-call timeouts.

Adapters translate provider responses into application-owned types. Provider-specific objects must not leak into domain entities or client component props.

### 4.5 Presentation layer

Contains:
- Next.js routes and layouts.
- React components.
- Forms and client-side interactions.
- Server actions or route handlers.
- View models and UI formatting.

Controllers/route handlers should do only three things:
1. Parse and validate input.
2. Resolve the authenticated identity and call a use case.
3. Map the result to a safe HTTP response or UI state.

Do not put business rules inside a route handler or a large React component.

## 5. Recommended Project Structure

Use this structure as a target, not a reason to create empty files in advance. Create modules when implementing the corresponding milestone.

```text
memeora/
├── public/
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   │   └── page.tsx
│   │   ├── (auth)/
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (app)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   ├── budgets/
│   │   │   ├── assistant/
│   │   │   ├── memory/
│   │   │   ├── verification/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── assistant/route.ts
│   │       ├── integrations/walrus/route.ts
│   │       └── integrations/tatum/route.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── assistant/
│   │   └── memory/
│   ├── modules/
│   │   ├── finance/
│   │   │   ├── domain/
│   │   │   │   ├── money.ts
│   │   │   │   ├── transaction.ts
│   │   │   │   ├── budget.ts
│   │   │   │   ├── savings-goal.ts
│   │   │   │   └── finance-errors.ts
│   │   │   ├── application/
│   │   │   │   ├── ports/
│   │   │   │   ├── use-cases/
│   │   │   │   └── dto/
│   │   │   ├── infrastructure/
│   │   │   │   └── postgres/
│   │   │   └── presentation/
│   │   ├── financial-memory/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   │   ├── ports/
│   │   │   │   └── use-cases/
│   │   │   └── infrastructure/
│   │   │       └── walrus/
│   │   ├── assistant/
│   │   │   ├── application/
│   │   │   ├── domain/
│   │   │   └── infrastructure/
│   │   │       └── llm/
│   │   └── on-chain-verification/
│   │       ├── application/
│   │       └── infrastructure/
│   │           └── tatum/
│   ├── shared/
│   │   ├── validation/
│   │   ├── errors/
│   │   └── result.ts
│   └── lib/
│       ├── config/
│       ├── postgres/
│       └── server/
├── db/
│   ├── migrations/
│   └── seed.sql
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### Structure rules

- `modules/*/domain` must remain framework- and provider-independent.
- `modules/*/application` may import that module's domain and its ports; it must not import infrastructure implementations.
- `modules/*/infrastructure` implements application ports and may import provider SDKs.
- `app/`, `components/`, and presentation modules may call application entry points, but must not implement finance rules.
- Composition/wiring happens at the outer edge, such as server-only factories or route handlers.
- Avoid barrel files that accidentally create circular imports.
- Keep server-only modules out of client component dependency graphs.
- Do not create a separate deployable service for each module in the MVP.

## 6. Dependency Rules

Allowed dependency direction:

```text
Presentation → Application → Domain
Infrastructure → Application ports / Domain types
Composition root → Application + concrete Infrastructure
```

Forbidden dependency direction:

```text
Domain → Next.js / PostgreSQL driver / Walrus / Tatum / LLM
Application → Concrete PostgreSQL repository
Application → Walrus SDK implementation
Finance domain → Assistant domain
UI component → Direct privileged provider SDK
```

The domain layer owns its concepts. Infrastructure adapts external concepts to those concepts.

Example: `Money` belongs to the finance domain. PostgreSQL may store an amount in minor units, but that storage representation should be mapped into a `Money` value object. The finance domain should not import a database row type.

## 7. Bounded Contexts

Use four small bounded contexts. They are modules in the same codebase, not microservices.

### 7.1 Finance

Owns:
- Transactions and categories.
- Budgets.
- Savings goals.
- Money arithmetic.
- Dashboard summaries and purchase scenarios.

Source of truth: application database.

### 7.2 Financial Memory

Owns:
- Consent state.
- Memory lifecycle metadata.
- Approved memory write/recall/update/supersede/delete workflows.
- User-facing memory management.

Walrus Memory stores and retrieves persistent memories. Application metadata tracks lifecycle and sync status. The financial database remains authoritative when a memory conflicts with a current goal or transaction.

### 7.3 Assistant

Owns:
- Question classification or routing.
- Minimal context assembly.
- Coordination of finance queries and memory recall.
- Model invocation.
- Output validation and response policy.

The assistant does not own finance records and must not independently calculate authoritative totals.

### 7.4 On-chain Verification

Owns:
- Tatum Sui RPC requests.
- Response schema validation.
- Safe presentation of on-chain data.
- Verification explanations and integration status.

This context must state exactly what an RPC response establishes. Do not claim a Sui response proves the contents of a Walrus Memory payload unless the documented cryptographic relationship has actually been verified.

### Context map

```text
Finance ──────────────┐
                     ├──▶ Assistant (orchestrates; does not own finance data)
Financial Memory ────┘

On-chain Verification ─── independent read capability used by the verification UI
```

The Finance and Financial Memory modules coordinate through application use cases, not by importing each other's infrastructure. Prefer explicit IDs and DTOs across module boundaries.

## 8. Core Domain Types

These are conceptual contracts. Adapt names and details during implementation, but preserve the invariants.

### Money

- Currency is explicit.
- Amount uses integer minor units or a safe exact decimal type.
- Arithmetic rejects incompatible currencies unless a deliberate conversion operation is supplied.
- Formatting is a presentation concern.
- Never use `number` floating-point values as the authoritative representation of money.

### Transaction

- Stable ID and owning user ID.
- Type is `income` or `expense`.
- Positive amount; type defines direction.
- Currency, category, occurrence timestamp.
- Optional description.
- Created/updated timestamps.

### Budget

- Stable ID and owning user ID.
- Defined period and currency.
- Non-negative budget amount.
- Explicit period-boundary policy and timezone behavior.

### SavingsGoal

- Stable ID and owning user ID.
- Name, target amount, optional target date, status.
- Current progress must have a clearly defined source. Do not invent a current saved amount from spending records alone.

### FinancialMemory

An application-level concept for an approved memory operation or tracked memory item, not a claim that the external SDK exposes exactly this object shape.

- Owning user/account scope.
- Memory category and lifecycle status.
- Version or supersession metadata when useful.
- Provider operation reference when safe.
- Consent status.
- No delegate private key or sensitive auth material.

## 9. Ports and Adapter Contracts

Use the following as design-level examples; verify concrete signatures against the actual TypeScript implementation.

### Finance repositories

```ts
export interface TransactionRepository {
  listForPeriod(input: {
    userId: string;
    startInclusive: string;
    endExclusive: string;
  }): Promise<Transaction[]>;
  findById(input: {
    userId: string;
    transactionId: string;
  }): Promise<Transaction | null>;
  create(input: NewTransaction): Promise<Transaction>;
  update(input: UpdateTransaction): Promise<Transaction>;
  delete(input: {
    userId: string;
    transactionId: string;
  }): Promise<void>;
}
```

Repository methods accept an authenticated `userId` resolved by the server. They must still enforce user scope in the query and database policy.

### Financial memory port

```ts
export interface FinancialMemoryPort {
  health(): Promise<ProviderHealth>;
  remember(input: {
    userId: string;
    approvedText: string;
    idempotencyKey: string;
  }): Promise<MemoryWriteResult>;
  recall(input: {
    userId: string;
    query: string;
    limit: number;
  }): Promise<MemoryRecallResult>;
}
```

This is a conceptual application port. The adapter maps the actual Walrus Memory SDK's account, namespace, job, and result types to these application-owned types. Do not pass a user-supplied account ID as authorization proof. The server must resolve the correct configured account/namespace from trusted identity and application policy.

### On-chain data port

```ts
export interface OnChainDataPort {
  getVerificationData(input: {
    reference: string;
  }): Promise<OnChainVerificationResult>;
}
```

Define the concrete request only after confirming the current documented Tatum Sui RPC method and the relevant on-chain object/transaction schema. Do not invent a blockchain relationship to satisfy this interface.

### Assistant port

```ts
export interface FinanceAssistantPort {
  generateAnswer(input: {
    question: string;
    facts: FinanceFacts;
    relevantMemories: SafeMemoryContext[];
  }): Promise<AssistantAnswer>;
}
```

The model receives minimal, necessary, user-authorized context. Financial facts are computed before calling the model. Validate the model response and do not treat it as a database command.

## 10. Critical Use-Case Flows

### 10.1 Add a transaction

```text
Browser form
  → validate request
  → authenticate user
  → CreateTransaction use case
  → validate domain invariants
  → TransactionRepository port
  → PostgreSQL adapter
  → return transaction DTO
  → refresh dashboard query
```

Requirements:
- Use the session identity, not a request-body `userId`.
- Validate the input on the server.
- Use a database transaction if multiple database writes must succeed together.
- Never require Walrus, Tatum, or the LLM to be online to save an ordinary transaction.

### 10.2 Answer a financial question

```text
Question
  → authenticate user
  → AnswerFinanceQuestion use case
  → fetch user's current finance records
  → calculate facts using finance domain functions
  → recall relevant approved memory (if enabled)
  → assemble minimal context
  → LLM adapter generates explanation
  → validate response
  → return answer + calculation facts / assumptions
```

Rules:
- If memory recall fails, continue with current finance facts and clearly omit memory-based claims.
- If the LLM fails, return a useful retryable error; deterministic finance calculations remain available.
- If records are missing, state what is missing.
- Do not allow the LLM to execute arbitrary SQL or make unrestricted provider calls.

### 10.3 Update a savings goal and sync memory

```text
User updates goal
  → authenticate + authorize
  → UpdateSavingsGoal use case
  → validate and persist canonical goal in database
  → mark memory sync as pending
  → create/update/supersede approved memory through Walrus adapter
  → confirm actual provider job completion
  → mark sync successful, or keep pending/failed with safe retry
```

Consistency model:
- Database goal update and external Walrus write cannot be assumed to share one atomic transaction.
- Treat Walrus synchronisation as eventually consistent.
- A valid goal update should not be rolled back because Walrus is unavailable.
- Use idempotency keys or deduplication metadata to avoid duplicate memory writes on retries.
- On future assistant requests, current database values take precedence over stale recalled memory.
- If a durable background queue is not available for MVP, implement a visible retry action and persist sync status. Do not pretend a background retry exists if it does not.

### 10.4 Read on-chain data through Tatum

```text
Verification page
  → server route/use case
  → OnChainDataPort
  → Tatum adapter performs documented Sui RPC request
  → validate response shape and network
  → map to application DTO
  → show exact result, timestamp, and what it means
```

Rules:
- API key stays server-side.
- Bound timeouts and retries.
- Avoid polling loops.
- Do not display a successful verification state after a timeout or malformed response.
- Store only useful operational metadata; avoid storing unnecessary personal data on-chain.

## 11. API and Presentation Boundaries

Use Next.js server actions or route handlers consistently. Avoid implementing the same operation in both without a clear need.

Each write endpoint must:
1. Validate request shape.
2. Resolve the session.
3. Authorize the resource against the session user.
4. Call one application use case.
5. Return a typed response or safe error.
6. Avoid exposing provider secrets, SQL details, stack traces, or private provider payloads.

Suggested logical API operations:
- `GET/POST /api/transactions`
- `GET/PATCH/DELETE /api/transactions/:id`
- `GET /api/dashboard`
- `GET/PUT /api/budgets`
- `GET/POST/PATCH /api/goals`
- `POST /api/assistant`
- `GET/POST /api/memory`
- `GET /api/integrations/tatum/verification`

These are logical examples, not a requirement to create every endpoint in advance. Prefer resource-oriented APIs and follow the existing Next.js project conventions.

Use runtime schemas at external boundaries (for example, Zod if selected). TypeScript types alone do not validate JSON at runtime.

## 12. Persistence and Data Ownership

Provider-neutral PostgreSQL stores:
- Profiles and preferences.
- Transactions and categories.
- Budgets and savings goals.
- Memory consent and lifecycle metadata.
- Safe integration operation metadata.

Walrus Memory stores:
- User-approved persistent preferences and goals intended to inform future sessions.
- Only the minimal text needed for useful recall.
- One user-owned `MemWalAccount` per verified wallet, with a distinct Memeora delegate key explicitly registered by the owner. Encrypt delegate keys at rest and bind each key to one wallet/account. The application delegate can access memories until revoked; revocation can take up to 30 seconds to stop authenticating and cannot retract plaintext already read. User-signed Security Delete is a separate irreversible flow whose success requires a confirmed Walrus batch result.

Tatum/Sui provides:
- Data from a documented on-chain read.
- No assumed ownership or proof relationship without evidence.

LLM provider:
- Receives only the context needed for the current question, subject to product disclosures and provider terms.
- Is not the source of truth for stored financial data.

### Persistence rules

- Use migrations for schema changes.
- Enforce row-level security (RLS) for every user-owned table. Use a least-privilege runtime role that is neither table owner nor `BYPASSRLS`, enable `FORCE ROW LEVEL SECURITY`, and set normalized wallet identity with transaction-local context inside every authenticated transaction. Never trust a request-supplied wallet address.
- Add indexes for user ID and common time filters.
- Define deletion behavior across database and external memory.
- Keep provider credentials out of database rows accessible to clients.
- Use exact amount representation and explicit timezones.
- Do not use external memory as a transaction ledger.

## 13. Cross-Provider Failure and Consistency

Walrus Memory, Tatum, and an LLM are independent external systems. There is no shared transaction across them.

| Operation/failure | Required result |
|---|---|
| Transaction save succeeds; memory is down | Keep transaction; show memory unavailable only where relevant. |
| Goal update succeeds; Walrus write fails | Keep updated goal; mark sync pending/failed; offer retry. |
| Memory recall fails | Answer from current finance records; do not fabricate remembered context. |
| Tatum request fails | Show unavailable status; do not show a fake result or verification badge. |
| LLM fails | Preserve finance functionality and display a retryable assistant error. |
| Provider returns malformed data | Reject the response, log a redacted error, and show a safe failure state. |
| User repeats a write after timeout | Use idempotency/deduplication where supported; inspect provider state before blindly retrying if duplicate creation is possible. |

Do not introduce a message broker or a complex saga framework just for these MVP flows. Use persisted sync status and explicit retry unless the implemented deployment environment supports a durable queue and the need is demonstrated.

## 14. Security Boundaries

### Browser
- May contain public wallet/network configuration intended for browser use.
- Must not contain service-role keys, Tatum API keys, Walrus delegate private keys, or privileged provider configuration.
- Must not directly invoke privileged server-only adapters.

### Server
- Resolves user identity and enforces access.
- Verifies single-use Sui wallet challenges and issues a Memeora-owned, short-lived server session in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Mutating requests enforce origin/CSRF protection. Session issuance and wallet identity mapping are persisted and revocable; a request body can never select the session wallet.
- Holds provider secrets.
- Validates every external request and response.
- Applies rate limits and timeouts.
- Logs safe metadata only.

### Database
- RLS policies enforce per-wallet access using transaction-local context populated from the verified Memeora session.
- Runtime and migration database roles are separate. The runtime role cannot bypass RLS or own application tables.
- Preserve stable internal account UUIDs where possible. A wallet identity table maps each verified canonical Sui address to an internal account; transaction-local RLS context is that verified address and policies resolve ownership through the mapping. Legacy UUID rows are assigned only after a verified claim, never by matching email or inferring from financial data.
- Sensitive columns are not exposed through broad selects.

### AI
- Treat user messages and recalled memories as untrusted data.
- Ignore instructions embedded in memories that attempt to override system/security rules.
- Never expose secrets or other users' data.
- Do not let recalled text change authorization decisions.
- Validate structured tool inputs and model outputs.

## 15. Testing Architecture

### Domain unit tests — no I/O

Test:
- Money arithmetic and currency mismatch.
- Period calculations and timezone boundaries.
- Expense/income totals.
- Remaining budget and utilisation.
- Savings-goal calculations.
- Purchase scenario assumptions and edge cases.

These tests must not require PostgreSQL, Walrus, Tatum, or an LLM.

### Application use-case tests — in-memory adapters

Inject:
- In-memory transaction/budget/goal repositories.
- Fake memory port.
- Fake on-chain port.
- Fake assistant port.
- Fixed clock when needed.

Test:
- Correct user scoping.
- Goal update remains successful when memory sync fails.
- Assistant uses deterministic facts.
- Stale memory never overrides canonical finance data.
- Retry/idempotency behavior.
- Errors are mapped to expected result types.

### Adapter integration tests

Test provider adapters against:
- Mocked HTTP responses and malformed payloads in normal CI.
- Documented staging/test configuration where available.
- Separate manual live verification for Mainnet operations.

Do not require live Mainnet calls in every test run.

### End-to-end tests

Test:
- Authentication and data isolation.
- Add/edit/delete transaction.
- Budget and goal update.
- Dashboard total correctness.
- Memory consent and recall.
- Goal change affects the next relevant assistant answer.
- Tatum verification page displays actual response metadata.
- External provider failures do not break finance tracking.

## 16. Observability

Use structured, redacted logs with:
- Request/correlation ID.
- Use-case or provider operation name.
- Success/failure category.
- Duration.
- Provider request ID/reference where safe.
- Memory sync status.
- Tatum network/method and safe result reference.

Never log:
- API keys or private keys.
- Session tokens.
- Seed phrases or wallet secrets.
- Raw financial records unless strictly required for a controlled debugging path.
- Full prompts or memory contents by default.

A status such as `success` must represent a confirmed result, not merely that a request was started.

## 17. Configuration and Environment

Use a server-side validated configuration module. Fail early in development when required variables are missing, but allow optional providers to be disabled when the relevant feature is not configured.

Expected variable names may include:

```dotenv
# PostgreSQL — server only; runtime role must not own tables or bypass RLS
DATABASE_URL=
# Migration tooling only; do not use in request handling
DATABASE_MIGRATION_URL=
# Sui wallet session signing; server only
SESSION_SECRET=

# Walrus Memory — server-only relayer config; each wallet/account gets a distinct
# owner-authorized delegate whose encrypted private key is stored per account.
# Do not configure a shared global account/delegate for the target architecture.
MEMWAL_RELAYER_URL=https://relayer.memory.walrus.xyz
MEMWAL_NAMESPACE=memeora

# Tatum — server only
TATUM_API_KEY=

# LLM — server only; choose provider and name the key accordingly
LLM_API_KEY=
LLM_MODEL=
```

Rules:
- Adjust names to the actual SDK and selected providers.
- Do not put server secrets behind a `NEXT_PUBLIC_` prefix.
- `.env.example` contains placeholders only.
- `.env.local` is ignored by Git.
- Never print secret values in logs or agent responses.
- Confirm official current endpoints and API schemas before enabling Mainnet.

## 18. Architecture Decision Records (ADRs)

Keep short decisions in `docs/decisions/` if the project grows. Initial decisions:

### ADR-001: Modular monolith
**Decision:** One Next.js deployable with feature/domain modules.  
**Reason:** Appropriate for a small MVP; reduces deployment and operational overhead while preserving boundaries.  
**Revisit when:** independent scaling, separate teams, or reliability needs justify service extraction.

### ADR-002: Database is financial source of truth
**Decision:** Provider-neutral PostgreSQL owns canonical transactions, budgets, and savings goals. Supabase is not part of the target application stack.  
**Reason:** These values need precise updates, querying, and authorization. External memory is contextual and can be stale.

### ADR-003: Ports/adapters around external services
**Decision:** PostgreSQL, Walrus, Tatum, and the LLM provider are accessed through explicit adapters.  
**Reason:** Allows tests without networks and limits vendor coupling.

### ADR-004: Deterministic financial calculations
**Decision:** Finance calculations run in domain/application code before AI text generation.  
**Reason:** LLM arithmetic is not authoritative or reliably reproducible.

### ADR-005: Eventual consistency for external memory
**Decision:** Database writes do not depend on Walrus success; memory sync has explicit status and retry.  
**Reason:** A database and an external provider cannot share one atomic transaction.

### ADR-006: No microservices in MVP
**Decision:** Bounded contexts are modules, not separate deployed services.  
**Reason:** Keeps implementation achievable for a hackathon without giving up logical isolation.

## 19. Implementation Sequence

1. **Foundation:** create the Next.js project, strict TypeScript, lint/test scripts, environment validation, and initial UI shell.
2. **Finance domain:** implement money, transactions, budgets, savings goals, calculation functions, and unit tests before building complex screens.
3. **Persistence and auth:** add provider-neutral PostgreSQL migrations, forced RLS, direct Sui signature verification, Memeora-owned server sessions, repositories, and use cases.
4. **Dashboard and transaction UI:** connect the UI to real use cases and persisted records.
5. **Walrus Memory:** implement consent, adapter, write/recall, status, lifecycle management, and graceful failure.
6. **Tatum Sui RPC:** verify the official endpoint and response schema, implement one concrete server-side read, and document exactly what it proves.
7. **Assistant:** orchestrate finance facts + relevant memories + LLM response; validate output and handle failures.
8. **Hardening:** run tests, security checks, accessibility/responsive review, and production build.
9. **Hackathon verification:** test genuine Mainnet writes, retain evidence for at least 10 memories, reproduce Tatum RPC request, and record the demo.

Do not implement all layers in one large generated change. Each milestone should be reviewed and tested before proceeding.

## 20. Definition of Architecturally Done

A feature is architecturally complete when:
- Its business rules live in a domain or application module, not a UI component.
- Its external dependencies are accessed through a narrow adapter/port where appropriate.
- It has explicit user authorization and input validation.
- Its success and failure states are truthful.
- Its important logic has tests that do not require external services.
- Its secrets remain server-side.
- Its types and contracts do not leak provider-specific payloads into the domain.
- It does not create circular dependencies.
- Lint, typecheck, relevant tests, and build pass.
- Documentation accurately states what is real, mocked, configured, and verified.

## 21. AI Coding Agent Instructions

When implementing this architecture:

1. Read `prd.md` and this file before proposing structural changes.
2. Inspect the current repository, package versions, scripts, and existing conventions first.
3. Verify current official documentation before using PostgreSQL drivers, Walrus Memory, Tatum, Sui wallet, or LLM APIs.
4. Implement the smallest useful vertical slice, not a large scaffold full of unused abstractions.
5. Keep domain code pure and unit-testable.
6. Use fake/in-memory adapters for use-case tests.
7. Keep concrete SDK imports inside server-only infrastructure modules.
8. Never fabricate on-chain data, memory success, or test results.
9. Never delete real data, reset a database, or overwrite user work without explicit confirmation.
10. After each milestone, report changed files, tests run, outcomes, manual setup required, and anything still mocked or unverified.
11. If the PRD and this document conflict, protect financial correctness, user privacy, and authorization first; explain the conflict before making a material design change.
12. Do not introduce microservices, queues, event sourcing, CQRS, or complex dependency injection frameworks without a demonstrated requirement.

---

## Architecture Skill Reference

This document applies the following concepts from the `wshobson/agents` **architecture-patterns** skill:
- Clean Architecture: dependencies point inward; business rules are framework-independent.
- Hexagonal Architecture: provider integrations sit behind ports and adapters.
- Domain-Driven Design: use bounded contexts, a consistent domain vocabulary, value objects, and explicit ownership.
- In-memory adapter testing: application use cases should be testable without real external services.
- Anti-corruption layers: translate provider schemas into application-owned types.
- Pragmatic aggregate/event consistency: use explicit lifecycle and retry handling where database and external provider operations cannot be atomic.

Skill source: https://github.com/wshobson/agents/tree/main/plugins/backend-development/skills/architecture-patterns

The skill's examples include Python/FastAPI. Memeora uses Next.js/TypeScript, so the principles are adapted to the actual product stack rather than copying Python-specific directory layouts or code.
