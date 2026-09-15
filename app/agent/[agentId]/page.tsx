'use client';

import Link from 'next/link';
import { Activity, ArrowLeft, BrainCircuit, ShieldCheck, Wrench } from 'lucide-react';

export function generateStaticParams(){return [{agentId:'strategist-01'},{agentId:'growth-01'},{agentId:'operator-01'}];}

export default function AgentPage({params}:{params:{agentId:string}}){
  const agent = {
    id: params.agentId,
    name: params.agentId === 'strategist-01' ? 'Strategist' : params.agentId === 'growth-01' ? 'Growth Agent' : 'Operations Agent',
    role: params.agentId === 'strategist-01' ? 'Strategy & planning' : params.agentId === 'growth-01' ? 'Growth & experiments' : 'Execution & operations',
  };
  return <main style={{minHeight:'100vh',background:'#07090d',color:'#f5f7fa',padding:'32px',fontFamily:'Inter,system-ui,sans-serif'}}>
    <div style={{maxWidth:1180,margin:'0 auto'}}>
      <Link href="/company/alpha" style={{display:'inline-flex',alignItems:'center',gap:8,color:'#8d98a8',textDecoration:'none',fontSize:14}}><ArrowLeft size={16}/> Back to company</Link>
      <header style={{padding:'52px 0 34px',borderBottom:'1px solid #202631'}}><div style={{color:'#8d98a8',fontSize:13,textTransform:'uppercase',letterSpacing:'.08em'}}>Agent workspace</div><h1 style={{fontSize:48,margin:'10px 0 8px',letterSpacing:'-.03em'}}>{agent.name}</h1><p style={{color:'#aeb7c5',fontSize:17,margin:0}}>{agent.role} · {agent.id}</p></header>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:16,paddingTop:26}}>
        <Panel icon={<Activity size={18}/>} title="Current mission"><strong>Increase business performance</strong><span>Active · cycle 1</span></Panel>
        <Panel icon={<BrainCircuit size={18}/>} title="Memory"><strong>Company context available</strong><span>Decisions and learned lessons</span></Panel>
        <Panel icon={<Wrench size={18}/>} title="Tools"><strong>Execution tools configured</strong><span>Access controlled by policy</span></Panel>
        <Panel icon={<ShieldCheck size={18}/>} title="Autonomy"><strong>Level 2 · supervised</strong><span>High-impact actions require approval</span></Panel>
      </section>
      <section style={{marginTop:24,border:'1px solid #202631',borderRadius:14,padding:24,background:'#0c1016'}}><h2 style={{margin:'0 0 8px',fontSize:19}}>Execution timeline</h2><p style={{margin:0,color:'#8994a4',lineHeight:1.6}}>The agent workspace will become the operational surface for tasks, tool calls, decisions, memory and evaluation evidence.</p></section>
    </div>
  </main>;
}

function Panel({icon,title,children}:{icon:React.ReactNode;title:string;children:React.ReactNode}){return <article style={{border:'1px solid #202631',borderRadius:14,padding:22,background:'#0c1016',minHeight:130}}><div style={{display:'flex',justifyContent:'space-between',color:'#8994a4',marginBottom:26}}><span>{title}</span>{icon}</div><div style={{display:'grid',gap:7}}>{children}</div></article>}
