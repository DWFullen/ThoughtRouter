import { describe, expect, it } from 'vitest';
import { CaptureService } from '../src/use-cases/capture-service.js';
import type { CaptureSettings, Clock, IdGenerator, ProjectSystem, ThoughtInterpreter, WorkItemRepository } from '../src/ports/index.js';
import type { CandidateItem, CapturedMessage, ProjectSyncRecord, WorkItem } from '../src/types.js';

class InMemoryRepo implements WorkItemRepository {
  captures: CapturedMessage[] = [];
  candidates: CandidateItem[] = [];
  workItems: WorkItem[] = [];
  syncs: ProjectSyncRecord[] = [];
  async findCaptureByIdempotencyKey(userId: string, key: string) { return this.captures.find((c) => c.userId === userId && c.idempotencyKey === key) ?? null; }
  async createCapturedMessage(message: CapturedMessage) { this.captures.push(message); }
  async updateCapturedMessage(messageId: string, patch: Partial<CapturedMessage>) { Object.assign(this.captures.find((c) => c.id === messageId)!, patch); }
  async createCandidateItems(items: CandidateItem[]) { this.candidates.push(...items); }
  async listCandidateItemsByCapture(captureId: string) { return this.candidates.filter((c) => c.capturedMessageId === captureId); }
  async updateCandidateItem(candidateId: string, patch: Partial<CandidateItem>) { Object.assign(this.candidates.find((c) => c.id === candidateId)!, patch); }
  async createWorkItems(items: WorkItem[]) { this.workItems.push(...items); }
  async listWorkItemsByCapture(captureId: string) { return this.workItems.filter((c) => c.capturedMessageId === captureId); }
  async createSyncRecords(records: ProjectSyncRecord[]) { this.syncs.push(...records); }
  async updateSyncRecord(localWorkItemId: string, patch: Partial<ProjectSyncRecord>) { Object.assign(this.syncs.find((s) => s.localWorkItemId === localWorkItemId)!, patch); }
  async getLatestCaptureForUser(userId: string) { return this.captures.filter((c) => c.userId === userId).at(-1) ?? null; }
  async deleteCaptureCascade(captureId: string) {
    this.captures = this.captures.filter((c) => c.id !== captureId);
    this.candidates = this.candidates.filter((c) => c.capturedMessageId !== captureId);
    const workIds = this.workItems.filter((w) => w.capturedMessageId === captureId).map((w) => w.id);
    this.workItems = this.workItems.filter((w) => w.capturedMessageId !== captureId);
    this.syncs = this.syncs.filter((s) => !workIds.includes(s.localWorkItemId));
  }
  async listHistory(userId: string) {
    return this.captures.filter((c) => c.userId === userId).map((capture) => ({
      capture,
      candidates: this.candidates.filter((c) => c.capturedMessageId === capture.id),
      workItems: this.workItems.filter((w) => w.capturedMessageId === capture.id)
    }));
  }
}

const clock: Clock = { now: () => new Date('2026-01-01T00:00:00.000Z') };
let i = 0;
const ids: IdGenerator = { next: (prefix) => `${prefix}-${++i}` };
const settings: CaptureSettings = { areas: ['Home', 'Business'], contexts: ['Shopping'], confidenceThreshold: 0.5, autoFileHighConfidence: false };

describe('CaptureService', () => {
  it('falls back to inbox candidate when interpreter fails', async () => {
    const repo = new InMemoryRepo();
    const interpreter: ThoughtInterpreter = { interpret: async () => { throw new Error('offline'); } };
    const projectSystem: ProjectSystem = { provider: 'mock', syncWorkItem: async () => ({ externalProjectId: 'p', externalItemId: 'i', externalIssueId: null, externalUrl: null }) };
    const service = new CaptureService(repo, interpreter, projectSystem, clock, ids, settings);

    const result = await service.captureThought({ userId: 'u1', channel: 'web', rawText: 'buy can opener', timezone: 'UTC' });

    expect(result.fallbackUsed).toBe(true);
    expect(result.candidates[0].status).toBe('Inbox');
  });

  it('is idempotent for repeated same idempotency key', async () => {
    const repo = new InMemoryRepo();
    const interpreter: ThoughtInterpreter = {
      interpret: async () => [{ title: 'Buy can opener', details: '', type: 'Task', area: 'Home', status: 'Next', priority: 'Normal', dueAt: null, dueWindowStart: null, dueWindowEnd: null, effort: null, context: 'Shopping', tags: [], confidence: 0.9, requiresClarification: false, clarificationQuestion: null, sourceTextFragment: 'buy can opener' }]
    };
    const projectSystem: ProjectSystem = { provider: 'mock', syncWorkItem: async () => ({ externalProjectId: 'p', externalItemId: 'i', externalIssueId: null, externalUrl: null }) };
    const service = new CaptureService(repo, interpreter, projectSystem, clock, ids, settings);

    await service.captureThought({ userId: 'u1', channel: 'web', rawText: 'buy can opener', timezone: 'UTC', idempotencyKey: 'same' });
    const second = await service.captureThought({ userId: 'u1', channel: 'web', rawText: 'buy can opener', timezone: 'UTC', idempotencyKey: 'same' });

    expect(repo.captures).toHaveLength(1);
    expect(second.candidates).toHaveLength(1);
  });
});
