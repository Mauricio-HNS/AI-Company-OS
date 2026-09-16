import type { ReactNode } from 'react'

/**
 * Canonical content boundary for Company OS modules.
 * Module selection and business data remain outside the presentation shell.
 */
export default function CompanyContent({ children }: { children: ReactNode }) {
  return <section data-company-content="true">{children}</section>
}
