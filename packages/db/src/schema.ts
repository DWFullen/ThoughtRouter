import { jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const captures = pgTable('captures', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  channel: varchar('channel', { length: 32 }).notNull(),
  rawText: text('raw_text').notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  processingStatus: varchar('processing_status', { length: 16 }).notNull(),
  sourceMessageId: varchar('source_message_id', { length: 128 }),
  idempotencyKey: varchar('idempotency_key', { length: 512 }).notNull(),
  errorState: text('error_state')
});

export const candidates = pgTable('candidates', {
  id: varchar('id', { length: 64 }).primaryKey(),
  capturedMessageId: varchar('captured_message_id', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull()
});

export const workItems = pgTable('work_items', {
  id: varchar('id', { length: 64 }).primaryKey(),
  capturedMessageId: varchar('captured_message_id', { length: 64 }).notNull(),
  candidateItemId: varchar('candidate_item_id', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull()
});

export const syncRecords = pgTable('sync_records', {
  localWorkItemId: varchar('local_work_item_id', { length: 64 }).primaryKey(),
  payload: jsonb('payload').notNull()
});
