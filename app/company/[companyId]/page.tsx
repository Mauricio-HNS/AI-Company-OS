import CompanyRuntimeWorkspace from './CompanyRuntimeWorkspace';
import CompanyRuntimeProvider from './CompanyRuntimeContext';
import CompanySessionGate from './CompanySessionGate';
import ControlRail from './ControlRail';

const companies: Record<string, {name:string;type:string;revenue:string;profit:string;health:string;agents:number;missions:number;objective:string}> = {
  alpha:{name:'Company Alpha',type:'AI SaaS Platform',revenue:'€38,420',profit:'€12,840',health:'94%',agents:18,missions:4,objective:'Launch the next recurring-revenue product'},
  beta:{name:'Company Beta',type:'AI Commerce',revenue:'€21,830',profit:'€7,420',health:'91%',agents:11,missions:3,objective:'Increase conversion and customer lifetime value'},
  gamma:{name:'Company Gamma',type:'AI Automation',revenue:'€4,280',profit:'€920',health:'87%',agents:7,missions:2,objective:'Validate the first enterprise automation offer'},
};

export function generateStaticParams(){return Object.keys(companies).map(companyId=>({companyId}));}

export default function CompanyPage({params}:{params:{companyId:string}}){
  const company=companies[params.companyId]??companies.alpha;
  return <CompanySessionGate companyId={params.companyId} companyName={company.name}>
    <CompanyRuntimeProvider company={company}>
      <ControlRail companyId={params.companyId}/>
      <CompanyRuntimeWorkspace company={company} companyId={params.companyId} initialView="Command Center"/>
    </CompanyRuntimeProvider>
  </CompanySessionGate>
}
