'use client'

import type { ReactNode } from 'react'

/** Canonical company presentation boundary. Route-specific content is supplied as children. */
export default function CompanyShell({ children }: { children: ReactNode }) {
  return <div data-company-shell="true">{children}</div>
}
