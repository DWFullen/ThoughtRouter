'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type Candidate = {
  id: string;
  title: string;
  type: string;
  area: string;
  status: string;
  priority: string;
  details: string;
  decision: 'Pending' | 'Accepted' | 'Rejected' | 'Edited';
  sourceTextFragment: string;
  requiresClarification: boolean;
};

const mockInterpret = (rawText: string): Candidate[] =>
  rawText
    .split(/\.|\band\b|\n|;/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => ({
      id: `cand-${index + 1}`,
      title: part,
      details: part,
      type: /idea|research|nfc/i.test(part) ? 'Idea' : 'Task',
      area: /electric|bill|utility/i.test(part) ? 'Bills' : /business|llc|nfc/i.test(part) ? 'Business' : /buy|shop/i.test(part) ? 'Shopping' : 'Home',
      status: /idea|research|nfc/i.test(part) ? 'Someday' : 'Next',
      priority: /tomorrow|urgent/i.test(part) ? 'High' : 'Normal',
      decision: 'Pending' as const,
      sourceTextFragment: part,
      requiresClarification: /next week|sometime/i.test(part)
    }));

export default function Home() {
  const [text, setText] = useState('');
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [history, setHistory] = useState<Array<{ id: string; rawText: string; items: number; sync: string }>>([]);
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);

  const submit = async () => {
    if (!text.trim()) return;
    if (!apiUrl) {
      const mocked = mockInterpret(text);
      setCaptureId(`mock-${Date.now()}`);
      setCandidates(mocked);
      setHistory((prev) => [{ id: `mock-${Date.now()}`, rawText: text, items: mocked.length, sync: 'mock' }, ...prev].slice(0, 5));
      return;
    }
    const res = await fetch(`${apiUrl}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'local-user', channel: 'web', rawText: text, timezone: 'UTC' })
    });
    const data = await res.json();
    setCaptureId(data.capturedMessage.id);
    setCandidates(data.candidates);
    setHistory((prev) => [{ id: data.capturedMessage.id, rawText: text, items: data.candidates.length, sync: 'pending' }, ...prev].slice(0, 5));
  };

  const decide = async (candidateId: string, action: 'accept' | 'reject') => {
    setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, decision: action === 'accept' ? 'Accepted' : 'Rejected' } : c)));
    if (captureId && apiUrl) {
      await fetch(`${apiUrl}/capture/${captureId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions: [{ candidateId, action }] })
      });
    }
  };

  return (
    <main className="mx-auto max-w-xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">ThoughtRouter</h1>
      <p className="text-sm text-slate-600">Capture first. Organize afterward.</p>
      <div className="flex gap-3 text-sm underline">
        <Link href="/history">History</Link>
        <Link href="/settings">Settings</Link>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Drop your thought dump here..." />
      <div className="flex gap-2">
        <button onClick={submit}>Submit</button>
        <button onClick={() => setCandidates((prev) => prev.map((c) => ({ ...c, decision: 'Accepted' })))}>Accept All</button>
        <button onClick={() => setCandidates((prev) => prev.map((c) => ({ ...c, status: 'Inbox' })))}>Send All to Inbox</button>
      </div>

      <section className="space-y-2">
        {candidates.map((item) => (
          <article key={item.id} className="bg-white border rounded-lg p-3 space-y-2">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="text-sm text-slate-600">{item.type} · {item.area} · {item.status} · {item.priority}</p>
            {item.requiresClarification ? <p className="text-xs text-amber-700">Needs clarification</p> : null}
            <div className="flex gap-2">
              <button onClick={() => decide(item.id, 'accept')}>Accept</button>
              <button onClick={() => decide(item.id, 'reject')}>Reject</button>
            </div>
          </article>
        ))}
      </section>

      <section>
        <h2 className="font-semibold">Recent captures</h2>
        <ul className="text-sm text-slate-700">
          {history.map((entry) => (
            <li key={entry.id}>{entry.rawText} ({entry.items} items · {entry.sync})</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
