'use client'

import { AlertTriangle, Check, ShieldCheck, X } from 'lucide-react'
import { useCompanyRuntime } from '../../app/company/[companyId]/CompanyRuntimeContext'
import styles from '../../app/company/[companyId]/CompanyRuntimeWorkspace.module.css'

export default function ApprovalsModule() {
  const { runtime, approveDecision, rejectDecision } = useCompanyRuntime()
  const pending = runtime.brainDecisions.filter(decision => decision.status === 'APPROVAL_REQUIRED')

  return <>
    <div className={styles.pageHead}>
      <div>
        <small className={styles.eyebrow}>HUMAN CONTROL PLANE / RISK GATE</small>
        <h1>Human Approval</h1>
        <p>Decisões de agentes que exigem autorização antes de entrar no execution queue.</p>
      </div>
      <div className={styles.headActions}>
        <span className={styles.live}><i/>{pending.length} PENDING</span>
      </div>
    </div>

    {pending.length === 0 ? (
      <section className={styles.panel}>
        <div className={styles.row}>
          <div><ShieldCheck size={18}/></div>
          <span><b>No pending approvals</b><small>The runtime has no decisions waiting for human authorization.</small></span>
          <strong className={styles.good}>CLEAR</strong>
        </div>
      </section>
    ) : (
      <div className={styles.grid}>
        {pending.map(decision => (
          <section className={styles.panel} key={decision.decisionId}>
            <header className={styles.panelHead}>
              <div>
                <small>DECISION {decision.decisionId}</small>
                <h2>{decision.objective}</h2>
              </div>
              <span className={styles.live}><i/> {decision.riskLevel}</span>
            </header>

            <p>{decision.reason}</p>

            <div className={styles.kpis}>
              <div className={styles.kpi}><header><span>RISK</span><AlertTriangle size={16}/></header><b>{decision.riskLevel}</b><small>Approval boundary</small></div>
              <div className={styles.kpi}><header><span>CONFIDENCE</span><ShieldCheck size={16}/></header><b>{Math.round(decision.confidence * 100)}%</b><small>Model confidence</small></div>
              <div className={styles.kpi}><header><span>ACTION</span><ShieldCheck size={16}/></header><b>{decision.action}</b><small>No external side effect yet</small></div>
            </div>

            <div className={styles.row}>
              <div><ShieldCheck size={16}/></div>
              <span><b>Preconditions</b><small>{decision.preconditions.length ? decision.preconditions.join(' · ') : 'No additional preconditions declared.'}</small></span>
            </div>

            <div className={styles.headActions}>
              <button className={styles.primary} onClick={() => approveDecision(decision.decisionId)}><Check size={15}/>Approve</button>
              <button className={styles.secondary} onClick={() => rejectDecision(decision.decisionId)}><X size={15}/>Reject</button>
            </div>
          </section>
        ))}
      </div>
    )}
  </>
}
