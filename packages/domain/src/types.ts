export type WorkItemType = 'Task' | 'Idea' | 'Backlog' | 'Reminder' | 'Note' | 'Project';
export type WorkItemStatus = 'Inbox' | 'Next' | 'Scheduled' | 'In Progress' | 'Waiting' | 'Someday' | 'Done';
export type WorkItemPriority = 'Critical' | 'High' | 'Normal' | 'Low';

export type ProcessingStatus = 'Pending' | 'Interpreted' | 'Failed';
export type CandidateDecision = 'Pending' | 'Accepted' | 'Rejected' | 'Edited';

export interface CapturedMessage {
  id: string;
  userId: string;
  channel: string;
  rawText: string;
  capturedAt: Date;
  processingStatus: ProcessingStatus;
  sourceMessageId?: string | null;
  idempotencyKey: string;
  errorState?: string | null;
}

export interface CandidateItem {
  id: string;
  capturedMessageId: string;
  title: string;
  details: string;
  type: WorkItemType;
  area: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  dueAt: Date | null;
  dueWindowStart: Date | null;
  dueWindowEnd: Date | null;
  effort: string | null;
  context: string | null;
  tags: string[];
  confidence: number;
  requiresClarification: boolean;
  clarificationQuestion: string | null;
  sourceTextFragment: string;
  decision: CandidateDecision;
}

export interface WorkItem {
  id: string;
  capturedMessageId: string;
  candidateItemId: string;
  title: string;
  details: string;
  type: WorkItemType;
  area: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  dueAt: Date | null;
  dueWindowStart: Date | null;
  dueWindowEnd: Date | null;
  context: string | null;
  tags: string[];
  syncStatus: 'Pending' | 'Synced' | 'Failed';
  createdAt: Date;
}

export interface ProjectSyncRecord {
  localWorkItemId: string;
  provider: string;
  externalProjectId: string;
  externalItemId: string;
  externalIssueId: string | null;
  syncStatus: 'Pending' | 'Synced' | 'Failed';
  attemptCount: number;
  lastAttemptAt: Date;
  lastError: string | null;
  externalUrl: string | null;
}

export interface Reminder {
  workItemId: string;
  dueAt: Date;
  remindAt: Date;
  channel: string;
  status: 'Pending' | 'Sent' | 'Failed';
}

export interface CaptureInput {
  userId: string;
  channel: string;
  rawText: string;
  sourceMessageId?: string;
  idempotencyKey?: string;
  timezone: string;
}
