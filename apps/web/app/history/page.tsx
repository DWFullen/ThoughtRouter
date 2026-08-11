'use client';

import { useEffect, useState } from 'react';

type HistoryEntry = { capture: { id: string; rawText: string; capturedAt: string; processingStatus: string }; workItems: Array<{ id: string; title: string; syncStatus: string }>; candidates: Array<{ id: string; title: string }> };

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    fetch(`${apiUrl}/history/local-user`).then((res) => res.json()).then((data) => setEntries(data.history ?? [])).catch(() => setEntries([]));
  }, []);

  return (
    <main className="mx-auto max-w-xl p-4 space-y-3">
      <h1 className="text-2xl font-bold">Capture History</h1>
      {entries.map((entry) => (
        <article key={entry.capture.id} className="rounded-lg border bg-white p-3">
          <p className="font-semibold">{entry.capture.rawText}</p>
          <p className="text-xs text-slate-600">{new Date(entry.capture.capturedAt).toLocaleString()} · {entry.capture.processingStatus}</p>
          <ul className="text-sm mt-2">
            {entry.workItems.map((item) => (
              <li key={item.id}>{item.title} · {item.syncStatus}</li>
            ))}
          </ul>
        </article>
      ))}
    </main>
  );
}
