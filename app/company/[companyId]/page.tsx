import CompanyRuntimeWorkspace from './CompanyRuntimeWorkspace';
import CompanyRuntimeProvider from './CompanyRuntimeContext';
import CompanySessionGate from './CompanySessionGate';
import CompanyShell from '../../../ui/company/CompanyShell';
import { companyIds, getCompany } from '../../../infrastructure/company/company-catalog';

export function generateStaticParams(){
  return companyIds.map(companyId => ({ companyId }));
}

export default function CompanyPage({params}:{params:{companyId:string}}){
  const company = getCompany(params.companyId);

  return <CompanySessionGate companyId={company.id} companyName={company.name}>
    <CompanyRuntimeProvider company={company}>
      <CompanyShell>
        <CompanyRuntimeWorkspace company={company} companyId={company.id} initialView="Dashboard"/>
      </CompanyShell>
    </CompanyRuntimeProvider>
  </CompanySessionGate>
}
