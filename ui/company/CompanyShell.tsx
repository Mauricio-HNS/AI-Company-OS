'use client'

import CompanyRuntimeWorkspace from '../../app/company/[companyId]/CompanyRuntimeWorkspace'
import type { Company } from '../../domain/company/company.types'

/** Canonical Company OS presentation shell. Keep navigation/chrome inside this boundary. */
export default function CompanyShell({ company, companyId }: { company: Company; companyId: string }) {
  return <CompanyRuntimeWorkspace company={company} companyId={companyId} initialView="Dashboard" />
}
