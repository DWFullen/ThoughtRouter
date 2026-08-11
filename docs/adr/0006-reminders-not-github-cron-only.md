# ADR 0006: Reminder delivery not solely GitHub cron

## Decision
Model reminders in app storage and leave outbound delivery behind `OutboundChannel` + scheduler interfaces.

## Rationale
Time-critical reminders need durable workers/retries rather than only repo-scheduled jobs.
