import type { ReactNode } from 'react'
import CompanyRuntimeProvider from './CompanyRuntimeContext'
import CompanySessionGate from './CompanySessionGate'
import CompanyRouteShell from './CompanyRouteShell'
import CompanyShell from '../../../ui/company/CompanyShell'
import { companyIds, getCompany } from '../../../infrastructure/company/company-catalog'

export function generateStaticParams() {
  return companyIds.map(companyId => ({ companyId }))
}

export default function CompanyLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { companyId: string }
}) {
  const company = getCompany(params.companyId)

  return (
    <CompanySessionGate companyId={company.id} companyName={company.name}>
      <CompanyRuntimeProvider company={company}>
        <CompanyShell>
          <CompanyRouteShell
            company={company}
            companyId={company.id}
          >
            {children}
          </CompanyRouteShell>
        </CompanyShell>
      </CompanyRuntimeProvider>
    </CompanySessionGate>
  )
}
