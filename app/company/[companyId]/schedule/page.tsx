import SchedulingModule from '../../../../ui/company/SchedulingModule'
import { companyIds, getCompany } from '../../../../infrastructure/company/company-catalog'

export function generateStaticParams(){
  return companyIds.map(companyId => ({ companyId }))
}

export default function SchedulingPage({ params }: { params: { companyId: string } }) {
  const company = getCompany(params.companyId)
  return <SchedulingModule companyId={company.id} companyName={company.name} />
}
