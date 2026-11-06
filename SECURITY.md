# Security Policy

## Reporting a vulnerability

Please do not open a public issue. Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/syther069/memora/security/advisories/new), with the steps to reproduce and the likely impact.

## Security model

- **Identity:** resolved only from a verified Sui wallet signature and a server session.
- **Data isolation:** PostgreSQL row level security is enabled and forced, under a least privilege runtime role.
- **Consent:** memory writes require a recorded choice by the user.
- **Keys:** each wallet's Walrus delegate key is encrypted at rest with AES-256-GCM.
- **Secrets:** all provider keys stay on the server and are never exposed to the browser.

Memeora has not had an independent security audit. It is not a bank or a licensed financial adviser, and it does not move funds.
