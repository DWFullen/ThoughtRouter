import type { CandidateItem, CaptureInput, CapturedMessage, ProjectSyncRecord, WorkItem } from '../types.js';

export interface ThoughtInterpreter {
  interpret(input: {
    capturedMessage: CapturedMessage;
    timezone: string;
    areas: string[];
    contexts: string[];
    now: Date;
  }): Promise<Array<Omit<CandidateItem, 'id' | 'capturedMessageId' | 'decision'>>>;
}

export interface WorkItemRepository {
  findCaptureByIdempotencyKey(userId: string, key: string): Promise<CapturedMessage | null>;
  createCapturedMessage(message: CapturedMessage): Promise<void>;
  updateCapturedMessage(messageId: string, patch: Partial<CapturedMessage>): Promise<void>;
  createCandidateItems(items: CandidateItem[]): Promise<void>;
  listCandidateItemsByCapture(captureId: string): Promise<CandidateItem[]>;
  updateCandidateItem(candidateId: string, patch: Partial<CandidateItem>): Promise<void>;
  createWorkItems(items: WorkItem[]): Promise<void>;
  listWorkItemsByCapture(captureId: string): Promise<WorkItem[]>;
  createSyncRecords(records: ProjectSyncRecord[]): Promise<void>;
  updateSyncRecord(localWorkItemId: string, patch: Partial<ProjectSyncRecord>): Promise<void>;
  getLatestCaptureForUser(userId: string): Promise<CapturedMessage | null>;
  deleteCaptureCascade(captureId: string): Promise<void>;
  listHistory(userId: string): Promise<Array<{ capture: CapturedMessage; candidates: CandidateItem[]; workItems: WorkItem[] }>>;
}

export interface ProjectSystem {
  provider: string;
  syncWorkItem(item: WorkItem): Promise<{
    externalProjectId: string;
    externalItemId: string;
    externalIssueId: string | null;
    externalUrl: string | null;
  }>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface CaptureSettings {
  areas: string[];
  contexts: string[];
  confidenceThreshold: number;
  autoFileHighConfidence: boolean;
}

export interface CaptureUseCase {
  captureThought(input: CaptureInput): Promise<{ capturedMessage: CapturedMessage; candidates: CandidateItem[]; fallbackUsed: boolean }>;
}
