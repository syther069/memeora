# Technical Feature Specification: Walrus Sovereign Financial Memory & Assistant Learning Loop

**Document Status:** Pending User Review & Approval  
**Feature:** Sovereign Persistent Memory & Context-Aware Assistant Learning Loop  
**Context:** Everyday consumers, budgeters, and savers who want personal financial targets and spending rules remembered sovereignly across sessions without data leakage or AI arithmetic errors. Built for the Total Recall Hackathon (Consumer Finance Apps track) requiring verifiable Sui Mainnet writes via Walrus Memory and on-chain liveness verification via Tatum Sui RPC.  
**Governing Documents:** [`prd.md`](file:///c:/memora/prd.md), [`architecture.md`](file:///c:/memora/architecture.md), [`rules.md`](file:///c:/memora/rules.md), and [`Prototype_vs_Production_Checklist`](file:///c:/memora/Prototype_vs_Production_Checklist%20(2).pdf).

---

## 1. Behavior: Given / When / Then

### 1.1 Happy Path Cases

#### Case HP-1: Explicit Consent & Persistent Memory Ingestion
* **Given** an authenticated user on the `/memory` screen with `profiles.memory_consent_enabled = true`,
* **When** the user inputs a valid preference or rule (e.g., category: `'preference'`, text: *"Keep dining and takeout spend under ₹3,500 per month"*) and clicks **"Store in Walrus Memory"**,
* **Then**:
  1. The server validates that the text is between 5 and 500 characters and category is `'preference' | 'goal' | 'budget'`.
  2. The server inserts a record into PostgreSQL `financial_memories` with `walrus_status = 'pending'`.
  3. The server asynchronously dispatches the memory payload to the Walrus Memory Relayer (`MEMWAL_RELAYER_URL`) under namespace `memeora` signed with `MEMWAL_KEY`.
  4. Upon receiving the blob identifier from Walrus, the server updates the database row to `walrus_status = 'confirmed'` and stores `walrus_blob_id`.
  5. The API returns HTTP `201 Created` with the memory payload.
  6. The UI renders the new memory card with a tactile "Confirmed" badge, displays a copyable reference pill (e.g., `Ref: wal_b89x...`), and displays an accessible success toast.

#### Case HP-2: Context-Aware Assistant Affordability Query (The Learning Loop)
* **Given** an authenticated user with an active monthly budget of ₹15,000, current recorded expenses of ₹8,400, and a confirmed Walrus memory *"Prioritize saving ₹3,000 each month for liquid emergency reserves"*,
* **When** the user asks the assistant in `/assistant`: *"Can I afford a ₹5,000 laptop repair this month?"*,
* **Then**:
  1. The server resolves the user identity via server session `supabase.auth.getUser()`.
  2. The deterministic finance engine computes ledger figures in integer minor units:
     - `remainingBudget = 1500000 - 840000 = 660000 paise` (₹6,600.00).
     - `postPurchaseBudget = 660000 - 500000 = 160000 paise` (₹1,600.00).
  3. The server recalls active Walrus memories from namespace `memeora` matching `'budget'` and `'goal'`.
  4. The server identifies that remaining budget after purchase (₹1,600.00) drops below the ₹3,000.00 emergency reserve memory rule.
  5. The server injects the deterministic math and the exact recalled memory text into the assistant system prompt.
  6. The assistant returns a 3-part structured verdict:
     - **Mathematical Ledger Capacity:** ₹6,600.00 remaining budget nominally covers ₹5,000.00.
     - **Memory Rule Conflict:** Purchase breaches the user's ₹3,000.00 monthly emergency reserve rule (leaving only ₹1,600.00).
     - **Recommendation:** Advises deferring or splitting the expense to safeguard the emergency reserve goal.
  7. The UI renders the assistant response bubble accompanied by a structured `CalculationContext` pill box showing the exact math and recalled memory pill.

#### Case HP-3: Memory Inspection, Filtering & Deletion (Right to Erasure)
* **Given** an authenticated user on the `/memory` screen with multiple stored memories across categories,
* **When** the user clicks the `'Goals'` category filter pill, the list immediately filters to only `'goal'` records.
* **When** the user clicks **"Delete"** on a memory card and confirms the prompt,
* **Then**:
  1. The client sends `DELETE /api/memory/:id`.
  2. The server verifies row ownership via `auth.uid() = user_id`.
  3. The server marks the row `walrus_status = 'superseded'` in PostgreSQL and purges it from the active Walrus recall cache.
  4. The API returns HTTP `200 OK` with `{"success": true, "data": {"id": ":id", "status": "superseded"}}`.
  5. The UI animates the removal of the card, shows a toast notification, and subsequent assistant queries exclude this rule.

#### Case HP-4: Tatum Sui RPC Liveness Verification
* **Given** any user or hackathon judge inspecting `/verification`,
* **When** the user selects the method `sui_getLatestCheckpointSequenceNumber` and clicks **"Execute Verification Probe"**,
* **Then**:
  1. The client sends `GET /api/verification/sui-checkpoint`.
  2. The server executes a JSON-RPC 2.0 call to `https://api.tatum.io/v3/blockchain/node/sui-mainnet` authenticated with `TATUM_API_KEY`.
  3. The server extracts the real sequence number, epoch, and network timestamp.
  4. The API returns HTTP `200 OK` with the raw response and verification metadata.
  5. The UI renders the live checkpoint number in tabular monospace numerals, shows a verified green status badge, displays a copyable JSON payload, and explicitly clarifies that this verifies Sui network liveness.

---

### 1.2 Edge Cases

#### Case EC-1: Memory Context Contradicts Canonical Ledger
* **Given** an active Walrus memory stating *"Monthly budget cap is ₹20,000"*, but the PostgreSQL `budgets` table records ₹25,000 for the current cycle,
* **When** the user queries the assistant for budget status or affordability,
* **Then** the deterministic server engine uses the database value (₹25,000.00) for all arithmetic calculations, and the assistant explicitly informs the user: *"Your database budget is ₹25,000.00, which takes precedence over your older memory note of ₹20,000.00. Would you like to update your memory?"*

#### Case EC-2: Zero Memories Stored (Cold Start / New User)
* **Given** a new user with no records in `financial_memories`,
* **When** the user navigates to `/memory`, the UI renders an `EmptyState` component with a friendly prompt: *"No sovereign memories stored yet. Save your first savings rule or budget preference above."*
* **When** the user queries `/assistant`, the assistant operates purely on ledger records without crashing or referencing missing memory context.

#### Case EC-3: User Revokes Memory Consent
* **Given** a user who toggles off **"Walrus Persistent Memory"** on `/memory`,
* **When** `profiles.memory_consent_enabled` is set to `false`,
* **Then**:
  1. Any subsequent `POST /api/memory/remember` is rejected immediately with HTTP `403 Forbidden` (`{"error": {"code": "CONSENT_REQUIRED", "message": "Memory consent is disabled."}}`).
  2. Queries to `/api/assistant/chat` skip Walrus memory recall entirely and operate in local-database mode.
  3. Existing memories remain in storage but are flagged as inactive for AI context assembly until re-enabled.

#### Case EC-4: Long Input and Special Characters
* **Given** a user submitting a memory text with Unicode emojis, currency symbols (₹, $, €), or maximum length (500 characters),
* **When** submitted to `/api/memory/remember`,
* **Then** the server sanitizes against XSS, validates UTF-8 encoding, preserves valid currency symbols, and saves successfully without truncation. If input exceeds 500 characters, it rejects with HTTP `400 Bad Request` and form input is preserved in the UI.

#### Case EC-5: Rapid Double-Click on Submit Buttons
* **Given** a user rapidly clicking "Store in Walrus Memory" or "Add Transaction" twice within 200ms,
* **When** the first click triggers submission,
* **Then** the button enters disabled loading state immediately (`disabled={isLoading}`), preventing duplicate database insertions or relayer writes.

---

### 1.3 Failure States & Graceful Degradation

#### Case FS-1: Walrus Relayer Timeout or Network Outage (5xx / Connection Drop)
* **Given** the Walrus Memory relayer is unreachable or returns HTTP 500/504,
* **When** a user creates a new memory,
* **Then**:
  1. The server catches the exception, updates PostgreSQL `financial_memories.walrus_status = 'pending_retry'`.
  2. The API responds with HTTP `202 Accepted` (`{"success": true, "data": {..., "status": "pending_retry"}, "warning": "Memory saved locally; Walrus Mainnet sync queued."}`).
  3. The UI shows an amber "Queued for Sync" pill.
  4. Core transaction entry, dashboard viewing, and budgeting are 100% unaffected.

#### Case FS-2: Tatum Sui RPC Gateway Rate Limit (HTTP 429) or Outage
* **Given** Tatum API returns HTTP 429 Too Many Requests or 503,
* **When** `/api/verification/sui-checkpoint` is queried,
* **Then**:
  1. The server falls back to the most recent cached checkpoint sequence within memory cache (TTL: 60 seconds).
  2. The API returns HTTP `200 OK` with `"cached": true` and `"cachedAt": ISO_TIMESTAMP`.
  3. The UI displays the cached sequence with an amber notice: *"Showing verified checkpoint from [Time] UTC (Gateway rate-limited; retrying in 30s)"*.
  4. If no cache exists, it returns HTTP `503 Service Unavailable` with a user-friendly error card and manual "Retry Probe" button.

#### Case FS-3: LLM Provider Outage or Quota Exceeded (HTTP 500 / 503 / 429)
* **Given** the LLM provider (Gemini / Claude) is down or rate-limited,
* **When** a user sends a query to `/api/assistant/chat`,
* **Then**:
  1. The server runs the deterministic math engine anyway.
  2. Instead of crashing, the API returns HTTP `200 OK` with a structured deterministic fallback response:
     ```json
     {
       "success": true,
       "data": {
         "message": "AI explanation service is temporarily unavailable. Here is your verified calculation directly from your ledger:",
         "calculationContext": {
           "remainingBudgetFormatted": "₹6,600.00",
           "proposedPurchaseFormatted": "₹5,000.00",
           "verdict": "Within remaining monthly budget (₹1,600.00 balance)"
         },
         "isFallback": true
       }
     }
     ```
  3. The UI renders the verified calculation card with a clear notice that deterministic numbers are intact.

#### Case FS-4: Unauthenticated or Expired Session Request (401)
* **Given** a user whose session has expired or an unauthenticated client calling `/api/memory/*`, `/api/transactions/*`, or `/api/assistant/*`,
* **When** the request arrives at the API route,
* **Then**:
  1. The route calls `supabase.auth.getUser()`.
  2. If session is null or invalid, it returns HTTP `401 Unauthorized` with `{"error": {"code": "UNAUTHORIZED", "message": "Valid session required."}}`.
  3. The client redirects to `/login` preserving the return path in query params.

#### Case FS-5: Cross-Tenant Data Access Attempt (IDOR / 403 Forbidden)
* **Given** authenticated User A attempting to read, update, or delete a memory ID belonging to User B (`DELETE /api/memory/:id_belonging_to_B`),
* **When** the server queries the database with `WHERE id = :id AND user_id = auth.uid()`,
* **Then** 0 rows are affected (enforced both by PostgreSQL RLS and query scoping), and the API returns HTTP `404 Not Found` or `403 Forbidden` without leaking the existence of User B's record.

---

## 2. API Contract: Inputs, Outputs, Errors & Status Codes

### Base URL: `/api`
All routes enforce JSON request/response encoding and HTTP `Content-Type: application/json`.

```
Standard Error Shape:
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "RATE_LIMITED" | "INTERNAL_ERROR",
    "message": "Human-readable description of error",
    "details": null | [ { "field": "text", "issue": "Must be at least 5 characters" } ]
  }
}
```

---

### Endpoint 1: Ingest Memory
* **Method & Path:** `POST /api/memory/remember`
* **Auth:** Required (`Bearer session_token` or HTTP-only cookie via Supabase)
* **Headers:** `Content-Type: application/json`

#### Request Body Schema
```typescript
{
  category: "goal" | "preference" | "budget";
  text: string; // Min: 5, Max: 500 characters
}
```

#### Response 201 Created
```json
{
  "success": true,
  "data": {
    "id": "c3a1e2f8-9b4d-4e12-87a3-1a2b3c4d5e6f",
    "userId": "usr_99a8b7c6...",
    "category": "preference",
    "text": "Keep dining and takeout spend under ₹3,500 per month",
    "walrusBlobId": "wal_b89x01ha4b89x...",
    "walrusStatus": "confirmed",
    "createdAt": "2026-11-02T12:00:00.000Z"
  }
}
```

#### Response 202 Accepted (When Walrus Relayer is Queued/Slow)
```json
{
  "success": true,
  "data": {
    "id": "c3a1e2f8-9b4d-4e12-87a3-1a2b3c4d5e6f",
    "userId": "usr_99a8b7c6...",
    "category": "preference",
    "text": "Keep dining and takeout spend under ₹3,500 per month",
    "walrusBlobId": null,
    "walrusStatus": "pending_retry",
    "createdAt": "2026-11-02T12:00:00.000Z"
  },
  "warning": "Memory recorded locally; Walrus Mainnet sync queued."
}
```

#### Status Codes & Error Responses
- **400 Bad Request:**
  `{"success": false, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": [{"field": "text", "issue": "Memory text must be at least 5 characters"}]}}`
- **401 Unauthorized:**
  `{"success": false, "error": {"code": "UNAUTHORIZED", "message": "Session expired or missing"}}`
- **403 Forbidden:**
  `{"success": false, "error": {"code": "CONSENT_REQUIRED", "message": "User has disabled persistent financial memory consent"}}`
- **500 Internal Server Error:**
  `{"success": false, "error": {"code": "INTERNAL_ERROR", "message": "Failed to record memory"}}`

---

### Endpoint 2: Recall Memories
* **Method & Path:** `POST /api/memory/recall`
* **Auth:** Required
* **Request Body Schema:**
```typescript
{
  query: string;           // Min: 2, Max: 200 characters
  categories?: ("goal" | "preference" | "budget")[]; // Optional filter
  limit?: number;          // Default: 5, Max: 20
}
```

#### Response 200 OK
```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "id": "c3a1e2f8-9b4d-4e12-87a3-1a2b3c4d5e6f",
        "category": "goal",
        "text": "Prioritize saving ₹3,000 each month for liquid emergency reserves",
        "walrusBlobId": "wal_b89x01ha4b89x...",
        "walrusStatus": "confirmed",
        "relevance": 0.94,
        "createdAt": "2026-10-20T08:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

#### Status Codes
- **200 OK:** Success.
- **401 Unauthorized:** Missing session.

---

### Endpoint 3: Delete / Supersede Memory
* **Method & Path:** `DELETE /api/memory/:id`
* **Auth:** Required
* **Path Parameters:** `id: string (UUID)`

#### Response 200 OK
```json
{
  "success": true,
  "data": {
    "id": "c3a1e2f8-9b4d-4e12-87a3-1a2b3c4d5e6f",
    "status": "superseded",
    "updatedAt": "2026-11-02T12:05:00.000Z"
  }
}
```

#### Status Codes
- **200 OK:** Memory successfully superseded and unlinked.
- **401 Unauthorized:** Missing session.
- **404 Not Found:** Memory not found or owned by another user.

---

### Endpoint 4: Context-Aware Assistant Chat
* **Method & Path:** `POST /api/assistant/chat`
* **Auth:** Required
* **Request Body Schema:**
```typescript
{
  prompt: string; // Min: 1, Max: 1000 characters
  cycleMonth?: string; // Format: "YYYY-MM", optional (defaults to current cycle)
}
```

#### Response 200 OK
```json
{
  "success": true,
  "data": {
    "message": "Based on your October 2026 records, you have ₹6,600.00 remaining in your monthly budget. While a ₹5,000.00 purchase fits within that remaining margin, your Walrus memory specifies keeping a ₹3,000.00 emergency reserve. Making this purchase now would leave you with only ₹1,600.00, breaching your reserve rule.",
    "calculationContext": {
      "budgetLimitMinor": 1500000,
      "spentMinor": 840000,
      "remainingBudgetMinor": 660000,
      "proposedPurchaseMinor": 500000,
      "remainingBudgetFormatted": "₹6,600.00",
      "proposedPurchaseFormatted": "₹5,000.00",
      "verdict": "Breaches ₹3,000.00 emergency reserve memory rule (leaves ₹1,600.00)"
    },
    "recalledMemories": [
      {
        "id": "mem_01...",
        "category": "goal",
        "text": "Prioritize saving ₹3,000 each month for liquid emergency reserves"
      }
    ],
    "timestamp": "2026-11-02T12:10:00.000Z"
  }
}
```

#### Status Codes
- **200 OK:** Calculation and response completed.
- **400 Bad Request:** Empty or oversized prompt.
- **401 Unauthorized:** Missing session.

---

### Endpoint 5: Tatum Sui RPC Liveness Verification
* **Method & Path:** `GET /api/verification/sui-checkpoint`
* **Auth:** None (Public / Judge inspection route)
* **Query Parameters:** `method?: "sui_getLatestCheckpointSequenceNumber" | "sui_getTotalTransactionBlocks"` (Default: `sui_getLatestCheckpointSequenceNumber`)

#### Response 200 OK
```json
{
  "success": true,
  "data": {
    "network": "sui-mainnet",
    "method": "sui_getLatestCheckpointSequenceNumber",
    "sequenceNumber": "68249120",
    "verified": true,
    "cached": false,
    "timestamp": "2026-11-02T12:15:00.000Z",
    "proof": {
      "rpcUrl": "https://api.tatum.io/v3/blockchain/node/sui-mainnet",
      "status": "connected",
      "latencyMs": 142
    }
  }
}
```

#### Status Codes
- **200 OK:** Verification succeeded.
- **503 Service Unavailable:** Tatum RPC unreachable and no cache exists.

---

## 3. Data: Schema Changes & Migrations Needed

All migrations use PostgreSQL DDL, UUID keys, strict foreign key constraints with `ON DELETE CASCADE`, integer minor units (`amount_minor BIGINT`), and Row-Level Security (RLS) linked to `auth.uid()`.

```sql
-- Migration: 20261102_001_core_schema.sql

-- 1. User Profiles & Privacy Consent Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  memory_consent_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_user_isolation"
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
  description TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_user_isolation"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_occurred
  ON public.transactions(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_category
  ON public.transactions(user_id, category);

-- 3. Monthly Budgets Table (Integer Minor Units: Paise)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- e.g. '2026-11'
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_user_isolation"
  ON public.budgets FOR ALL
  USING (auth.uid() = user_id);

-- 4. Savings Goals Table (Integer Minor Units: Paise)
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

CREATE POLICY "savings_goals_user_isolation"
  ON public.savings_goals FOR ALL
  USING (auth.uid() = user_id);

-- 5. Sovereign Financial Memories Table (Walrus Sync Metadata & Local Cache)
CREATE TABLE IF NOT EXISTS public.financial_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('goal', 'preference', 'budget')),
  memory_text TEXT NOT NULL CHECK (length(memory_text) >= 5 AND length(memory_text) <= 500),
  walrus_blob_id VARCHAR(255),
  walrus_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (walrus_status IN ('pending', 'confirmed', 'pending_retry', 'failed', 'superseded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.financial_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memories_user_isolation"
  ON public.financial_memories FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_memories_user_status
  ON public.financial_memories(user_id, walrus_status);

-- 6. Auto-Update Timestamp Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_savings_goals_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_memories_updated_at BEFORE UPDATE ON public.financial_memories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## 4. UI States: Loading, Empty, Error, Success & Offline

Per the **Prototype vs. Production Guide**, every user-facing screen must handle all 5 states:

| View / Feature | Loading State (<200ms) | Empty State | Error State | Success State | Offline State |
|---|---|---|---|---|---|
| **`/memory` (Memories List)** | Skeleton memory cards with subtle shimmer (`animate-pulse`) | `EmptyState` card: "No sovereign memories stored. Add your first financial rule above." with button trigger | Amber card: "Failed to load memories. Retry" button; user input preserved in form | Cards render with "Confirmed" badge, copyable `Ref: wal_...` pill, and delete trigger | Banner: "Offline. Displaying locally cached memories." Read-only mode |
| **`/assistant` (Learning Chat)** | Typing dot animation with caption: "Calculating deterministic scenario..." | Welcome greeting explaining deterministic calculation engine & memory safety | Error card explaining failure with manual "Calculate Directly from Ledger" fallback button | Structured message bubble with `CalculationContext` box (`CheckCircle2`, margin, verdict) | Banner: "Offline. AI chat unavailable; deterministic calculation view active." |
| **`/dashboard` (Overview)** | Metric card skeletons and shimmer progress bars | Prompt to add first income and expense transaction | Retry card if Supabase query fails; displays last-known local cache if available | Full metrics in tabular figures with positive/negative pill badges | Banner: "Offline. Showing cached ledger." |
| **`/transactions` (Ledger)** | Shimmer table rows with 4 skeleton items | `EmptyState` illustration: "No transactions found" with "Add Transaction" trigger | Toast notification with field-level highlights; preserves form data | Instant row insertion with green highlight and success toast | Banner: "Offline. New transactions saved locally and queued for sync." |
| **`/budgets` (Pacing & Goals)** | Skeleton goal cards and circular gauge placeholder | Zero-goal empty state with "Create Goal" pill trigger | Inline error message under input; form values preserved | Milestone progress animation, toast notification on update | "Offline. Budget modifications disabled until connection restored." |
| **`/verification` (Tatum Sui RPC)** | Spinner inside "Execute Verification Probe" button (`disabled={isLoading}`) | Default probe parameters ready for execution | Red warning card showing exact error code (e.g., Tatum 429) and retry countdown | Monospace formatted JSON payload with live checkpoint sequence number | Banner: "Offline. Cannot query Sui RPC." |

---

## 5. Non-Goals: What This Spec Deliberately Skips (v1 Scope)

1. **No Bank Scraping or Plaid/Yodlee OAuth Connections:** All transactions are entered manually or imported via demo data in v1. No third-party bank credentials are collected.
2. **No Storage of Raw Sensitive Transactions in Walrus:** Individual expense line items, payee names, and transaction timestamps remain in the private, RLS-protected PostgreSQL database. Walrus Memory exclusively stores high-level user preferences and financial rules.
3. **No LLM Financial Arithmetic:** Large Language Models are strictly prohibited from performing addition, subtraction, balances, or budget utilization. All math is deterministic TypeScript integer arithmetic.
4. **No Custodial Wallets or On-Chain Asset Transfers:** Memeora does not take custody of user funds, private keys, or execute on-chain token swaps/transfers.
5. **No Client-Side Secret Exposure:** `MEMWAL_KEY`, `TATUM_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `LLM_API_KEY` are strictly server-side environment variables. No `NEXT_PUBLIC_` prefixes.
6. **No Multi-User Household or Team Finance:** v1 strictly supports single-user personal finance workspaces with strict row-level tenant isolation.

---

## 6. Acceptance Checklist (Verify Line by Line)

### Clean Architecture & Domain Isolation
- [ ] **1. Pure Domain Logic:** `src/modules/finance/domain/` contains zero imports from React, Next.js, Supabase, Walrus, or LLM packages.
- [ ] **2. Minor Unit Math:** All monetary arithmetic (budgets, expenses, savings targets, affordability calculations) operates exclusively in integer minor units (paise/cents).
- [ ] **3. Strict Server Secrets:** No server secret (`MEMWAL_KEY`, `TATUM_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY`) is prefixed with `NEXT_PUBLIC_` or accessible in client bundles.

### Security & User Isolation (OWASP & IDOR Prevention)
- [ ] **4. Server-Side Identity:** Every API route verifies identity via `supabase.auth.getUser()`. Never trusts a `userId` in request body or params.
- [ ] **5. Row-Level Security:** PostgreSQL RLS is active on `profiles`, `transactions`, `budgets`, `savings_goals`, and `financial_memories` with `auth.uid() = user_id`.
- [ ] **6. IDOR Protection Tested:** Calling `DELETE /api/memory/:id` with an ID belonging to another user returns HTTP 404/403 and leaves the record untouched.

### Sovereign Financial Memory & Learning Loop
- [ ] **7. Explicit Consent Check:** When `memory_consent_enabled = false`, `POST /api/memory/remember` returns HTTP 403, and `/api/assistant/chat` completely omits Walrus memory recall.
- [ ] **8. Walrus Mainnet Integration:** Walrus Memory client successfully connects to `MEMWAL_RELAYER_URL` under namespace `memeora` and retrieves valid blob references.
- [ ] **9. 10+ Mainnet Memories Milestone:** At least 10 persistent financial memories are successfully written and confirmed on Sui Mainnet before final submission.
- [ ] **10. Observable Learning Loop:** Asking *"Can I afford a ₹5,000 purchase?"* with an active ₹3,000 emergency reserve memory produces an explicit warning citing the memory rule. Deleting the memory alters subsequent advice.
- [ ] **11. Memory Superseding:** Deleting a memory updates its status to `'superseded'` and immediately removes it from active context assembly.

### Tatum Sui RPC Liveness Verification
- [ ] **12. Real Tatum Gateway Read:** `/api/verification/sui-checkpoint` executes a live JSON-RPC 2.0 query to `https://api.tatum.io/v3/blockchain/node/sui-mainnet` and returns current sequence numbers.
- [ ] **13. Truthful Transparency:** The `/verification` UI explicitly explains that Tatum verifies Sui network liveness, not internal off-chain PostgreSQL transactions.
- [ ] **14. RPC Rate Limit Handling:** When Tatum returns HTTP 429, the endpoint serves the cached sequence number with a clear timestamp label.

### Screen States & Production Quality (Checklist Compliance)
- [ ] **15. All 5 States Handled:** Every screen (`/dashboard`, `/transactions`, `/budgets`, `/assistant`, `/memory`, `/verification`) handles Loading (<200ms), Empty, Error, Success, and Offline states.
- [ ] **16. Double-Click Protection:** All action submit buttons disable immediately upon submission to prevent duplicate records.
- [ ] **17. Form Preservation on Error:** If a network or validation error occurs, form input is retained in the UI so the user does not have to retype.
- [ ] **18. Tactile Clear Current UI:** Styling strictly complies with the Clear Current design system (Deep Current `#0D47A1`, Bright Current `#2196F3`, Sky Blue `#90CAF9`, Cloud Blue `#E3F2FD`) and tactile pill geometry.
- [ ] **19. Accessibility (WCAG AA):** Skip link functional, inputs labeled, `role="progressbar"` with `aria-valuenow`, and touch targets $\ge 48\times 48\text{px}$.
- [ ] **20. Full Test & Build Verification:** `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all pass with exit code `0`.

