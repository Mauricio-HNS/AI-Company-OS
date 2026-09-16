import CompanyIntegrations from '../CompanyIntegrations'
import '../../../integrations/integrations.css'

const companies: Record<string, string> = {
  alpha: 'Company Alpha',
  beta: 'Company Beta',
  gamma: 'Company Gamma',
}

export function generateStaticParams() {
  return Object.keys(companies).map(companyId => ({ companyId }))
}

export default function CompanyIntegrationsPage({ params }: { params: { companyId: string } }) {
  const companyName = companies[params.companyId] ?? companies.alpha
  return <main className="integrationShell companyIntegrationRoute"><CompanyIntegrations companyId={params.companyId} companyName={companyName} /></main>
}
