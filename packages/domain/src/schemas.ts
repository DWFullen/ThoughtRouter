import { z } from 'zod';

export const interpretedItemSchema = z.object({
  title: z.string().min(1),
  details: z.string().default(''),
  type: z.enum(['Task', 'Idea', 'Backlog', 'Reminder', 'Note', 'Project']),
  area: z.string().min(1),
  status: z.enum(['Inbox', 'Next', 'Scheduled', 'In Progress', 'Waiting', 'Someday', 'Done']),
  priority: z.enum(['Critical', 'High', 'Normal', 'Low']),
  dueAt: z.string().datetime().nullable(),
  dueWindowStart: z.string().datetime().nullable(),
  dueWindowEnd: z.string().datetime().nullable(),
  effort: z.string().nullable(),
  context: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  requiresClarification: z.boolean(),
  clarificationQuestion: z.string().nullable(),
  sourceTextFragment: z.string().min(1)
});

export const interpretedOutputSchema = z.object({
  items: z.array(interpretedItemSchema).min(1)
});

export const captureRequestSchema = z.object({
  userId: z.string().min(1),
  channel: z.string().min(1),
  rawText: z.string().trim().min(1).max(5000),
  sourceMessageId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  timezone: z.string().default('UTC')
});
