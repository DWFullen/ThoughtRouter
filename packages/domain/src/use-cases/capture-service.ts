import { captureRequestSchema } from '../schemas.js';
import type { CandidateItem, CaptureInput, CapturedMessage, WorkItem } from '../types.js';
import type { CaptureSettings, Clock, IdGenerator, ProjectSystem, ThoughtInterpreter, WorkItemRepository } from '../ports/index.js';

const toInboxCandidate = (
  id: string,
  captureId: string,
  rawText: string,
  threshold = 0
): CandidateItem => ({
  id,
  capturedMessageId: captureId,
  title: rawText.slice(0, 80),
  details: rawText,
  type: 'Note',
  area: 'Inbox',
  status: 'Inbox',
  priority: 'Normal',
  dueAt: null,
  dueWindowStart: null,
  dueWindowEnd: null,
  effort: null,
  context: null,
  tags: [],
  confidence: threshold,
  requiresClarification: false,
  clarificationQuestion: null,
  sourceTextFragment: rawText,
  decision: 'Pending'
});

export class CaptureService {
  constructor(
    private readonly repo: WorkItemRepository,
    private readonly interpreter: ThoughtInterpreter,
    private readonly projectSystem: ProjectSystem,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly settings: CaptureSettings
  ) {}

  async captureThought(input: CaptureInput): Promise<{ capturedMessage: CapturedMessage; candidates: CandidateItem[]; fallbackUsed: boolean }> {
    const normalized = captureRequestSchema.parse(input);
    const idempotencyKey = normalized.idempotencyKey ?? `${normalized.userId}:${normalized.channel}:${normalized.rawText.trim().toLowerCase()}`;
    const existing = await this.repo.findCaptureByIdempotencyKey(normalized.userId, idempotencyKey);
    if (existing) {
      const existingCandidates = await this.repo.listCandidateItemsByCapture(existing.id);
      return { capturedMessage: existing, candidates: existingCandidates, fallbackUsed: false };
    }

    const capturedMessage: CapturedMessage = {
      id: this.ids.next('cap'),
      userId: normalized.userId,
      channel: normalized.channel,
      rawText: normalized.rawText.trim(),
      capturedAt: this.clock.now(),
      processingStatus: 'Pending',
      sourceMessageId: normalized.sourceMessageId ?? null,
      idempotencyKey,
      errorState: null
    };

    await this.repo.createCapturedMessage(capturedMessage);

    try {
      const interpreted = await this.interpreter.interpret({
        capturedMessage,
        timezone: normalized.timezone,
        areas: this.settings.areas,
        contexts: this.settings.contexts,
        now: this.clock.now()
      });

      const candidates: CandidateItem[] = interpreted.map((item) => ({
        ...item,
        id: this.ids.next('cand'),
        capturedMessageId: capturedMessage.id,
        decision: 'Pending',
        status: item.confidence < this.settings.confidenceThreshold ? 'Inbox' : item.status
      }));
      await this.repo.createCandidateItems(candidates);
      await this.repo.updateCapturedMessage(capturedMessage.id, { processingStatus: 'Interpreted' });
      return { capturedMessage: { ...capturedMessage, processingStatus: 'Interpreted' }, candidates, fallbackUsed: false };
    } catch {
      const fallback = toInboxCandidate(this.ids.next('cand'), capturedMessage.id, capturedMessage.rawText, this.settings.confidenceThreshold);
      await this.repo.createCandidateItems([fallback]);
      await this.repo.updateCapturedMessage(capturedMessage.id, {
        processingStatus: 'Failed',
        errorState: 'Thought saved locally; AI classification failed. It is in Inbox.'
      });
      return {
        capturedMessage: { ...capturedMessage, processingStatus: 'Failed', errorState: 'Thought saved locally; AI classification failed. It is in Inbox.' },
        candidates: [fallback],
        fallbackUsed: true
      };
    }
  }

  async decideCandidates(input: {
    captureId: string;
    decisions: Array<{ candidateId: string; action: 'accept' | 'reject' | 'edit'; patch?: Partial<CandidateItem> }>;
  }): Promise<{ workItems: WorkItem[] }> {
    const all = await this.repo.listCandidateItemsByCapture(input.captureId);
    const accepted: CandidateItem[] = [];
    for (const decision of input.decisions) {
      const current = all.find((item) => item.id === decision.candidateId);
      if (!current) continue;
      if (decision.action === 'reject') {
        await this.repo.updateCandidateItem(current.id, { decision: 'Rejected' });
        continue;
      }
      if (decision.action === 'edit' && decision.patch) {
        const updated = { ...current, ...decision.patch, decision: 'Edited' as const };
        await this.repo.updateCandidateItem(current.id, updated);
        accepted.push(updated);
      } else {
        await this.repo.updateCandidateItem(current.id, { decision: 'Accepted' });
        accepted.push({ ...current, decision: 'Accepted' });
      }
    }

    const workItems: WorkItem[] = accepted.map((candidate) => ({
      id: this.ids.next('work'),
      capturedMessageId: candidate.capturedMessageId,
      candidateItemId: candidate.id,
      title: candidate.title,
      details: candidate.details,
      type: candidate.type,
      area: candidate.area,
      status: candidate.status,
      priority: candidate.priority,
      dueAt: candidate.dueAt,
      dueWindowStart: candidate.dueWindowStart,
      dueWindowEnd: candidate.dueWindowEnd,
      context: candidate.context,
      tags: candidate.tags,
      syncStatus: 'Pending',
      createdAt: this.clock.now()
    }));

    await this.repo.createWorkItems(workItems);

    const syncRecords = [] as Array<{ localWorkItemId: string; externalProjectId: string; externalItemId: string; externalIssueId: string | null; externalUrl: string | null; syncStatus: 'Pending' | 'Synced' | 'Failed'; attemptCount: number; provider: string; lastAttemptAt: Date; lastError: string | null }>;
    for (const item of workItems) {
      try {
        const sync = await this.projectSystem.syncWorkItem(item);
        item.syncStatus = 'Synced';
        syncRecords.push({
          localWorkItemId: item.id,
          provider: this.projectSystem.provider,
          externalProjectId: sync.externalProjectId,
          externalItemId: sync.externalItemId,
          externalIssueId: sync.externalIssueId,
          externalUrl: sync.externalUrl,
          syncStatus: 'Synced',
          attemptCount: 1,
          lastAttemptAt: this.clock.now(),
          lastError: null
        });
      } catch {
        item.syncStatus = 'Failed';
        syncRecords.push({
          localWorkItemId: item.id,
          provider: this.projectSystem.provider,
          externalProjectId: 'unknown',
          externalItemId: 'unknown',
          externalIssueId: null,
          externalUrl: null,
          syncStatus: 'Failed',
          attemptCount: 1,
          lastAttemptAt: this.clock.now(),
          lastError: 'GitHub sync failed; item saved locally for retry.'
        });
      }
    }
    await this.repo.createSyncRecords(syncRecords);

    return { workItems };
  }

  async retryFailedSync(captureId: string): Promise<{ synced: number; failed: number }> {
    const workItems = await this.repo.listWorkItemsByCapture(captureId);
    let synced = 0;
    let failed = 0;
    for (const item of workItems.filter((it) => it.syncStatus !== 'Synced')) {
      try {
        const sync = await this.projectSystem.syncWorkItem(item);
        item.syncStatus = 'Synced';
        await this.repo.updateSyncRecord(item.id, {
          externalProjectId: sync.externalProjectId,
          externalItemId: sync.externalItemId,
          externalIssueId: sync.externalIssueId,
          externalUrl: sync.externalUrl,
          syncStatus: 'Synced',
          lastError: null,
          lastAttemptAt: this.clock.now()
        });
        synced += 1;
      } catch {
        failed += 1;
      }
    }
    return { synced, failed };
  }

  async undoMostRecentCapture(userId: string): Promise<boolean> {
    const capture = await this.repo.getLatestCaptureForUser(userId);
    if (!capture) return false;
    const workItems = await this.repo.listWorkItemsByCapture(capture.id);
    if (workItems.some((item) => item.syncStatus === 'Synced')) return false;
    await this.repo.deleteCaptureCascade(capture.id);
    return true;
  }
}
