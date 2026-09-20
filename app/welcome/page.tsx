'use client';

import { Activity, ArrowRight, BrainCircuit, Building2, ChevronRight, CircleDollarSign, Database, Network, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import './welcome.css';

const slides = [
  {
    eyebrow: 'THE OPERATING SYSTEM FOR AUTONOMOUS BUSINESS',
    title: 'Build companies that think, execute and learn.',
    text: 'AI Company OS turns objectives into governed missions, coordinated agents and measurable business outcomes.',
    icon: BrainCircuit,
  },
  {
    eyebrow: 'ONE COMMAND CENTER. EVERY COMPANY.',
    title: 'Run the company from one operating layer.',
    text: 'Strategy, workforce, operations, intelligence, finance and company memory converge in one control plane.',
    icon: Building2,
  },
  {
    eyebrow: 'AUTONOMOUS BY DESIGN. CONTROLLED BY YOU.',
    title: 'Autonomy with explicit human control.',
    text: 'Permissions, policies, risk boundaries and human review remain part of every important operating decision.',
    icon: ShieldCheck,
  },
];

const signals = [
  { label: 'AI WORKFORCE', value: '12', detail: 'agents ready', icon: Users },
  { label: 'COMPANY BRAIN', value: 'ACTIVE', detail: 'intelligence online', icon: BrainCircuit },
  { label: 'MISSIONS', value: '08', detail: 'in operation', icon: Target },
  { label: 'INTEGRATIONS', value: '24', detail: 'capabilities mapped', icon: Network },
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

  return (
    <main className="welcomeShell">
      <div className="welcomeGrid" />
      <div className="welcomeGlow glowOne" />
      <div className="welcomeGlow glowTwo" />

      <header className="welcomeNav">
        <div className="welcomeBrand">
          <img src="./ai-company-os-logo.svg" alt="AI Company OS" />
          <div><b>AI COMPANY OS</b><small>AUTONOMOUS COMPANY</small></div>
        </div>
        <div className="welcomeNavRight">
          <span>COMPANY OPERATING SYSTEM</span><i /><span>ONLINE</span>
        </div>
      </header>

      <section className="welcomeStage">
        <div className="stageVisual">
          <div className="visualFrame">
            <div className="frameTop"><span>AI COMPANY OS / CORE</span><span><i /> LIVE</span></div>
            <div className="network">
              <div className="networkLine lineOne" />
              <div className="networkLine lineTwo" />
              <div className="networkLine lineThree" />
              <div className="node nodeOne"><Users size={15} /><b>AGENTS</b><strong>12</strong></div>
              <div className="node nodeTwo"><Database size={15} /><b>MEMORY</b><strong>42</strong></div>
              <div className="node nodeThree"><Activity size={15} /><b>RUNTIME</b><strong>LIVE</strong></div>
              <div className="core">
                <div className="coreHalo" />
                <div className="coreIcon"><Icon size={30} /></div>
                <small>COMPANY BRAIN</small>
                <b>OPERATING</b>
              </div>
            </div>
            <div className="frameBottom">
              <span><CircleDollarSign size={13} /> BUSINESS</span>
              <span><Target size={13} /> STRATEGY</span>
              <span><ShieldCheck size={13} /> GOVERNANCE</span>
            </div>
          </div>
          <div className="visualLabel"><span>INTELLIGENCE • EXECUTION • CONTROL</span><b>READY TO OPERATE</b></div>
        </div>

        <div className="stageCopy" key={slide}>
          <div className="signalStrip">
            {signals.map(({ label, value, detail, icon: SignalIcon }) => (
              <div className="signal" key={label}><SignalIcon size={13}/><div><small>{label}</small><b>{value}</b><span>{detail}</span></div></div>
            ))}
          </div>
          <div className="slideCount">0{slide + 1} <span>/ 03</span></div>
          <div className="eyebrow">{current.eyebrow}</div>
          <h1>{current.title}</h1>
          <p>{current.text}</p>
          <div className="welcomeActions">
            <Link className="primaryWelcome" href="/login" onClick={() => setStarted(true)}>Enter AI Company OS <ArrowRight size={17}/></Link>
            <Link className="ghost" href="/signup" onClick={() => setStarted(true)}>Create your company <ChevronRight size={16}/></Link>
          </div>
          <div className="controlNote"><Sparkles size={14}/><span>Every important action remains governed, observable and auditable.</span></div>
        </div>
      </section>

      <footer className="welcomeFooter">
        <div className="slideDots">{slides.map((_, i) => <button key={i} aria-label={`Slide ${i + 1}`} className={i === slide ? 'active' : ''} onClick={() => { setStarted(true); setSlide(i); }} />)}</div>
        <div className="footerPills"><span>AI-native</span><span>Permission-gated</span><span>Evidence-backed</span></div>
      </footer>
    </main>
  );
}
