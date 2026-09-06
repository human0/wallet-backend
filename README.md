# Wallet Backend

A TypeScript/Fastify backend for the Sanlam RA Ventures wallet assessment.

The backend exposes wallet balance and withdrawal operations through a layered, test-driven design. See the companion `wallet-frontend` repository for a client that demonstrates the API.

## Local Development

Requirements:

- Node.js 24 LTS
- npm

```bash
npm install
npm run dev
```

The API listens on `http://127.0.0.1:3000`.

## Quality Commands

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

CI (`.github/workflows/ci.yml`) runs all five on every push and PR to `main`.

## API

```text
GET  /wallets/:walletId/balance
POST /wallets/:walletId/withdrawals
```

The seeded wallet is `wallet-001` with an initial balance of ZAR 1,000.00. Money is represented as integer minor units internally and decimal strings at the HTTP boundary.

```http
GET /wallets/wallet-001/balance
```

```json
{
  "walletId": "wallet-001",
  "currency": "ZAR",
  "balance": "1000.00"
}
```

```http
POST /wallets/wallet-001/withdrawals
Content-Type: application/json

{"amount":"250.00"}
```

```json
{
  "walletId": "wallet-001",
  "amount": "250.00",
  "remainingBalance": "750.00",
  "status": "completed"
}
```

Invalid amounts return `400`, unknown wallets return `404`, and insufficient funds return `409`.

Expected withdrawal behavior:

- Amount must be positive.
- Withdrawal succeeds only when sufficient funds exist.
- A wallet balance can never become negative.
- A successful withdrawal creates one withdrawal event.
- A failed withdrawal creates no withdrawal event.

## Architecture

The backend uses pragmatic layered architecture:

```text
HTTP adapter (Fastify)
        |
Application services and ports
        |
Domain rules and money value objects
        |
Infrastructure adapters (SQLite, outbox worker)
```

Domain code does not import Fastify, SQLite, or AWS SDKs. Application services depend on repository and event-publisher interfaces; infrastructure provides those implementations.

See [docs/architecture.md](docs/architecture.md) for the design guide, transaction boundary, event flow, and AWS production mapping.

## Event Mechanism

Successful withdrawals write a row into a `outbox_events` table in the same database transaction as the balance update (the transactional outbox pattern), so a committed balance change can never be silently missing its event. A background worker (`startOutboxWorker`, wired into `server.ts`) polls that table every 2 seconds and hands pending events to a sink - currently a log line, standing in for EventBridge/SNS in production.

```json
{
  "id": "event-id",
  "walletId": "wallet-001",
  "amountMinor": 25000,
  "currency": "ZAR",
  "occurredAt": "2026-09-06T12:00:00.000Z"
}
```

Delivery is at-least-once: a failed publish leaves the event pending and it is retried on the next poll, without blocking other pending events in the same batch. A production consumer must use the event ID as an idempotency key.

## Local vs. Production

SQLite keeps the app runnable with no Docker, native install, or cloud credentials required; it is not the proposed production database. Production would use PostgreSQL (RDS/Aurora) for row-level locking, concurrent writes, backups, and durability - see `docs/architecture.md` for the full AWS mapping (EventBridge/SNS/SQS).

## Assumptions

- A single seeded wallet (`wallet-001`, ZAR 1,000.00) is the entire dataset; no wallet-creation endpoint is provided, per the assessment brief.
- Withdrawal amounts are decimal strings with up to two fractional digits (`"250.00"`). Anything else - scientific notation, thousands separators, three or more decimal places - is rejected as invalid input rather than silently rounded or truncated.
- "Emit a withdrawal event" is satisfied by the transactional outbox plus a polling worker; no external message broker is required to run this locally, and the `EventSink` interface is the seam where one would be plugged in.
- No authentication or authorization on any request - explicitly out of scope per the assessment brief.

## Trade-offs

- **SQLite vs. PostgreSQL**: zero external setup vs. production-grade concurrency. SQLite's single-writer locking model does not reflect PostgreSQL's row-level `SELECT ... FOR UPDATE`, which is the actual production target (see `docs/architecture.md`).
- **Outbox worker logs instead of publishing**: no real broker is required to run this assessment locally. `EventSink` is a one-function interface so swapping in EventBridge/SNS is a small, isolated change, not a rewrite.
- **Integer minor units instead of a bignum/decimal library**: simpler and sufficient for ZAR's fixed two-decimal precision, at the cost of not generalizing to currencies with different fractional digits.
- **Interface segregation on `WalletReader`/`WalletRepository`**: `GetBalance` depends only on `findById`, not the full repository - a small deliberate choice to keep read-only use cases from depending on write capability they don't need.

## Known Limitations

- No idempotency key on withdrawal requests: a retried HTTP request (e.g. from a flaky client) performs a second withdrawal rather than being deduplicated.
- The outbox has no dead-letter queue or maximum retry count; a permanently failing sink retries the same event on every poll indefinitely.
- Concurrency safety (`tests/concurrency`) is proven only within a single Node process against SQLite's synchronous driver; it does not exercise true multi-process/multi-instance contention.
- No structured request tracing or correlation IDs across the API and the outbox worker.

## Potential Improvements

- Idempotency keys on withdrawal requests.
- PostgreSQL with row-level locking, proper migration tooling, and connection pooling.
- Outbox dead-letter handling and alerting after N failed publish attempts.
- OpenAPI schema generated from the existing zod validators.
- Structured logging with request correlation IDs, plus metrics and tracing.

See `docs/architecture.md`'s "Future Production Improvements" section for the full list, including authentication/authorization and an immutable transaction ledger.

## AI Usage

Built by Emmanuel using Claude Code as a directed pair-programming tool, following a red-green-refactor loop with every commit verified locally before being made. See [docs/ai-usage.md](docs/ai-usage.md) for the full account.

## Testing Standard

Each behavior starts with a failing test, followed by the smallest implementation, then a refactor while the tests stay green - visible directly in `git log`. Tests cover domain invariants, transaction rollback, outbox creation and retry, API contracts, and concurrent withdrawals.

## Scope

Included: one seeded wallet, balance retrieval, withdrawals, withdrawal events, an outbox worker, automated tests, and technical documentation.

Excluded: authentication, deposits, transfers, currency conversion, registration, wallet creation, request idempotency keys, and an immutable ledger.
