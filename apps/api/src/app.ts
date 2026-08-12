import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { CaptureService, type CaptureSettings, type Clock, type IdGenerator } from '@thoughtrouter/domain';
import { MockThoughtInterpreter, OpenAIThoughtInterpreter } from '@thoughtrouter/ai';
import { loadEnv } from '@thoughtrouter/config';
import { PostgresWorkItemRepository } from '@thoughtrouter/db';
import { GitHubProjectSystem, MockProjectSystem } from '@thoughtrouter/github';
import { InMemoryRepository } from '@thoughtrouter/testing';

const env = loadEnv();

const repo = process.env.NODE_ENV === 'test'
  ? new InMemoryRepository()
  : PostgresWorkItemRepository.fromUrl(env.DATABASE_URL);
const clock: Clock = { now: () => new Date() };
const ids: IdGenerator = { next: (prefix) => `${prefix}-${crypto.randomUUID()}` };
const settings: CaptureSettings = {
  areas: ['Home', 'Bills', 'Business', 'Personal', 'Shopping', 'Research', 'Ideas'],
  contexts: ['Home', 'Computer', 'Phone', 'Errand', 'Shopping', 'Anywhere'],
  confidenceThreshold: 0.6,
  autoFileHighConfidence: false
};
const systemPrompt = 'Capture-first classifier. Split independent items, avoid false date precision, prefer inbox when uncertain.';

const interpreter = env.THOUGHTROUTER_AI_PROVIDER === 'openai' && env.OPENAI_API_KEY
  ? new OpenAIThoughtInterpreter({ baseUrl: env.OPENAI_BASE_URL, apiKey: env.OPENAI_API_KEY, model: env.THOUGHTROUTER_AI_MODEL, systemPrompt })
  : new MockThoughtInterpreter();

const projectSystem = env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_PROJECT_NUMBER && env.GITHUB_REPOSITORY
  ? new GitHubProjectSystem({ token: env.GITHUB_TOKEN, owner: env.GITHUB_OWNER, projectNumber: env.GITHUB_PROJECT_NUMBER, repository: env.GITHUB_REPOSITORY })
  : new MockProjectSystem();

const service = new CaptureService(repo, interpreter, projectSystem, clock, ids, settings);

export const buildApp = () => {
  const app = Fastify({ logger: true });
  app.addHook('onClose', async () => {
    if ('close' in repo && typeof repo.close === 'function') {
      await repo.close();
    }
  });

  app.register(cors, { origin: true });
  app.register(rateLimit, { max: 30, timeWindow: '1 minute' });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ status: 'ready' }));

  app.post('/capture', async (request, reply) => {
    const body = request.body as { userId: string; channel: string; rawText: string; sourceMessageId?: string; idempotencyKey?: string; timezone?: string };
    const result = await service.captureThought({
      userId: body.userId,
      channel: body.channel,
      rawText: body.rawText,
      sourceMessageId: body.sourceMessageId,
      idempotencyKey: body.idempotencyKey,
      timezone: body.timezone ?? 'UTC'
    });
    return reply.send(result);
  });

  app.post('/capture/:captureId/decide', async (request, reply) => {
    const params = request.params as { captureId: string };
    const body = request.body as { decisions: Array<{ candidateId: string; action: 'accept' | 'reject' | 'edit'; patch?: Record<string, unknown> }> };
    const result = await service.decideCandidates({ captureId: params.captureId, decisions: body.decisions as never });
    return reply.send(result);
  });

  app.post('/capture/:captureId/retry-sync', async (request, reply) => {
    const params = request.params as { captureId: string };
    const result = await service.retryFailedSync(params.captureId);
    return reply.send(result);
  });

  app.post('/undo', async (request, reply) => {
    const body = request.body as { userId: string };
    const undone = await service.undoMostRecentCapture(body.userId);
    return reply.send({ undone });
  });

  app.get('/history/:userId', async (request, reply) => {
    const params = request.params as { userId: string };
    const history = await repo.listHistory(params.userId);
    return reply.send({ history });
  });

  app.get('/settings', async () => {
    return {
      timezone: 'UTC',
      areas: settings.areas,
      contexts: settings.contexts,
      confidenceThreshold: settings.confidenceThreshold,
      autoFileHighConfidence: settings.autoFileHighConfidence,
      aiProvider: env.THOUGHTROUTER_AI_PROVIDER,
      aiModelConfigured: Boolean(env.OPENAI_API_KEY),
      githubConfigured: Boolean(env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_PROJECT_NUMBER && env.GITHUB_REPOSITORY),
      warning: 'Do not capture account numbers, passwords, payment card details, SSNs, or secrets.'
    };
  });

  return app;
};
