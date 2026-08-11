import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://postgres@localhost:5432/thoughtrouter'),
  THOUGHTROUTER_AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  THOUGHTROUTER_AI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_PROJECT_NUMBER: z.string().optional(),
  GITHUB_REPOSITORY: z.string().optional()
});

export type AppEnv = z.infer<typeof envSchema>;

export const loadEnv = (raw: NodeJS.ProcessEnv = process.env): AppEnv => envSchema.parse(raw);
