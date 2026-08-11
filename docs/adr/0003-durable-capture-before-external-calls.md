# ADR 0003: Durable capture before external calls

## Decision
Persist `CapturedMessage` before AI or GitHub operations.

## Rationale
Prevents data loss during provider outages and supports retries/idempotency.
