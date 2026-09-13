import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Company OS',
  description: 'Autonomous company operating system powered by AI agents.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
