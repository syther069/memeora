<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Memeora — AI Coding Agent Operating Guide

**Purpose:** Comprehensive, binding operating directives for any AI coding agent (Antigravity, Claude Code, Cursor, Copilot, etc.) working on the Memeora codebase.  
**Governing Documents:** [prd.md](file:///c:/memora/prd.md), [architecture.md](file:///c:/memora/architecture.md), [rules.md](file:///c:/memora/rules.md), [memory.md](file:///c:/memora/memory.md), and [design.md](file:///c:/memora/design.md).

---

## 1. Prime Directives & System Persona

1. **Greenfield Development:** Build Memeora from scratch as a consumer finance assistant. Never copy Clario source code, assets, or branding.
2. **Database is Canonical:** Provider-neutral PostgreSQL is the single source of truth for transactions, budgets, savings goals, and account profiles. Do not use Supabase. Stored memories in Walrus provide contextual assistance, not authoritative accounting.
3. **Deterministic Financial Math:** Compute all money values, balances, budget utilization, and affordability calculations with deterministic server-side code using integer minor units (paise/cents). Never rely on an LLM to perform arithmetic.
4. **Zero-Hallucination External Integrations:** Strict adherence to official documentation for Walrus Memory and Tatum Sui RPC. Never fabricate API responses, transaction hashes, or Mainnet memory writes.
5. **Truthful Verification:** Update [memory.md](file:///c:/memora/memory.md) after every milestone with actual test commands and exact exit codes. Never claim tests passed if they were skipped or unrun.

---

## 2. Mandatory Frontend Design, Motion, and UX Architecture

Memeora is a premium consumer fintech application. It must look and feel world-class, clean, responsive, and tactile—avoiding generic hackathon templates or amateur AI aesthetics.

**Mandatory design context for Antigravity and all coding agents:** Before every UI/UX design, implementation, or review task, open and read `@design.md`. It is the canonical source for Memeora's chosen theme, palette, layout, interaction, and review rules. The brand color values are centralized in `src/app/globals.css`; keep those tokens synchronized with `design.md` and use them instead of adding hard-coded brand colors. A design guide does not itself restyle existing screens; implementation work must apply its rules to the relevant UI.

### 2.1 Approved Design & Motion Resources
When styling, choosing components, crafting micro-animations, or picking palettes, consult these approved resources:
- **Components & Layouts:** [Watermelon UI Components](https://ui.watermelon.sh/components)
- **Motions & Micro-Interactions:** [Motion Primitives Docs](https://motion-primitives.com/docs)
- **Animated Components & UI:** [Skiper UI](https://skiper-ui.com/components)
- **Gradients & Accents:** [Feral UI Gradients](https://feralui.dev/gradients)
- **Design Tokens & Studio:** [Pryzm Design Studio](https://pryzm.design/studio)
- **Frontend Skills Directory:** [Skill Issue (Frontend)](https://skill-issue.in/?domain=frontend)
- **21st Component MCP:** `https://21st.dev/mcp` *(An API key will be provided by the user upon request)*

### 2.2 Component Extraction Fallback Rule (MANDATORY)
> [!IMPORTANT]
> **If you cannot extract the code of any components, motions, or designs directly from external links or registries, DO NOT GUESS OR HALLUCINATE the implementation.**  
> Simply state the exact name and URL of the component/motion to the user. The user will copy and paste the exact code directly into the chat so you can continue building.

### 2.3 Approved Agent Design & Development Skills Catalog
Install and invoke these skills when crafting UI/UX, animations, state architecture, and responsive designs:
```bash
# UI/UX & Design Taste
npx skills add nextlevelbuilder/ui-ux-pro-max-skill
npx skills add Leonxlnx/taste-skill
npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend
npx skills add anthropics/skills --skill frontend-design
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
npx skills add bergside/awesome-design-skills
npx skills add Appllama/appllama-skills
npx skills add nutlope/hallmark
npx skills add op7418/logo-generator-skill

# Motion & Animation Opportunities
npx skills add https://github.com/emilkowalski/skills --skill find-animation-opportunities

# React, Next.js & State Architecture
npx skills add wshobson/agents --skill react-state-management
npx skills add wshobson/agents --skill nextjs-app-router-patterns
npx skills add vercel-labs/agent-skills --skill react-best-practices
npx skills add wshobson/agents --skill modern-javascript-patterns

# Design Systems & Responsive Layouts
npx skills add wshobson/agents --skill design-system-patterns
npx skills add wshobson/agents --skill responsive-design
npx skills add wshobson/agents --skill tailwind-design-system
npx skills add wshobson/agents --skill accessibility-compliance

# Browser Testing & Tooling
npx skills add vercel-labs/agent-browser
npx skills add https://github.com/larksuite/cli --skill lark-doc
```

---

## 3. Official Documentation Allowlist

Before writing integration code for external protocols, consult the authoritative docs:
1. **Walrus Documentation:** `https://docs.wal.app/`
2. **Walrus Memory:** `https://docs.wal.app/walrus-memory`
3. **Walrus Skills Catalog:** `https://docs.wal.app/skills`
4. **Tatum Documentation:** `https://docs.tatum.io/`
5. **Tatum API Reference:** `https://docs.tatum.io/reference/welcome-to-the-tatum-api-reference`
6. **Tatum Storage API Reference:** `https://docs.tatum.io/reference/storage-api`
7. **Tatum Integration Skill:** `https://ai.tatum.io/integration-skill`  
   *(Install via: `npx skills add https://github.com/tatumio/tatum-integration-skill --skill tatum`)*
8. **Total Recall Hackathon Rules:** `https://tatum.io/hackathon/total-recall`

---

## 4. Architectural Boundaries (Modular Monolith)

Follow Clean Architecture and Ports-and-Adapters structure:
```text
src/
├── app/                  # Presentation: App Router pages, layouts, and route handlers
├── components/           # Presentation: Pure UI & feature components (Tailwind CSS, motion)
├── modules/
│   ├── finance/          # Domain: Pure Money, Transaction, Budget, and Savings entities & math
│   │   ├── domain/       # Zero external dependencies; unit tested in isolation
│   │   ├── application/  # Use cases, DTOs, and repository interfaces (ports)
│   │   └── infrastructure/# PostgreSQL repository implementations (adapters)
│   ├── financial-memory/ # Bounded Context: Walrus Memory integration & sync metadata
│   ├── assistant/        # Bounded Context: Minimal context assembly & prompt policy
│   └── on-chain-verification/ # Bounded Context: Tatum Sui RPC client & schema validation
└── lib/                  # Shared server configuration, validation, and utilities
```

### Dependency Flow:
- `Presentation` $\rightarrow$ `Application` $\rightarrow$ `Domain`
- `Infrastructure` implements `Application` ports.
- **Domain layer MUST NEVER import** React, Next.js, PostgreSQL drivers, Supabase, Walrus, Tatum, or LLM SDKs.

---

## 5. Security & Privacy Non-Negotiables

- **Server-Side Identity:** Resolve user identity exclusively from a verified Sui wallet signature and Memeora-owned server session. Never trust a `userId` or wallet address supplied in a request body or URL query as proof of identity.
- **Strict Server-Only Secrets:**
  - `DATABASE_URL`, migration database credentials, the wallet session signing key, `MEMWAL_KEY`, `TATUM_API_KEY`, and `LLM_API_KEY` must remain strictly server-side.
  - Never prefix these with `NEXT_PUBLIC_`.
  - Never commit `.env`, `.env.local`, or print secret values in terminal output, logs, or agent responses.
- **Data Isolation:** Enforce PostgreSQL Row-Level Security (RLS) on all user-owned tables. Use a least-privilege runtime role, force RLS, and set per-request wallet context transaction-locally from the verified session; normal application queries must not connect as a table owner or `BYPASSRLS` role.
- **Consent Before Memory:** Persistent memory operations in Walrus require explicit, recorded user consent.
- **Graceful Degradation:** An outage in Walrus, Tatum, or the LLM provider must **never** block local transaction entry, budget viewing, or core finance features.

---

## 6. Total Recall Hackathon Requirements

- **Track:** Consumer Finance Apps.
- **Walrus Memory:** Real integration writing on Mainnet with **at least 10 verified memories** stored before submission.
- **Tatum Integration:** Meaningful Tatum Sui RPC on-chain read, clearly explaining what the query verifies.
- **Public Deliverables:** Working live demo, public GitHub repository, and an explanatory blog post illustrating how Memeora learns over time.

---

## 7. Step-by-Step Task Execution Protocol for Agents

For every coding task, adhere to this sequence:
1. **Read Before Acting:** Review [rules.md](file:///c:/memora/rules.md), [memory.md](file:///c:/memora/memory.md), and relevant sections of [prd.md](file:///c:/memora/prd.md) and [architecture.md](file:///c:/memora/architecture.md). For every UI/UX task, open and read `@design.md` before changing UI files.
2. **Formulate a Vertical Slice:** Plan a single, cohesive vertical slice (Domain $\rightarrow$ Port $\rightarrow$ Adapter $\rightarrow$ UI).
3. **Execute & Test:**
   - Keep business logic in pure, testable functions.
   - Run `npm run typecheck`
   - Run `npm run lint`
   - Run `npm test`
4. **Update Memory:** Add a dated entry to [memory.md](file:///c:/memora/memory.md) matching the required template, reporting exact command results, truthful integration status (`NOT STARTED`, `CONFIGURED`, `TESTED`, `VERIFIED ON MAINNET`), and clear next steps.
5. **Report to User:** Summarize changes, files modified, test results, and next actions succinctly.
