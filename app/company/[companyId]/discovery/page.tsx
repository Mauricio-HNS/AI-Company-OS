import CompanyContent from '../../../../ui/company/CompanyContent'
import CompanyRuntimeContent from '../../../../ui/company/CompanyRuntimeContent'
import { getCompany, companyIds } from '../../../../infrastructure/company/company-catalog'

export function generateStaticParams() {
  return companyIds.map(companyId => ({ companyId }))
}

export default function DiscoveryPage({ params }: { params: { companyId: string } }) {
  const company = getCompany(params.companyId)

  return (
    <CompanyContent>
      <CompanyRuntimeContent company={company} view="Discovery" setView={() => undefined} />
    </CompanyContent>
  )
}
