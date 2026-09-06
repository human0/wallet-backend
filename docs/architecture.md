# Backend Architecture and Design Guide

## Design Goals

This is a small runnable assessment slice, not an attempt to implement a complete banking ledger.

Primary invariants:

1. A withdrawal amount is positive.
2. A withdrawal never makes the wallet balance negative.
3. A successful withdrawal changes the balance exactly once.
4. A successful withdrawal creates exactly one outbox event in the same transaction.
5. Failed withdrawals do not create withdrawal events.

## Layers

### Domain

Framework-independent rules for money, wallet state, and withdrawal decisions. Money uses integer minor units with a fixed ZAR currency assumption.

### Application

Use cases such as `GetBalance` and `WithdrawFunds`. This layer coordinates repositories and the transaction boundary through interfaces.

### Infrastructure

SQLite migrations, repositories, transaction handling, outbox persistence, and the background publisher. These adapters can later be replaced with PostgreSQL and an AWS event transport.

### HTTP

Fastify route registration, request validation, response mapping, and error-to-status translation. HTTP handlers do not contain accounting rules.

## Withdrawal Sequence

```mermaid
sequenceDiagram
    participant Client
    participant API as Fastify API
    participant App as Withdrawal service
    participant DB as Relational database
    participant Worker as Outbox worker
    participant Bus as Production event bus

    Client->>API: POST withdrawal
    API->>App: Validate command
    App->>DB: Begin transaction
    App->>DB: Lock/read wallet
    DB-->>App: Current balance
    App->>DB: Update balance
    App->>DB: Insert outbox event
    App->>DB: Commit transaction
    DB-->>App: Committed
    App-->>API: Withdrawal result
    API-->>Client: Success response
    Worker->>DB: Claim pending outbox event
    Worker->>Bus: Publish withdrawal event
    Worker->>DB: Mark published or schedule retry
```

## Transaction and Concurrency

The production PostgreSQL implementation would lock the wallet row with `SELECT ... FOR UPDATE` before checking and changing the balance. This serializes competing withdrawals for the same wallet. A database check constraint also protects the non-negative balance invariant.

SQLite is used locally only to avoid external setup. Its locking model is documented as a local limitation; PostgreSQL is the production concurrency target.

## Transactional Outbox

The balance update and outbox insert must share one transaction. This prevents a committed balance change from being silently separated from its event record.

The publisher is at-least-once. A crash after publishing but before marking the outbox row published can produce a duplicate. Consumers therefore use the event ID as an idempotency key.

The local withdrawal event contains the event ID, wallet ID, amount in minor units, currency, and occurrence timestamp. Events remain pending when the configured sink fails and can be retried by the worker.

## Local Data Model

```mermaid
erDiagram
     WALLETS ||--o{ OUTBOX_EVENTS : produces
     WALLETS {
          text id PK
          text currency
          integer balance_minor
     }
     OUTBOX_EVENTS {
          text id PK
          text wallet_id FK
          integer amount_minor
          text currency
          text occurred_at
          text published_at
     }
```

## AWS Production Mapping

```text
API service
  -> PostgreSQL on RDS/Aurora
       - wallet update
       - outbox insert
  -> outbox publisher
       -> EventBridge or SNS
            -> SQS queue per consumer
                 -> Lambda or ECS consumer
```

- **EventBridge:** managed event bus and routing rules for event types and AWS integrations.
- **SNS:** straightforward fan-out when multiple subscribers should receive the same event.
- **SQS:** durable consumer buffering, back-pressure, retries, visibility timeout, and dead-letter queues.

The assessment does not require all three locally. The outbox and worker test the consistency and failure contracts without requiring a cloud account or emulator.

## Future Production Improvements

- Idempotency keys on withdrawal requests.
- Immutable wallet transaction ledger and reconciliation.
- Authentication and authorization.
- PostgreSQL row locking and migration tooling.
- Structured logs, metrics, tracing, and alarms.
- Encryption, secrets management, and operational runbooks.
- Consumer deduplication and dead-letter remediation.
