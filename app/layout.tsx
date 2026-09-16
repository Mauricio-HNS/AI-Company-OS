import type { Metadata } from 'next';
import './globals.css';
import './company/[companyId]/phase2.css';
import './palette.css';
import './font-scale.css';
import './os-premium.css';
import './company-os-functional.css';
import './authority-shell.css';
import './realtime-security.css';
import './company/[companyId]/control-rail.css';
import './runtime-workspace.css';
import './core/experience/experience-intelligence.css';
import { ExperienceIntelligence } from './core/experience/ExperienceIntelligence';

export const metadata: Metadata = {
  title: 'AI Company OS',
  description: 'Autonomous company operating system powered by AI agents.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ExperienceIntelligence>{children}</ExperienceIntelligence></body></html>;
}
