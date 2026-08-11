import { interpretedOutputSchema, type ThoughtInterpreter } from '@thoughtrouter/domain';

export interface OpenAIThoughtInterpreterConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
}

export class OpenAIThoughtInterpreter implements ThoughtInterpreter {
  constructor(private readonly config: OpenAIThoughtInterpreterConfig) {}

  async interpret(input: Parameters<ThoughtInterpreter['interpret']>[0]) {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ['Bearer', this.config.apiKey].join(' ')
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: this.config.systemPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              rawText: input.capturedMessage.rawText,
              timezone: input.timezone,
              now: input.now.toISOString(),
              allowedAreas: input.areas,
              allowedContexts: input.contexts
            })
          }
        ]
      })
    });

    if (!response.ok) throw new Error('AI provider request failed');
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI provider empty response');
    const parsed = interpretedOutputSchema.parse(JSON.parse(content));

    return parsed.items.map((item) => ({
      ...item,
      dueAt: item.dueAt ? new Date(item.dueAt) : null,
      dueWindowStart: item.dueWindowStart ? new Date(item.dueWindowStart) : null,
      dueWindowEnd: item.dueWindowEnd ? new Date(item.dueWindowEnd) : null
    }));
  }
}
