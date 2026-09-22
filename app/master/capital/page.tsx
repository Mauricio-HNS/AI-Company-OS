'use client';

import MasterSidebar from '../../../ui/master/MasterSidebar';
import '../master.css';

export default function MasterCapitalPage(){return <main className="masterShell"><MasterSidebar active="capital"/><section className="masterMain"><header className="masterHeader"><div><div className="masterEyebrow">MASTER CONTROL / CAPITAL</div><h1>Capital</h1><p>Portfolio-level financial visibility and execution controls.</p></div></header><section className="portfolioStats"><Stat label="Portfolio revenue" value="€64,530" detail="+17.2% this cycle"/><Stat label="Portfolio profit" value="€21,180" detail="+€4,180 this cycle"/><Stat label="Available reserve" value="€500" detail="Emergency reserve"/><Stat label="Execution" value="OFF" detail="Real-money execution"/></section><section className="masterPanel"><div className="panelTitle"><div><h2>Capital policy</h2><span>Global safeguards before financial execution</span></div></div><div className="controlItem"><span>Simulated allocation</span><b>ON</b></div><div className="controlItem"><span>Real-money execution</span><b>OFF</b></div><div className="controlItem"><span>Human approval</span><b>REQUIRED</b></div></section></section></main>}
function Stat({label,value,detail}:{label:string;value:string;detail:string}){return <div className="portfolioStat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}
