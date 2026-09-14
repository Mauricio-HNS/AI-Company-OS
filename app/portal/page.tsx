'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Bot, Gauge, Target, Zap } from 'lucide-react'
import './portal.css'

type Tenant={id:string;name:string;sector:string;market:string;objective:string;health:number;agents:string[];missions?:unknown[];tasks?:unknown[]}
export default function Portal(){const [tenant,setTenant]=useState<Tenant|null>(null);useEffect(()=>{const id=new URLSearchParams(window.location.search).get('tenant');try{const list=JSON.parse(localStorage.getItem('ai-company-os-tenants')||'[]');setTenant(list.find((x:Tenant)=>x.id===id)||null)}catch{setTenant(null)}},[]);if(!tenant)return <main className="portalPage"><p>Client portal not found.</p><Link href="/master">Master Control</Link></main>;return <main className="portalPage"><header><Link href={`/master/tenant?id=${encodeURIComponent(tenant.id)}`}><ArrowLeft size={15}/> Control Center</Link><span>CLIENT PORTAL</span></header><section className="portalHero"><div><small>{tenant.sector} · {tenant.market}</small><h1>{tenant.name}</h1><p>{tenant.objective}</p></div><div className="portalHealth"><Gauge size={20}/><strong>{tenant.health}%</strong><span>System health</span></div></section><section className="portalGrid"><div><Bot/><span>AI Workforce</span><strong>{tenant.agents.length}</strong><small>active agents</small></div><div><Target/><span>Missions</span><strong>{tenant.missions?.length||0}</strong><small>configured</small></div><div><Zap/><span>Tasks</span><strong>{tenant.tasks?.length||0}</strong><small>queued</small></div></section><section className="portalNotice"><h2>Company operating system</h2><p>Your AI workforce, missions and execution layer are connected to this private tenant environment.</p></section></main>}
