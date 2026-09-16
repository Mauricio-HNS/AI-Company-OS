'use client'

import { useEffect, useState } from 'react'
import { BrainCircuit, ChevronRight, Sparkles, X } from 'lucide-react'
import { getExperienceSnapshot, getPreferredAction, getPreferredView, startExperienceSession, type ExperienceSnapshot } from '../../../lib/experience-intelligence'
import { useCompanyRuntime } from './CompanyRuntimeContext'

export default function AdaptiveExperienceLayer() {
  const { running, progress, counts } = useCompanyRuntime()
  const [snapshot, setSnapshot] = useState<ExperienceSnapshot | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setSnapshot(startExperienceSession())
    const sync = (event: Event) => setSnapshot((event as CustomEvent<ExperienceSnapshot>).detail)
    window.addEventListener('aicos:experience', sync)
    return () => window.removeEventListener('aicos:experience', sync)
  }, [])

  if (!snapshot) return null
  const preferredView = getPreferredView(snapshot)
  const preferredAction = getPreferredAction(snapshot)

  return <>
    <button aria-label="Experience Intelligence" onClick={() => setOpen(value => !value)} style={{position:'fixed',right:20,bottom:20,zIndex:80,width:44,height:44,borderRadius:14,border:'1px solid rgba(89,147,255,.28)',background:'rgba(8,22,31,.88)',backdropFilter:'blur(18px)',color:'#9fc5ff',display:'grid',placeItems:'center',boxShadow:'0 12px 40px rgba(0,0,0,.28)',cursor:'pointer'}}><BrainCircuit size={18}/></button>
    {open && <section style={{position:'fixed',right:20,bottom:76,zIndex:80,width:310,border:'1px solid rgba(89,147,255,.18)',borderRadius:18,background:'rgba(8,20,29,.96)',backdropFilter:'blur(22px)',boxShadow:'0 24px 70px rgba(0,0,0,.38)',padding:18,color:'#eaf2f4'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div style={{display:'flex',alignItems:'center',gap:9}}><span style={{width:30,height:30,borderRadius:9,display:'grid',placeItems:'center',background:'rgba(59,140,255,.12)',color:'#7eb2ff'}}><Sparkles size={15}/></span><div><small style={{display:'block',fontSize:9,letterSpacing:'.12em',color:'#718994'}}>EXPERIENCE INTELLIGENCE</small><b style={{fontSize:13}}>Learning from your workflow</b></div></div><button onClick={()=>setOpen(false)} aria-label="Close" style={{background:'none',border:0,color:'#718994',cursor:'pointer'}}><X size={15}/></button></header>
      <p style={{fontSize:11,lineHeight:1.55,color:'#91a9b1',margin:'14px 0'}}>The OS is learning which areas, actions and operating patterns matter most to you. Personalization stays inside the current experience model.</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><Metric label="Sessions" value={snapshot.sessions}/><Metric label="Interactions" value={snapshot.interactions}/><Metric label="Preferred view" value={preferredView}/><Metric label="Runtime" value={running?'LIVE':'PAUSED'}/></div>
      <div style={{marginTop:12,padding:11,borderRadius:12,border:'1px solid rgba(255,255,255,.07)',background:'rgba(255,255,255,.025)'}}><small style={{fontSize:9,color:'#718994'}}>ADAPTIVE SIGNAL</small><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:5}}><span style={{fontSize:11,color:'#dce8eb'}}>Prioritize {preferredAction}</span><ChevronRight size={13} color="#7eb2ff"/></div></div>
      <div style={{marginTop:10,fontSize:9,color:'#718994'}}>Runtime progress {progress}% · {counts.completed} completed · {counts.executing} executing</div>
    </section>}
  </>
}

function Metric({label,value}:{label:string;value:string|number}) { return <div style={{padding:'9px 10px',borderRadius:11,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.06)'}}><small style={{display:'block',fontSize:8,color:'#718994',letterSpacing:'.08em'}}>{label.toUpperCase()}</small><b style={{display:'block',marginTop:4,fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{value}</b></div> }
