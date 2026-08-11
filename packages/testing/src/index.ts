import type { CandidateItem, CapturedMessage, ProjectSyncRecord, WorkItem, WorkItemRepository } from '@thoughtrouter/domain';

export class InMemoryRepository implements WorkItemRepository {
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
  async listWorkItemsByCapture(captureId: string) { return this.workItems.filter((w) => w.capturedMessageId === captureId); }
  async createSyncRecords(records: ProjectSyncRecord[]) { this.syncs.push(...records); }
  async updateSyncRecord(localWorkItemId: string, patch: Partial<ProjectSyncRecord>) { Object.assign(this.syncs.find((s) => s.localWorkItemId === localWorkItemId)!, patch); }
  async getLatestCaptureForUser(userId: string) { return this.captures.filter((c) => c.userId === userId).at(-1) ?? null; }
  async deleteCaptureCascade(captureId: string) {
    this.captures = this.captures.filter((c) => c.id !== captureId);
    this.candidates = this.candidates.filter((c) => c.capturedMessageId !== captureId);
    const ids = this.workItems.filter((w) => w.capturedMessageId === captureId).map((w) => w.id);
    this.workItems = this.workItems.filter((w) => w.capturedMessageId !== captureId);
    this.syncs = this.syncs.filter((s) => !ids.includes(s.localWorkItemId));
  }
  async listHistory(userId: string) {
    return this.captures.filter((c) => c.userId === userId).map((capture) => ({
      capture,
      candidates: this.candidates.filter((cand) => cand.capturedMessageId === capture.id),
      workItems: this.workItems.filter((work) => work.capturedMessageId === capture.id)
    }));
  }
}
