import type { CandidateItem, ThoughtInterpreter } from '@thoughtrouter/domain';

const normalizeTitle = (text: string) => {
  const cleaned = text.trim().replace(/^i need to\s+/i, '').replace(/^need to\s+/i, '');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export class MockThoughtInterpreter implements ThoughtInterpreter {
  async interpret(input: Parameters<ThoughtInterpreter['interpret']>[0]) {
    const chunks = input.capturedMessage.rawText
      .split(/\.|\band\b|\n|;/i)
      .map((part) => part.trim())
      .filter(Boolean);

    return chunks.map((chunk): Omit<CandidateItem, 'id' | 'capturedMessageId' | 'decision'> => {
      const lower = chunk.toLowerCase();
      const isIdea = /idea|research|wonder|maybe/.test(lower);
      const isBill = /electric|bill|utility/.test(lower);
      const vagueTime = /next week|sometime|later/.test(lower);
      const hasTomorrow = /tomorrow/.test(lower);
      const dueAt = hasTomorrow ? new Date(Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), input.now.getUTCDate() + 1)) : null;
      const dueWindowStart = vagueTime ? new Date(Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), input.now.getUTCDate() + 7)) : null;
      const dueWindowEnd = vagueTime ? new Date(Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), input.now.getUTCDate() + 13)) : null;
      const area: CandidateItem['area'] = isBill ? 'Bills' : /business|llc|nfc/.test(lower) ? 'Business' : /shop|buy/.test(lower) ? 'Shopping' : 'Home';
      const type: CandidateItem['type'] = isIdea ? 'Idea' : 'Task';
      const status: CandidateItem['status'] = isIdea ? 'Someday' : hasTomorrow ? 'Scheduled' : 'Next';
      const priority: CandidateItem['priority'] = hasTomorrow ? 'High' : 'Normal';

      return {
        title: normalizeTitle(chunk),
        details: chunk,
        type,
        area,
        status,
        priority,
        dueAt,
        dueWindowStart,
        dueWindowEnd,
        effort: null,
        context: /call/.test(lower) ? 'Phone' : /buy|shop/.test(lower) ? 'Shopping' : null,
        tags: [],
        confidence: vagueTime ? 0.45 : 0.86,
        requiresClarification: vagueTime,
        clarificationQuestion: vagueTime ? 'Can you clarify an exact target date?' : null,
        sourceTextFragment: chunk
      };
    });
  }
}
