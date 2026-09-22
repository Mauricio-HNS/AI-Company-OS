import CompanyRuntimeContent from '../../../../ui/company/CompanyRuntimeContent'
import { getCompany } from '../../../../infrastructure/company/company-catalog'

export default function SalonPage({ params }: { params: { companyId: string } }) {
  const company = getCompany(params.companyId)
  return <CompanyRuntimeContent company={company} view="Salon" setView={() => undefined} />
}
