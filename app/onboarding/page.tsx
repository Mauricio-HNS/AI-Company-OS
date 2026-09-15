'use client';

import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export default function OnboardingPage() {
  return (
    <main style={{minHeight:'100vh',background:'#07090d',color:'#f5f7fa',padding:'48px 24px',fontFamily:'Inter,system-ui,sans-serif'}}>
      <div style={{maxWidth:1080,margin:'0 auto'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:10,color:'#aeb7c5',fontSize:13,letterSpacing:'.08em',textTransform:'uppercase'}}><Sparkles size={16}/> AI Company OS</div>
        <section style={{maxWidth:760,padding:'72px 0 48px'}}>
          <div style={{color:'#8d98a8',fontSize:14,marginBottom:14}}>Company onboarding</div>
          <h1 style={{fontSize:'clamp(40px,6vw,72px)',lineHeight:1.02,margin:'0 0 22px',letterSpacing:'-.04em'}}>Build a company that can operate with AI.</h1>
          <p style={{fontSize:20,lineHeight:1.6,color:'#aeb7c5',margin:0}}>Define the business, its objective, constraints and permissions. AI Company OS creates the operating environment for your AI workforce.</p>
        </section>
        <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,marginBottom:42}}>
          <Step icon={<Building2 size={20}/>} n="01" title="Define company" text="Name, sector, business model and initial objective." />
          <Step icon={<ShieldCheck size={20}/>} n="02" title="Set guardrails" text="Budget, approvals, risk limits and autonomy boundaries." />
          <Step icon={<CheckCircle2 size={20}/>} n="03" title="Start operations" text="Launch the first mission and let the operating cycle begin." />
        </section>
        <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
          <Link href="/master/new" style={{display:'inline-flex',alignItems:'center',gap:9,padding:'13px 18px',borderRadius:10,background:'#f5f7fa',color:'#07090d',fontWeight:700,textDecoration:'none'}}>Create company <ArrowRight size={17}/></Link>
          <Link href="/login" style={{display:'inline-flex',alignItems:'center',padding:'13px 18px',borderRadius:10,border:'1px solid #252b35',color:'#d8dee8',textDecoration:'none'}}>Sign in</Link>
        </div>
      </div>
    </main>
  );
}

function Step({icon,n,title,text}:{icon:React.ReactNode;n:string;title:string;text:string}) {
  return <article style={{border:'1px solid #202631',borderRadius:14,padding:22,background:'#0c1016'}}><div style={{display:'flex',justifyContent:'space-between',color:'#8994a4',fontSize:12,marginBottom:28}}><span>{n}</span>{icon}</div><h2 style={{fontSize:18,margin:'0 0 8px'}}>{title}</h2><p style={{color:'#8994a4',lineHeight:1.55,margin:0}}>{text}</p></article>;
}
