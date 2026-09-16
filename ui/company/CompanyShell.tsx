import type { ReactNode } from 'react'

/**
 * Canonical Company OS presentation boundary.
 * Keep route composition here and keep interactive behavior in child client components.
 */
export default function CompanyShell({ children }: { children: ReactNode }) {
  return <div data-company-shell="true">{children}</div>
}
