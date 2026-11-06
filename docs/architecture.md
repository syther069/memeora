# Architecture

Memeora is a modular monolith built on Next.js. Business logic sits behind ports, so a provider can fail or change without affecting the core ledger.

## Layers

| Layer | Location | Responsibility |
|---|---|---|
| Presentation | `src/app`, `src/components` | Pages, API routes and interface components |
| Application | `src/modules/*/application` | Use cases and repository interfaces |
| Domain | `src/modules/*/domain` | Pure rules for money, budgets and proofs, with no external imports |
| Infrastructure | `src/modules/*/infrastructure` | PostgreSQL, Walrus Memory, Tatum and LLM adapters |

## Modules

| Module | Purpose |
|---|---|
| `finance` | Transactions, budgets, goals and exact calculations |
| `financial-memory` | Consent, per wallet accounts, and saving and recalling memories |
| `assistant` | Combines ledger results with recalled rules into an answer |
| `on-chain-verification` | Reads Sui Mainnet through Tatum and evaluates memory proofs |

## Asking the Assistant

1. The server resolves the wallet from its session, never from the request body.
2. The finance module calculates the answer from the ledger in integer minor units.
3. If memory is on, relevant rules are recalled from Walrus Memory.
4. The LLM may word the response, but it does not produce the figures.
5. If Walrus or the LLM is unavailable, the exact calculation is still returned.

## Saving a memory

1. The user turns memory on, and that consent is recorded.
2. The wallet creates its Walrus Memory account and approves a key for Memeora.
3. The rule is sent to Walrus as a background job and encrypted before storage.
4. Memeora records the job, then confirms the result on later requests.

## Verifying a memory

Through Tatum's Sui gRPC gateway, Memeora confirms that the blob is certified, owned by the account owner, in the wallet's namespace, and linked to the recorded job. The proof does not reveal or verify the encrypted text.
