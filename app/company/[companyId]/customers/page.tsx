'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BrainCircuit,
  ChevronRight,
  CircleAlert,
  Filter,
  HeartPulse,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import './customers.css';

const nav = [
  ['Command Center', ''],
  ['Agents', 'agents'],
  ['Missions', 'missions'],
  ['Tasks', 'tasks'],
  ['Products', 'products'],
  ['Customers', 'customers'],
  ['Finance', 'finance'],
  ['Intelligence', 'intelligence'],
  ['Knowledge', 'knowledge'],
  ['Operations', 'operations'],
  ['Security', 'security'],
  ['Settings', 'settings'],
];

const customers = [
  { id: 'CUS-104', name: 'Acme Systems', segment: 'Enterprise', product: 'Revenue Copilot', stage: 'RETAIN', mrr: '€1,840', health: 96, trend: '+12%', agent: 'Customer Agent', risk: 'LOW' },
  { id: 'CUS-118', name: 'Iberia Labs', segment: 'Growth', product: 'Revenue Copilot', stage: 'EXPAND', mrr: '€980', health: 91, trend: '+24%', agent: 'Growth Agent', risk: 'LOW' },
  { id: 'CUS-127', name: 'Nova Commerce', segment: 'Growth', product: 'Commerce Autopilot', stage: 'CONVERT', mrr: '€620', health: 78, trend: '+8%', agent: 'Sales Agent', risk: 'MEDIUM' },
  { id: 'CUS-131', name: 'Atlas Works', segment: 'SMB', product: 'Ops Intelligence', stage: 'QUALIFY', mrr: '€240', health: 72, trend: 'NEW', agent: 'Sales Agent', risk: 'MEDIUM' },
  { id: 'CUS-142', name: 'Northstar Group', segment: 'Enterprise', product: 'Revenue Copilot', stage: 'AT-RISK', mrr: '€1,420', health: 54, trend: '-18%', agent: 'Retention Agent', risk: 'HIGH' },
];

const segments = [
  { name: 'Enterprise', customers: 24, revenue: '€5,980', retention: '97%', color: 'champagne' },
  { name: 'Growth', customers: 71, revenue: '€3,920', retention: '94%', color: 'sage' },
  { name: 'SMB', customers: 84, revenue: '€1,700', retention: '88%', color: 'steel' },
  { name: 'At-risk', customers: 12, revenue: '€820', retention: '61%', color: 'alert' },
];

const funnel = [
  ['DISCOVER', 1240, 100],
  ['QUALIFY', 486, 39],
  ['CONVERT', 231, 19],
  ['RETAIN', 179, 14],
  ['EXPAND', 64, 5],
];

export default function CustomersCommandCenter({ params }: { params: { companyId: string } }) {
  const { companyId } = params;
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('ALL');
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState(customers[0].id);

  const visibleCustomers = useMemo(() => customers.filter((customer) => {
    const matchesQuery = `${customer.name} ${customer.product} ${customer.segment}`.toLowerCase().includes(query.toLowerCase());
    const matchesSegment = segment === 'ALL' || customer.segment.toUpperCase() === segment;
    return matchesQuery && matchesSegment;
  }), [query, segment]);

  const selected = customers.find((customer) => customer.id === selectedId) ?? customers[0];

  const runAction = () => {
    setRunning(true);
    window.setTimeout(() => setRunning(false), 1400);
  };

  return (
    <main className="customers-shell">
      <aside className="customers-sidebar">
        <Link href="/portfolio" className="customers-brand">
          <span className="brand-mark"><Sparkles size={17} /></span>
          <span><b>AI COMPANY OS</b><small>COMPANY CONTROL</small></span>
        </Link>

        <div className="company-mini">
          <div className="company-avatar">A</div>
          <div><strong>Company {companyId === 'alpha' ? 'Alpha' : companyId}</strong><span>SIMULATION MODE</span></div>
        </div>

        <nav className="customers-nav">
          {nav.map(([label, path]) => {
            const active = label === 'Customers';
            return (
              <Link key={label} href={`/company/${companyId}/${path}`} className={active ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon"><LayoutDashboard size={16} /></span>
                <span>{label}</span>
                {active && <i />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-safe">
          <ShieldCheck size={16} />
          <div><b>Simulation Safe</b><span>External actions blocked</span></div>
        </div>
      </aside>

      <section className="customers-main">
        <header className="customers-topbar">
          <div>
            <span className="eyebrow"><Users size={13} /> CUSTOMER INTELLIGENCE</span>
            <h1>Customer Command Center</h1>
            <p>Turn demand into recurring revenue, retention and expansion.</p>
          </div>
          <div className="top-actions">
            <span className="system-state"><span /> LIVE SIMULATION</span>
            <button className="icon-btn" aria-label="Refresh"><RefreshCw size={17} /></button>
            <button className="primary-btn" onClick={runAction}><Plus size={16} /> New customer mission</button>
          </div>
        </header>

        <div className="customer-kpis">
          <div className="customer-kpi"><span>ACTIVE CUSTOMERS</span><strong>179</strong><small><TrendingUp size={13} /> +16.8% this cycle</small></div>
          <div className="customer-kpi"><span>NET MRR</span><strong>€11,600</strong><small><ArrowUpRight size={13} /> +€1,420 expansion</small></div>
          <div className="customer-kpi"><span>RETENTION</span><strong>93.4%</strong><small><HeartPulse size={13} /> +2.1 pts</small></div>
          <div className="customer-kpi"><span>AVG. LTV</span><strong>€2,840</strong><small><WalletCards size={13} /> +11.2% projected</small></div>
        </div>

        <div className="customer-grid">
          <section className="panel funnel-panel">
            <div className="panel-head"><div><span className="panel-kicker">CUSTOMER LIFECYCLE</span><h2>Revenue funnel</h2></div><span className="live-dot">AUTONOMOUS LOOP</span></div>
            <div className="funnel">
              {funnel.map(([label, value, percent], index) => (
                <div className="funnel-row" key={label as string}>
                  <div className="funnel-label"><span>{String(index + 1).padStart(2, '0')}</span><b>{label}</b></div>
                  <div className="funnel-track"><i style={{ width: `${Math.max(Number(percent), 8)}%` }} /></div>
                  <strong>{Number(value).toLocaleString()}</strong>
                </div>
              ))}
            </div>
            <div className="lifecycle"><span>DISCOVER</span><ChevronRight size={13} /><span>QUALIFY</span><ChevronRight size={13} /><span>CONVERT</span><ChevronRight size={13} /><span>RETAIN</span><ChevronRight size={13} /><span>EXPAND</span></div>
          </section>

          <section className="panel agent-panel">
            <div className="panel-head"><div><span className="panel-kicker">AI WORKFORCE</span><h2>Customer Agent</h2></div><span className="agent-status">WORKING</span></div>
            <div className="agent-identity"><div className="agent-orb"><BrainCircuit size={23} /></div><div><strong>Customer Growth Agent</strong><span>Lifecycle & Revenue</span></div><span className="agent-score">94</span></div>
            <p className="agent-objective">Identify the highest-value customer action and protect recurring revenue without exceeding company authority.</p>
            <div className="agent-actions">
              <div><span>Next best action</span><b>Recover Northstar Group</b></div>
              <div><span>Expected impact</span><b>+€1,420 retained MRR</b></div>
            </div>
            <button className="wide-btn" onClick={runAction}>{running ? 'SIMULATING ACTION...' : 'Run customer mission'} <ArrowUpRight size={15} /></button>
          </section>
        </div>

        <div className="customer-grid lower">
          <section className="panel customer-list-panel">
            <div className="panel-head"><div><span className="panel-kicker">CUSTOMER BASE</span><h2>Live customer intelligence</h2></div><span className="count-pill">{visibleCustomers.length} visible</span></div>
            <div className="customer-toolbar">
              <div className="search-box"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers, products..." /></div>
              <div className="filter-wrap"><Filter size={14} /><select value={segment} onChange={(e) => setSegment(e.target.value)}><option value="ALL">All segments</option><option value="ENTERPRISE">Enterprise</option><option value="GROWTH">Growth</option><option value="SMB">SMB</option></select></div>
            </div>
            <div className="customer-table-head"><span>CUSTOMER</span><span>PRODUCT</span><span>MRR</span><span>HEALTH</span><span>STAGE</span></div>
            <div className="customer-rows">
              {visibleCustomers.map((customer) => (
                <button key={customer.id} className={selected.id === customer.id ? 'customer-row selected' : 'customer-row'} onClick={() => setSelectedId(customer.id)}>
                  <div className="customer-name"><div className="customer-avatar">{customer.name.slice(0, 1)}</div><span><b>{customer.name}</b><small>{customer.segment} · {customer.id}</small></span></div>
                  <span className="product-name">{customer.product}</span>
                  <strong>{customer.mrr}</strong>
                  <span className={`health health-${customer.health < 60 ? 'bad' : customer.health < 80 ? 'warn' : 'good'}`}><i />{customer.health}</span>
                  <span className={`stage stage-${customer.stage.toLowerCase()}`}>{customer.stage}</span>
                  <MoreHorizontal size={15} />
                </button>
              ))}
            </div>
          </section>

          <aside className="panel detail-panel">
            <div className="detail-head"><span className="panel-kicker">CUSTOMER PROFILE</span><span className={`risk risk-${selected.risk.toLowerCase()}`}>{selected.risk} RISK</span></div>
            <div className="detail-hero"><div className="detail-avatar">{selected.name.slice(0, 1)}</div><div><h2>{selected.name}</h2><span>{selected.segment} · {selected.product}</span></div></div>
            <div className="detail-metrics"><div><span>MRR</span><strong>{selected.mrr}</strong></div><div><span>HEALTH</span><strong>{selected.health}/100</strong></div><div><span>TREND</span><strong>{selected.trend}</strong></div></div>
            <div className="health-meter"><div><span>Customer health</span><b>{selected.health}%</b></div><i><em style={{ width: `${selected.health}%` }} /></i></div>
            <div className="next-action"><div className="action-icon"><Target size={16} /></div><div><span>NEXT BEST ACTION</span><b>{selected.risk === 'HIGH' ? 'Launch retention recovery mission' : selected.stage === 'EXPAND' ? 'Propose expansion package' : 'Advance lifecycle stage'}</b><small>Owned by {selected.agent}</small></div></div>
            <button className="message-btn" onClick={runAction}><MessageSquare size={15} /> Simulate customer outreach</button>
            <div className="detail-safe"><CircleAlert size={14} /><span>No real message, CRM update or payment action will be executed.</span></div>
          </aside>
        </div>

        <section className="panel segment-panel">
          <div className="panel-head"><div><span className="panel-kicker">PORTFOLIO SEGMENTS</span><h2>Where the company is making money</h2></div><Package size={18} /></div>
          <div className="segments">
            {segments.map((item) => <div className={`segment-card ${item.color}`} key={item.name}><div className="segment-top"><span>{item.name}</span><ArrowUpRight size={14} /></div><strong>{item.customers}</strong><small>customers</small><div className="segment-bottom"><span>{item.revenue} MRR</span><b>{item.retention} retention</b></div></div>)}
          </div>
        </section>

        <div className="safety-banner"><ShieldCheck size={17} /><div><b>Simulation boundary active</b><span>AI agents can analyze customers, plan missions and simulate outreach. Real messages, CRM mutations, contracts, payments and withdrawals remain blocked.</span></div><span className="safe-chip">SAFE</span></div>
      </section>
    </main>
  );
}
