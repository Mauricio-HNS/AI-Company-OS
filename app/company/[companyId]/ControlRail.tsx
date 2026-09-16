'use client';

import Link from 'next/link';
import { Inbox, ShieldCheck, Activity } from 'lucide-react';
import AdaptiveExperienceLayer from './AdaptiveExperienceLayer';

export default function ControlRail({ companyId }:{companyId:string}) {
  return <>
    <nav className="controlRail" aria-label="Control surfaces">
      <div className="controlRailBrand"><ShieldCheck size={16}/><span>CONTROL LAYER</span></div>
      <Link href={`/company/${companyId}/requests`}><Inbox size={15}/><span>Central de Solicitações</span><b>24</b></Link>
      <Link href={`/company/${companyId}/command/proposals`}><ShieldCheck size={15}/><span>Central de Comando</span><b>4</b></Link>
      <Link href={`/company/${companyId}/security`}><Activity size={15}/><span>System Integrity</span><i>LIVE</i></Link>
    </nav>
    <AdaptiveExperienceLayer />
  </>;
}
