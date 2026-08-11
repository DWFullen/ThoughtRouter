import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ThoughtRouter',
  description: 'Capture first. Organize afterward.',
  manifest: '/manifest.webmanifest'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
