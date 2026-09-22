import CompanyContent from '../../../ui/company/CompanyContent'
import CompanyRuntimeContent from '../../../ui/company/CompanyRuntimeContent'
import { getCompany } from '../../../infrastructure/company/company-catalog'

export default function CompanyPage({ params }: { params: { companyId: string } }) {
  const company = getCompany(params.companyId)

  return (
    <CompanyContent>
      <CompanyRuntimeContent company={company} view="Dashboard" setView={() => undefined} />
    </CompanyContent>
  )
}
