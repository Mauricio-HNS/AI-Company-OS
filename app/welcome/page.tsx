'use client';

import { ArrowRight, BrainCircuit, Building2, ChevronRight, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import './welcome.css';

const slides = [
  { eyebrow: 'THE OPERATING SYSTEM FOR AUTONOMOUS BUSINESS', title: 'Build companies that think, execute and learn.', text: 'AI Company OS turns objectives into missions, missions into tasks, and tasks into measurable business outcomes.', icon: BrainCircuit },
  { eyebrow: 'ONE COMMAND CENTER. EVERY COMPANY.', title: 'Run an entire portfolio from one place.', text: 'Create independent AI companies, each with its own strategy, agents, products, customers, finances and memory.', icon: Building2 },
  { eyebrow: 'AUTONOMOUS BY DESIGN. CONTROLLED BY YOU.', title: 'Let the company operate without losing control.', text: 'Every important action passes through permissions, budgets, risk rules and human approval boundaries.', icon: ShieldCheck },
];

export default function Welcome() {
  const [slide, setSlide] = useState(0);
  const [started, setStarted] = useState(false);
  const current = slides[slide];
  const Icon = current.icon;

  useEffect(() => {
    if (started) return;
    const timer = window.setInterval(() => setSlide(s => (s + 1) % slides.length), 5200);
    return () => window.clearInterval(timer);
  }, [started]);

  return <main className="welcomeShell">
    <div className="welcomeGlow glowOne"/><div className="welcomeGlow glowTwo"/>
    <header className="welcomeNav"><div className="welcomeBrand"><img src="./ai-company-os-logo.svg" alt="AI Company OS"/><div><b>AI Company OS</b><small>AUTONOMOUS COMPANY</small></div></div><div className="welcomeNavRight"><span>SIMULATION CORE</span><i/><span>ONLINE</span></div></header>
    <section className="welcomeStage">
      <div className="stageVisual"><div className="orbOuter"><div className="orbMiddle"><div className="orbCore"><Icon size={42}/></div></div></div><div className="orbit orbitA"/><div className="orbit orbitB"/><div className="visualLabel"><span>COMPANY INTELLIGENCE</span><b>READY TO OPERATE</b></div></div>
      <div className="stageCopy" key={slide}><div className="slideCount">0{slide + 1} <span>/ 03</span></div><div className="eyebrow">{current.eyebrow}</div><h1>{current.title}</h1><p>{current.text}</p><div className="welcomeActions"><Link className="primaryWelcome" href="/login" onClick={() => setStarted(true)}>Enter AI Company OS <ArrowRight size={17}/></Link><button className="ghost" onClick={() => { setStarted(true); setSlide((slide + 1) % 3); }}>Next experience <ChevronRight size={16}/></button></div></div>
    </section>
    <footer className="welcomeFooter"><div className="slideDots">{slides.map((_, i) => <button key={i} aria-label={`Slide ${i + 1}`} className={i === slide ? 'active' : ''} onClick={() => { setStarted(true); setSlide(i); }}/>)}</div><div className="footerPills"><span><Layers3 size={13}/> Portfolio OS</span><span><Sparkles size={13}/> AI-native</span><span>Permission-gated</span></div></footer>
  </main>;
}
