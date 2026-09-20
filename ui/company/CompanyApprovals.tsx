'use client'

import { AlertTriangle, Ban, Check, Edit3, Eye, MoreHorizontal, ShieldCheck, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useCompanyRuntime } from '../../app/company/[companyId]/CompanyRuntimeContext'
import styles from '../../app/company/[companyId]/CompanyRuntimeWorkspace.module.css'

export default function ApprovalsModule() {
  const { runtime, approveDecision, rejectDecision } = useCompanyRuntime()
  const pending = runtime.brainDecisions.filter(decision => decision.status === 'APPROVAL_REQUIRED')

  const [selected, setSelected] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [notice, setNotice] = useState<string | null>(null)

  const recordAction = async (decisionId: string, action: string, optionId?: string, reason?: string, agentId?: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/company-brain/human-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: runtime.companyId ?? '', decisionId, action, optionId, reason, agentId }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.recorded) throw new Error(payload.reason ?? 'Action was not persisted.')
      setNotice(`Human action ${action} persisted to the audit trail.`)
      return true
    } catch {
      setNotice(`Human action ${action} could not be persisted. No external execution was authorized.`)
      return false
    }
  }

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

            {decision.options.length > 0 && <div className={styles.panel} style={{ marginTop: 18 }}>
              <header className={styles.panelHead}><div><small>AI ANALYSIS / ALTERNATIVES</small><h2>Possible solutions</h2></div><span>{decision.options.length} options</span></header>
              <div className={styles.grid}>
                {decision.options.map(option => {
                  const active = selected[decision.decisionId] === option.optionId
                  return <article key={option.optionId} className={styles.panel} style={{ border: active ? '1px solid var(--os-blue)' : undefined }}>
                    <header className={styles.panelHead}><div><small>{option.optionId}</small><h2>{option.title}</h2></div><b>{Math.round(option.confidence * 100)}%</b></header>
                    <p>{option.summary}</p>
                    <div className={styles.row}><div><Eye size={15}/></div><span><b>Expected impact</b><small>{option.expectedImpact}</small></span></div>
                    <div className={styles.row}><div><AlertTriangle size={15}/></div><span><b>Risks</b><small>{option.risks.length ? option.risks.join(' · ') : 'None declared'}</small></span></div>
                    {expanded[`${decision.decisionId}:${option.optionId}`] && <>
                      <div className={styles.row}><div><MoreHorizontal size={15}/></div><span><b>Details</b><small>{option.details.join(' · ')}</small></span></div>
                      <div className={styles.row}><div><ShieldCheck size={15}/></div><span><b>Dependencies</b><small>{option.dependencies.length ? option.dependencies.join(' · ') : 'None declared'}</small></span></div>
                      {option.cost && <div className={styles.row}><div><span>€</span></div><span><b>Cost</b><small>{option.cost}</small></span></div>}
                    </>}
                    <div className={styles.headActions}>
                      <button className={styles.secondary} onClick={() => setExpanded(v => ({ ...v, [`${decision.decisionId}:${option.optionId}`]: !v[`${decision.decisionId}:${option.optionId}`] }))}>{expanded[`${decision.decisionId}:${option.optionId}`] ? 'Hide details' : 'View details'}</button>
                      <button className={active ? styles.primary : styles.secondary} onClick={() => setSelected(v => ({ ...v, [decision.decisionId]: option.optionId }))}>{active ? 'Selected' : 'Select'}</button>
                    </div>
                  </article>
                })}
              </div>
            </div>}

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
              <button className={styles.primary} disabled={decision.options.length > 0 && !selected[decision.decisionId]} onClick={() => { void recordAction(decision.decisionId, 'ACCEPT', selected[decision.decisionId], 'Human accepted the selected solution.').then(recorded => { if (recorded) approveDecision(decision.decisionId) }) }}><Check size={15}/>Accept solution</button>
              <button className={styles.secondary} onClick={() => void recordAction(decision.decisionId, 'EDIT', selected[decision.decisionId], 'Human requested editing before execution.')}><Edit3 size={15}/>Edit</button>
              <button className={styles.secondary} onClick={() => void recordAction(decision.decisionId, 'INTERVENE', selected[decision.decisionId], 'Human intervention requested before execution.')}><Eye size={15}/>Intervene</button>
              <button className={styles.secondary} onClick={() => void recordAction(decision.decisionId, 'REQUEST_MORE_ANALYSIS', selected[decision.decisionId], 'Human requested additional analysis.')}><MoreHorizontal size={15}/>More analysis</button>
              <button className={styles.secondary} onClick={() => { void recordAction(decision.decisionId, 'DELETE_PLAN', selected[decision.decisionId], 'Human deleted the proposed plan.'); rejectDecision(decision.decisionId) }}><Trash2 size={15}/>Delete plan</button>
              <button className={styles.secondary} onClick={() => void recordAction(decision.decisionId, 'BLOCK_PLAN', selected[decision.decisionId], 'Human blocked this plan from being proposed again.')}><Ban size={15}/>Block</button>
              <button className={styles.secondary} onClick={() => void recordAction(decision.decisionId, 'BLOCK_AGENT', undefined, 'Human blocked the decision-producing agent.', 'company-brain-agent')}><X size={15}/>Block agent</button>
            </div>
          </section>
        ))}
      </div>
    )}
    {notice && <div className={styles.director} style={{ marginTop: 18 }}><div><small>HUMAN CONTROL</small><b>{notice}</b><span>External side effects remain behind the execution and governance boundaries.</span></div><button className={styles.secondary} onClick={() => setNotice(null)}>Close</button></div>}
  </>
}
