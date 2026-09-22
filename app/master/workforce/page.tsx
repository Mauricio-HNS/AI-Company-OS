'use client';

import MasterSidebar from '../../../ui/master/MasterSidebar';
import '../master.css';

const rows=[['AI CEO','Strategy & orchestration','36','ONLINE'],['Marketing Agent','Marketing across companies','12','ONLINE'],['Sales Agent','Sales intelligence','12','ONLINE'],['Finance Agent','Financial monitoring','12','ONLINE'],['Operations Agent','Operations','12','ONLINE']];

export default function MasterWorkforcePage(){return <main className="masterShell"><MasterSidebar active="workforce"/><section className="masterMain"><header className="masterHeader"><div><div className="masterEyebrow">MASTER CONTROL / AI WORKFORCE</div><h1>AI Workforce</h1><p>Global view of the agents operating across the company network.</p></div></header><section className="masterBottomGrid"><div className="masterPanel"><div className="panelTitle"><div><h2>Agent network</h2><span>Operational state across all companies</span></div></div>{rows.map(r=><div className="masterActivityRow" key={r[0]}><div className="activityPulse"><i/></div><div className="activityCopy"><strong>{r[0]}</strong><span>{r[1]}</span></div><b>{r[2]} agents</b><small>{r[3]}</small></div>)}</div><div className="masterPanel"><div className="panelTitle"><div><h2>Control principle</h2><span>AI operates inside company boundaries</span></div></div><div className="controlItem"><span>Tenant isolation</span><b>ENFORCED</b></div><div className="controlItem"><span>Human approval</span><b>REQUIRED</b></div><div className="controlItem"><span>Real-money execution</span><b>OFF</b></div></div></section></section></main>}
