# Memeora — Project Rules (A–Z)

**Purpose:** Mandatory operating rules for every human developer and AI coding agent working on Memeora.  
**Priority:** This file is binding alongside `prd.md`, `architecture.md`, and `memory.md`.  
**Project approach:** Greenfield implementation. Build Memeora from scratch; do not copy Clario's source code.

---

## 0. The Non-Negotiable Rule

Before implementing, changing, debugging, or reviewing anything related to Walrus, Walrus Memory, Tatum, Tatum Storage APIs, or the hackathon, consult the official resources listed below. Re-check them whenever an API, SDK, endpoint, network, schema, or requirement may have changed.

Do not rely on model memory, old snippets, random blog posts, or unverified code for these integrations. If an official resource does not answer a question, say so, inspect the official linked reference/source repository if available, or ask for clarification. Never invent the missing API behavior.

## 1. Authoritative Documentation Allowlist

For Walrus and Tatum integration work, use these resources as the primary and required documentation sources:

1. Walrus documentation: https://docs.wal.app/
2. Walrus Memory: https://docs.wal.app/walrus-memory
3. Walrus agent skills: https://docs.wal.app/skills
4. Tatum documentation: https://docs.tatum.io/
5. Tatum API reference: https://docs.tatum.io/reference/welcome-to-the-tatum-api-reference
6. Tatum Storage API reference: https://docs.tatum.io/reference/storage-api
7. Tatum integration skill: https://ai.tatum.io/integration-skill
8. Total Recall hackathon page and its linked official event rules: https://tatum.io/hackathon/total-recall

The hackathon page may redirect to the current event microsite. Follow that official redirect to read the latest track, submission, judging, timeline, and event-rule details.

### Documentation rules

- Open the relevant official docs before writing integration code.
- Use the exact SDK/API version, network, endpoint, authentication method, parameter names, and response schema documented for the selected flow.
- Prefer current, non-deprecated endpoints. Verify deprecation status.
- Use Tatum's API reference for the exact API contract; use the Tatum integration skill to help implement it, not as a replacement for validating its output against the API reference.
- Use Walrus Memory documentation for persistent memory operations. Do not confuse Walrus Memory with ordinary Walrus blob storage.
- Use the Walrus skills catalog to identify the relevant official skill. Install and invoke it through the project's supported coding-agent CLI when appropriate.
- If official docs conflict, identify the conflict, determine which page/version is current, and document the resolution in `memory.md`. Do not silently choose.
- If a required official URL is unavailable, record the URL, date, error/limitation, and next action in `memory.md`. Do not silently substitute a third-party tutorial.
- Other sources may be used for general engineering knowledge only when needed; they must not override the listed official documentation for Walrus/Tatum behavior or hackathon rules.
- Re-check all time-sensitive event details immediately before submission.

## 2. Required Project Files

Keep these files in the project root and read them before major work:

- `prd.md` — what Memeora must do; product requirements and acceptance criteria.
- `architecture.md` — how the application is structured; boundaries, dependencies, and data flows.
- `rules.md` — mandatory engineering, documentation, security, and hackathon rules.
- `memory.md` — current project state, decisions, experiments, evidence, blockers, and next steps.
- `README.md` — setup instructions, architecture overview, environment variables, test commands, and demo instructions.
- `.env.example` — variable names and placeholders only; never real credentials.

If a file does not exist yet, create it as part of the relevant setup task. Do not delete or overwrite these files without an explicit request.
also follow design.md for evry Ui/ux related changes and tasks.

## 3. Read Before You Act

At the beginning of every new implementation task:

1. Read `rules.md`.
2. Read relevant parts of `prd.md` and `architecture.md`.
3. Read the latest `memory.md` entries and current blockers.
4. Inspect the repository, package scripts, installed dependency versions, and tests before changing code.
5. Consult the relevant official documentation for any external API/SDK work.
6. Make a small plan and implement one coherent vertical slice.
7. Run relevant checks and record truthful results in `memory.md`.

Do not assume previous agent work is correct merely because it is documented. Verify it in code and tests.

## 4. Greenfield and Scope Rules

- Build Memeora as a new project from scratch.
- Do not copy Clario code, branding, assets, proprietary implementation, or repository history.
- Use `prd.md` as the product source of truth and `architecture.md` as the technical design guide.
- Use a modular monolith unless a documented, measured need justifies another architecture.
- Do not introduce microservices, event sourcing, CQRS, message brokers, or complex frameworks without a clear requirement.
- Do not generate the entire application in one unreviewed change.
- Implement P0/MVP requirements before optional P1/P2 features.
- Do not add dependencies just because they are fashionable. Explain meaningful new dependencies in the change summary.
- Do not add dead buttons, fake charts, decorative integrations, or placeholder functionality presented as complete.
- Ask before destructive operations, database resets, deletion of real data, or major architecture changes.

## 5. Architecture and Code Quality Rules

- Use TypeScript strict mode.
- Follow Clean Architecture and ports-and-adapters boundaries from `architecture.md`.
- Keep financial domain logic independent of Next.js, React, PostgreSQL drivers, Supabase, Walrus, Tatum, and LLM SDKs.
- Keep provider-specific request/response objects inside adapter modules.
- Keep business rules out of large React components, prompts, and route handlers.
- Validate untrusted data at runtime at every API boundary.
- Prefer small, readable, typed functions over monolithic files.
- Avoid circular dependencies and unnecessary abstractions.
- Use consistent naming, formatting, and error types.
- Do not suppress TypeScript, lint, or test failures merely to obtain a green build.
- Never leave `TODO`, `throw new Error("not implemented")`, mocked data, or hard-coded success in a required production path without clearly marking it incomplete.
- Update the README when setup, architecture, commands, or environment variables change.

## 6. Financial Correctness Rules

- The database is the canonical source of truth for transactions, budgets, and savings goals.
- Calculate authoritative financial figures with deterministic application code.
- Never rely on an LLM to produce authoritative arithmetic or transaction totals.
- Use integer minor units or an exact decimal representation; avoid binary floating-point arithmetic for authoritative money values.
- Always track currency explicitly and reject unsupported cross-currency arithmetic unless conversion logic is intentionally implemented and documented.
- Define timezones and inclusive/exclusive period boundaries consistently.
- Prevent duplicate counting, including transfers and edited/deleted transactions.
- Explain assumptions in purchase-affordability scenarios.
- Distinguish “fits the recorded budget” from “financially advisable.”
- Never fabricate income, expenses, bank balances, savings progress, or transaction history.
- Add tests for empty periods, boundaries, rounding, negative net cash flow, edits, deletions, and malformed inputs.

## 7. Walrus and Walrus Memory Rules

- Read the current official docs before implementation:
  - https://docs.wal.app/
  - https://docs.wal.app/walrus-memory
  - https://docs.wal.app/skills
- Identify and use the current supported Walrus Memory SDK/API for the selected stack.
- Check the official Walrus skills catalog for relevant skills. Install a skill only through the supported CLI and inspect what it changes.
- Do not invent SDK method names, job fields, configuration variables, deletion guarantees, namespace behavior, or memory result shapes.
- Verify memory account, delegate-key, namespace, relayer, permissions, and network setup from current docs.
- Use a dedicated project memory account/delegate setup; never reuse someone else's credentials or shared example IDs.
- Keep delegate private keys on the server. Never expose them through `NEXT_PUBLIC_*`, client bundles, browser requests, logs, screenshots, or commits.
- Obtain explicit user consent before enabling persistent personal memory.
- Scope memory access to the correct user/account according to the documented ownership and permission model. A namespace alone must not be treated as authorization.
- Do not store passwords, seed phrases, API keys, bank credentials, payment-card secrets, or unnecessary raw sensitive financial records as memories.
- Store compact, useful, user-approved goals/preferences; do not store every transaction as a long-term memory.
- Treat recalled memory as context, not canonical financial truth. Current database state wins when values conflict.
- Handle stale, duplicated, irrelevant, malicious, and conflicting memories safely.
- Verify the actual provider job completion before displaying “stored,” “synced,” or “success.”
- Implement and test the supported recall, update/supersede, restore, and deletion lifecycle as applicable. Do not promise deletion semantics beyond what the current official docs guarantee.
- Clearly distinguish ordinary Walrus blob storage from Walrus Memory.
- Do not put private, sensitive raw documents into public/unprotected storage. Use the current official privacy/encryption guidance for the selected storage mode.
- If a memory operation fails, preserve valid finance database changes, mark sync state accurately, and provide a safe retry path.
- Record genuine memory operations and evidence in `memory.md`; never fabricate memory counts.

## 8. Tatum and Tatum Storage API Rules

- Read the current official docs before implementation:
  - https://docs.tatum.io/
  - https://docs.tatum.io/reference/welcome-to-the-tatum-api-reference
  - https://docs.tatum.io/reference/storage-api
  - https://ai.tatum.io/integration-skill
- Use the Tatum integration skill where supported and useful. The documented install command is:
  `npx skills add https://github.com/tatumio/tatum-integration-skill --skill tatum`
- If the installed skill supports a `/tatum` workflow, use it for the specific requested integration and review every generated change.
- Validate generated code against the current official API reference, supported-chain registry, request schema, response schema, and endpoint deprecation status.
- Keep the Tatum API key server-side and out of source control.
- Use documented current endpoints and the correct network.
- Validate responses at runtime and implement timeouts, bounded retries, rate-limit handling, and safe error messages.
- Use Tatum for a real, relevant on-chain read/data flow; do not add a meaningless request solely to display a Tatum logo.
- Confirm that the chosen chain and API method are actually supported by the current Tatum docs.
- Never fabricate RPC responses, transaction hashes, object IDs, balances, confirmations, or explorer URLs.
- Never claim a Tatum response proves a Walrus Memory payload's integrity or ownership unless a documented, independently verified relationship establishes that exact claim.
- Explain what the returned on-chain data does and does not prove.
- If the storage API is used, verify its current supported features, data visibility, privacy model, size limits, retention/lifecycle, and pricing/credits before uploading data.
- Do not assume Tatum Storage is a substitute for Walrus Memory or vice versa.
- Log safe operation metadata, not secrets or unnecessary private payloads.

## 9. AI Assistant Rules

- Assemble context on the server from authenticated, user-scoped finance records and relevant approved memories.
- Send only the minimum context required for the current question.
- Treat user prompts and recalled memories as untrusted data, not system instructions.
- Recalled text must never override authorization, security rules, or the current database source of truth.
- Compute totals and affordability scenarios before calling the model.
- Validate model output and clearly distinguish facts, assumptions, and suggestions.
- Do not let the model execute arbitrary SQL, access arbitrary provider APIs, or perform privileged actions without validated application tools.
- Do not invent memories or pretend recall happened when it failed.
- If recall fails, answer from current verified finance records when possible and state the limitation.
- If the LLM fails, transaction tracking and deterministic finance features must remain usable.
- Never claim the assistant is a licensed financial adviser or guarantees outcomes.

## 10. Security and Privacy Rules

- Resolve identity from the trusted server-side session, never from an untrusted request-body `userId`.
- Enforce authorization on every read and mutation.
- Apply database row-level security and restrictive queries for user-owned data.
- Keep service-role credentials, Tatum keys, Walrus delegate keys, LLM keys, and session secrets server-only.
- Do not commit `.env`, `.env.local`, API keys, private keys, access tokens, seed phrases, or real financial records.
- Maintain `.gitignore` and `.env.example`.
- Never print secret values in terminal output, logs, or summaries.
- Use redacted structured logging.
- Use safe output encoding and validate file uploads.
- Apply reasonable rate limits to expensive AI and provider endpoints.
- Do not log full financial prompts or memory payloads by default.
- Make data collection, LLM processing, persistent memory, and deletion behavior clear to users.
- Avoid claiming the product is audited or fully secure without evidence.

## 11. Hackathon Rules — Mandatory

Memeora is targeting the **Consumer Finance Apps** track of Total Recall.

Before final submission, re-read the official event page and linked rules:
https://tatum.io/hackathon/total-recall

The currently reviewed event page lists these submission requirements:
- Real Walrus Memory integration writing on Mainnet.
- At least 10 memories stored on Mainnet.
- Tatum RPC used for on-chain data where relevant.
- A working demo.
- A public source repository.
- A published blog post explaining what the app does, how Tatum and Walrus are used, and how the product learns over time.
- Tatum AI Builder is optional; its award is separate from the track prizes.

Currently reviewed judging weights:
- 30% — Walrus and Tatum integration.
- 30% — Technical quality, including clean code and successful Tatum Sui RPC integration.
- 20% — Creativity.
- 20% — Presentation, documentation, and working demo.

The event page currently lists these special awards:
- Best Walrus Memory — $500.
- Best Tatum AI Builder app — $500.
- Best Use of Agent Payments — $500 (x402 or MPP settled on Sui).

**These details can change.** Re-check the live official page and official event rules before relying on awards, eligibility, deadline, required network, or submission fields. Record the date checked and any change in `memory.md`.

### Hackathon compliance rules

- Build for Consumer Finance Apps; explain the consumer-finance value clearly in the demo and README.
- Demonstrate a real learning loop: a stored memory changes later product behavior in a visible, reproducible way.
- Complete at least 10 real Mainnet memory writes; retain truthful evidence.
- Do not count local mocks, staging writes, failed jobs, or hard-coded entries as Mainnet memories.
- Use Tatum Sui RPC in a meaningful way where required/relevant and demonstrate a real successful response.
- Do not overstate what the RPC response proves.
- Publish a working demo and public repository.
- Publish the explanatory blog post before the deadline.
- Prepare a clear demo walkthrough and a fallback recording, without pretending a recording proves a live service is currently healthy.
- Optional bonus tracks must not distract from P0 track requirements.
- Do not claim eligibility, prize qualification, or judging success without evidence.
- Before submission, verify the current deadline and timezone from the official page.

## 12. Testing and Verification Rules

For each feature:
- Add unit tests for domain rules.
- Add application/use-case tests using fake or in-memory ports.
- Add adapter tests for valid, invalid, timeout, and provider-error responses.
- Add end-to-end coverage for critical user journeys.
- Test user isolation using at least two separate test accounts.
- Test degraded states when Walrus, Tatum, database, or LLM is unavailable.
- Do not require live Mainnet calls for every CI run; use mocks in normal CI and separately document live verification.
- Run the actual repository scripts for lint, typecheck, tests, and production build.
- Report the exact commands run and their actual results.
- Never state “all tests pass” if tests were skipped, not run, or failed.
- Never state an integration works based solely on typechecking or mocked tests.

## 13. External API and Dependency Rules

- Check official docs and package release notes before adding/upgrading an integration dependency.
- Pin compatible versions through the package manager and commit the lockfile.
- Use current supported API versions; avoid deprecated endpoints.
- Validate external JSON at runtime; TypeScript interfaces alone are not runtime validation.
- Set bounded timeouts and retries. Do not retry non-idempotent writes blindly.
- Handle rate limits and quota exhaustion.
- Avoid logging full provider responses if they may contain personal data.
- Record endpoint/method, network, SDK version, test status, and relevant official reference in `memory.md`.
- Do not assume API behavior from the name of an endpoint or a previous implementation.

## 14. Git and Change Management Rules

- Use small, focused commits where practical.
- Never commit secrets, credentials, generated personal data, or production database dumps.
- Do not force-push, delete branches, reset databases, or overwrite user work without explicit approval.
- Inspect `git diff` before declaring a change complete.
- Do not claim a file was created, installed, deployed, or committed unless that action actually succeeded.
- Keep generated artifacts and build output out of source control unless intentionally required.
- If a migration changes the schema, include a migration and update related types/tests/docs.
- If behavior changes, update acceptance criteria/checklists and README where appropriate.

## 15. Accessibility and UX Rules

- Build responsive layouts for mobile, tablet, and desktop.
- Use semantic HTML, keyboard-accessible controls, visible focus, and adequate contrast.
- Respect reduced-motion settings.
- Provide useful loading, empty, success, and error states.
- Format currency and dates consistently.
- Never show sample values as real user data.
- Every visible control must perform its advertised action or be clearly disabled.
- Explain integration status in plain language instead of unexplained blockchain jargon.
- Do not use fake verified badges, fake live indicators, or invented explorer links.

### Design, Motion, and Component Sourcing Rules
- **Approved Design & Motion Resources**:
  - Components: https://ui.watermelon.sh/components
  - Motion & Micro-animations: https://motion-primitives.com/docs
  - Motion & Animated Components: https://skiper-ui.com/components
  - Gradients: https://feralui.dev/gradients
  - Design Tokens & Studio: https://pryzm.design/studio
  - Frontend Skills Registry: https://skill-issue.in/?domain=frontend
  - 21st MCP: https://21st.dev/mcp (API key available from user upon request)
- **Component Extraction Fallback (Mandatory Note)**:
  - If you cannot extract the code of any components, motions, or designs from external registries or web pages, do not guess, approximate, or hallucinate the implementation. Tell the user the exact name and link to the component, and the user will paste the code directly so you can continue.

## 16. `memory.md` — Required Living Project Log

`memory.md` is the persistent project handoff for future AI agents. Update it after every meaningful work session, implementation milestone, architecture decision, dependency change, integration test, blocker, or hackathon compliance check.

Each update must include:
- Date (ISO format, with timezone when relevant).
- What was attempted and why.
- Files created/changed.
- Official documentation URLs consulted.
- Decisions made and reasons.
- Commands/tests run and their real results.
- External integrations: configured / mocked / tested / verified on Mainnet — use precise status labels.
- Actual evidence or a reference to where evidence is stored (never credentials).
- Remaining issues, blockers, assumptions, and next actions.
- Any change to hackathon requirements or deadline.

### Memory hygiene

- Keep a concise current-state summary at the top.
- Maintain an append-only chronological work log below it; correct mistakes with a dated correction rather than silently rewriting history.
- Do not record API keys, private keys, seed phrases, passwords, session tokens, personal financial details, or raw private payloads.
- Do not state an unverified assumption as a fact.
- Mark items explicitly as `NOT STARTED`, `IN PROGRESS`, `MOCKED`, `CONFIGURED`, `TESTED`, or `VERIFIED ON MAINNET` as appropriate.
- A successful mock test is not a live integration test.
- A successful staging call is not a Mainnet write.
- A local memory entry is not a Walrus Memory Mainnet entry.
- If no work was performed on an item, do not mark it complete.
- Read `memory.md` at the beginning of a task and update it before ending the task.
- If a persistent memory file or tool is unavailable, state that limitation; do not claim persistence occurred elsewhere.

### Required `memory.md` entry template

```md
## YYYY-MM-DD — Short task title

**Status:** NOT STARTED | IN PROGRESS | MOCKED | CONFIGURED | TESTED | VERIFIED ON MAINNET

### Goal
- What this task was meant to accomplish.

### Changes
- Files created or modified.

### Official resources consulted
- URL — what was checked and why.

### Verification
- Command/test: exact result.
- Provider/network: exact status; no inferred success.

### Decisions
- Decision and reason, or “None”.

### Blockers and risks
- Current issue or “None known”.

### Next actions
- Concrete next steps.
```

## 17. Completion Report Format

At the end of each task, report:
1. Summary of the change.
2. Files changed.
3. Tests and commands actually run.
4. Actual results, including failures.
5. Required manual setup.
6. What is real, mocked, configured, and still unverified.
7. `memory.md` update performed.
8. Next recommended task.

Keep the report concise but complete. Never conceal failures or claim work that was not performed.

## 18. When Instructions Conflict

Resolve conflicts in this order:
1. User safety, privacy, and security.
2. Correctness and current official provider/hackathon requirements.
3. `prd.md` product requirements.
4. `architecture.md` structural guidance.
5. This file's engineering conventions.
6. Convenience or cosmetic preferences.

If a conflict materially changes the implementation, stop and explain it. Do not quietly bypass the rules.

## 19. Final Pre-Submission Checklist

- [ ] Re-read the official Total Recall page and linked event rules.
- [ ] Confirm Consumer Finance Apps track selection.
- [ ] Confirm all deadline and timezone details.
- [ ] Confirm Walrus Memory is configured for Mainnet.
- [ ] Verify at least 10 genuine Mainnet memory writes and retain evidence.
- [ ] Demonstrate memory recall and a visible behavior change.
- [ ] Verify the Tatum Sui RPC flow using the current official API contract.
- [ ] Confirm no secrets or private user data are exposed.
- [ ] Run lint, typecheck, tests, and production build; record exact results.
- [ ] Test the critical flow and external-service failure states.
- [ ] Publish the working demo and public repository.
- [ ] Publish the explanatory blog post.
- [ ] Update README and `memory.md`.
- [ ] Remove or label demo data; remove fake success states.
- [ ] Disclose anything still mocked or unverified.

---

**Final directive to every coding agent:** Follow `rules.md`, `prd.md`, `architecture.md`, and `memory.md` together. Consult the listed official Walrus/Tatum/hackathon resources before relevant work. Prefer a smaller, verified implementation over a larger, untested one. Truthful evidence beats confident claims.
