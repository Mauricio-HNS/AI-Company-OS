import type { Metadata } from 'next';
import './globals.css';
import './company/[companyId]/phase2.css';
import './palette.css';
import './font-scale.css';
import './os-premium.css';
import './company-os-functional.css';

export const metadata: Metadata = {
  title: 'AI Company OS',
  description: 'Autonomous company operating system powered by AI agents.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
