# Wallet Backend

A TypeScript/Fastify backend for the wallet assessment. See [wallet-frontend](https://github.com/human0/wallet-frontend) for the client.

## Run it

```bash
npm install
npm run dev
```

API listens on `http://127.0.0.1:3000`.

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Same five run in CI on every push/PR.

## API

```text
GET  /wallets/:walletId/balance
POST /wallets/:walletId/withdrawals
```

Seeded wallet: `wallet-001`, ZAR 1,000.00. Money is integer minor units internally, decimal strings at the HTTP boundary.

```text
GET /wallets/wallet-001/balance
-> {"walletId":"wallet-001","currency":"ZAR","balance":"1000.00"}

POST /wallets/wallet-001/withdrawals {"amount":"250.00"}
-> {"walletId":"wallet-001","amount":"250.00","remainingBalance":"750.00","status":"completed"}
```

`400` invalid amount, `404` unknown wallet, `409` insufficient funds. A withdrawal must be positive, can't exceed the balance, and never creates an event on failure.

## Architecture

```text
HTTP (Fastify) -> Application (use cases, ports) -> Domain (money, wallet rules)
                                                   -> Infrastructure (SQLite, outbox worker)
```

Domain has no framework dependencies; application depends on interfaces, not SQLite directly. See [docs/architecture.md](docs/architecture.md).

## Event Mechanism

A withdrawal writes an outbox row in the same DB transaction as the balance update. A background worker polls it every 2s and hands events to a sink (currently a log line, standing in for EventBridge/SNS). Delivery is at-least-once; failures stay pending and retry without blocking the rest of the batch.

## Assumptions

- One seeded wallet, no wallet-creation endpoint.
- Amounts are decimal strings with up to two fractional digits; anything else is rejected.
- No auth - out of scope per the brief.

## Trade-offs

- SQLite over PostgreSQL: zero setup, but not the production concurrency target (see `docs/architecture.md`).
- Outbox logs instead of publishing to a real broker; `EventSink` is a one-function seam to swap in EventBridge/SNS later.
- Integer minor units instead of a bignum library - simple and sufficient for ZAR.
- `GetBalance` depends only on `WalletReader`, not the full repository.
- Two repos instead of a monorepo, to keep backend CI free of frontend churn.

## Limitations

- No idempotency key on withdrawal requests.
- Outbox has no dead-letter queue or retry cap.
- Concurrency safety (`tests/concurrency`) is proven single-process only.

## Possible Improvements

- Idempotency keys, PostgreSQL row locking, outbox dead-lettering.
- OpenAPI schema from the existing zod validators.
- Structured logging with correlation IDs.

See `docs/architecture.md` for the full list.

## AI Usage

Development workflow was supported by AI assistent - Claude via VS Code.
See `docs/ai-usage.md` for more details.

## Testing

Domain invariants, transaction rollback, outbox creation/retry, API contracts, concurrent withdrawals - visible directly in `git log`.

## Scope

Included: one wallet, balance, withdrawals, events, outbox worker, tests, docs.
Excluded: auth, deposits, transfers, currency conversion, wallet creation, idempotency keys, an immutable ledger.
