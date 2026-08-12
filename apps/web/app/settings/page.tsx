'use client';

import { useEffect, useState } from 'react';

type Settings = {
  timezone: string;
  areas: string[];
  contexts: string[];
  confidenceThreshold: number;
  autoFileHighConfidence: boolean;
  aiProvider: string;
  aiModelConfigured: boolean;
  githubConfigured: boolean;
  warning: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setSettings({ timezone: 'UTC', areas: ['Home', 'Bills', 'Business'], contexts: ['Home', 'Computer', 'Phone'], confidenceThreshold: 0.6, autoFileHighConfidence: false, aiProvider: 'mock', aiModelConfigured: false, githubConfigured: false, warning: 'Do not capture account numbers, passwords, payment card details, SSNs, or secrets.' });
      return;
    }
    fetch(`${apiUrl}/settings`).then((res) => res.json()).then(setSettings).catch(() => setSettings(null));
  }, []);

  if (!settings) return <main className="p-4">Loading settings…</main>;

  return (
    <main className="mx-auto max-w-xl p-4 space-y-2">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-sm">Timezone: {settings.timezone}</p>
      <p className="text-sm">Areas: {settings.areas.join(', ')}</p>
      <p className="text-sm">GitHub configured: {settings.githubConfigured ? 'Yes' : 'No'}</p>
      <p className="text-sm">AI provider: {settings.aiProvider}</p>
      <p className="text-xs text-amber-700">{settings.warning}</p>
    </main>
  );
}
