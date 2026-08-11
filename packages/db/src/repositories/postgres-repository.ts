import postgres from 'postgres';
import type { CandidateItem, CapturedMessage, ProjectSyncRecord, WorkItem, WorkItemRepository } from '@thoughtrouter/domain';

const toDate = (value: string | Date): Date => (value instanceof Date ? value : new Date(value));

export class PostgresWorkItemRepository implements WorkItemRepository {
  constructor(private readonly sql: postgres.Sql) {}

  static fromUrl(url: string) {
    return new PostgresWorkItemRepository(postgres(url));
  }

  async close() {
    await this.sql.end();
  }

  async findCaptureByIdempotencyKey(userId: string, key: string): Promise<CapturedMessage | null> {
    const rows = await this.sql<CapturedMessage[]>`SELECT id, user_id as "userId", channel, raw_text as "rawText", captured_at as "capturedAt", processing_status as "processingStatus", source_message_id as "sourceMessageId", idempotency_key as "idempotencyKey", error_state as "errorState" FROM captures WHERE user_id = ${userId} AND idempotency_key = ${key} LIMIT 1`;
    if (!rows[0]) return null;
    return { ...rows[0], capturedAt: toDate(rows[0].capturedAt) };
  }

  async createCapturedMessage(message: CapturedMessage): Promise<void> {
    await this.sql`INSERT INTO captures (id, user_id, channel, raw_text, captured_at, processing_status, source_message_id, idempotency_key, error_state) VALUES (${message.id}, ${message.userId}, ${message.channel}, ${message.rawText}, ${message.capturedAt.toISOString()}, ${message.processingStatus}, ${message.sourceMessageId ?? null}, ${message.idempotencyKey}, ${message.errorState ?? null})`;
  }

  async updateCapturedMessage(messageId: string, patch: Partial<CapturedMessage>): Promise<void> {
    const existing = await this.sql`SELECT * FROM captures WHERE id = ${messageId} LIMIT 1`;
    if (!existing[0]) return;
    const merged = {
      ...existing[0],
      processing_status: patch.processingStatus ?? existing[0].processing_status,
      error_state: patch.errorState ?? existing[0].error_state
    };
    await this.sql`UPDATE captures SET processing_status = ${merged.processing_status}, error_state = ${merged.error_state} WHERE id = ${messageId}`;
  }

  async createCandidateItems(items: CandidateItem[]): Promise<void> {
    for (const item of items) {
      await this.sql`INSERT INTO candidates (id, captured_message_id, payload) VALUES (${item.id}, ${item.capturedMessageId}, ${JSON.stringify(item)}::jsonb)`;
    }
  }

  async listCandidateItemsByCapture(captureId: string): Promise<CandidateItem[]> {
    const rows = await this.sql<Array<{ payload: CandidateItem }>>`SELECT payload FROM candidates WHERE captured_message_id = ${captureId}`;
    return rows.map((row) => ({
      ...row.payload,
      dueAt: row.payload.dueAt ? toDate(row.payload.dueAt) : null,
      dueWindowStart: row.payload.dueWindowStart ? toDate(row.payload.dueWindowStart) : null,
      dueWindowEnd: row.payload.dueWindowEnd ? toDate(row.payload.dueWindowEnd) : null
    }));
  }

  async updateCandidateItem(candidateId: string, patch: Partial<CandidateItem>): Promise<void> {
    const rows = await this.sql<Array<{ payload: CandidateItem }>>`SELECT payload FROM candidates WHERE id = ${candidateId} LIMIT 1`;
    if (!rows[0]) return;
    await this.sql`UPDATE candidates SET payload = ${JSON.stringify({ ...rows[0].payload, ...patch })}::jsonb WHERE id = ${candidateId}`;
  }

  async createWorkItems(items: WorkItem[]): Promise<void> {
    for (const item of items) {
      await this.sql`INSERT INTO work_items (id, captured_message_id, candidate_item_id, payload) VALUES (${item.id}, ${item.capturedMessageId}, ${item.candidateItemId}, ${JSON.stringify(item)}::jsonb)`;
    }
  }

  async listWorkItemsByCapture(captureId: string): Promise<WorkItem[]> {
    const rows = await this.sql<Array<{ payload: WorkItem }>>`SELECT payload FROM work_items WHERE captured_message_id = ${captureId}`;
    return rows.map((row) => ({
      ...row.payload,
      createdAt: toDate(row.payload.createdAt),
      dueAt: row.payload.dueAt ? toDate(row.payload.dueAt) : null,
      dueWindowStart: row.payload.dueWindowStart ? toDate(row.payload.dueWindowStart) : null,
      dueWindowEnd: row.payload.dueWindowEnd ? toDate(row.payload.dueWindowEnd) : null
    }));
  }

  async createSyncRecords(records: ProjectSyncRecord[]): Promise<void> {
    for (const record of records) {
      await this.sql`INSERT INTO sync_records (local_work_item_id, payload) VALUES (${record.localWorkItemId}, ${JSON.stringify(record)}::jsonb) ON CONFLICT (local_work_item_id) DO UPDATE SET payload = EXCLUDED.payload`;
    }
  }

  async updateSyncRecord(localWorkItemId: string, patch: Partial<ProjectSyncRecord>): Promise<void> {
    const rows = await this.sql<Array<{ payload: ProjectSyncRecord }>>`SELECT payload FROM sync_records WHERE local_work_item_id = ${localWorkItemId} LIMIT 1`;
    if (!rows[0]) return;
    await this.sql`UPDATE sync_records SET payload = ${JSON.stringify({ ...rows[0].payload, ...patch })}::jsonb WHERE local_work_item_id = ${localWorkItemId}`;
  }

  async getLatestCaptureForUser(userId: string): Promise<CapturedMessage | null> {
    const rows = await this.sql<CapturedMessage[]>`SELECT id, user_id as "userId", channel, raw_text as "rawText", captured_at as "capturedAt", processing_status as "processingStatus", source_message_id as "sourceMessageId", idempotency_key as "idempotencyKey", error_state as "errorState" FROM captures WHERE user_id = ${userId} ORDER BY captured_at DESC LIMIT 1`;
    if (!rows[0]) return null;
    return { ...rows[0], capturedAt: toDate(rows[0].capturedAt) };
  }

  async deleteCaptureCascade(captureId: string): Promise<void> {
    const workRows = await this.sql<Array<{ id: string }>>`SELECT id FROM work_items WHERE captured_message_id = ${captureId}`;
    for (const row of workRows) {
      await this.sql`DELETE FROM sync_records WHERE local_work_item_id = ${row.id}`;
    }
    await this.sql`DELETE FROM work_items WHERE captured_message_id = ${captureId}`;
    await this.sql`DELETE FROM candidates WHERE captured_message_id = ${captureId}`;
    await this.sql`DELETE FROM captures WHERE id = ${captureId}`;
  }

  async listHistory(userId: string): Promise<Array<{ capture: CapturedMessage; candidates: CandidateItem[]; workItems: WorkItem[] }>> {
    const captures = await this.sql<CapturedMessage[]>`SELECT id, user_id as "userId", channel, raw_text as "rawText", captured_at as "capturedAt", processing_status as "processingStatus", source_message_id as "sourceMessageId", idempotency_key as "idempotencyKey", error_state as "errorState" FROM captures WHERE user_id = ${userId} ORDER BY captured_at DESC`;
    const results: Array<{ capture: CapturedMessage; candidates: CandidateItem[]; workItems: WorkItem[] }> = [];
    for (const capture of captures) {
      results.push({
        capture: { ...capture, capturedAt: toDate(capture.capturedAt) },
        candidates: await this.listCandidateItemsByCapture(capture.id),
        workItems: await this.listWorkItemsByCapture(capture.id)
      });
    }
    return results;
  }
}
