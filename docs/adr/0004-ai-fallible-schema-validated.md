# ADR 0004: AI is fallible and schema-validated

## Decision
Treat AI as a classifier/router; validate structured output with Zod and fallback to Inbox on failure.

## Rationale
Prevents malformed output from corrupting workflow and preserves capture-first behavior.
