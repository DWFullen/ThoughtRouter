# ADR 0002: Provider/port architecture

## Decision
Domain depends on ports (`ThoughtInterpreter`, `ProjectSystem`, repositories, scheduler/channel interfaces), not provider SDKs.

## Rationale
Allows GitHub/AI/channel substitution without rewriting domain logic.
