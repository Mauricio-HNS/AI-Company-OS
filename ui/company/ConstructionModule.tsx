'use client'

import { useMemo, useState } from 'react'
import { Calculator, CheckCircle2, CircleDollarSign, FileText, Hammer, Plus, Receipt, Users, Wallet } from 'lucide-react'
import styles from '../../app/company/[companyId]/CompanyRuntimeWorkspace.module.css'
import { formatMoney } from '../../lib/business-metrics'

type Expense = { id: number; category: string; description: string; amount: number }
type Payment = { id: number; label: string; percentage: number; amount: number; invoice: string; paid: boolean }

export default function ConstructionModule() {
  const [area, setArea] = useState(222.97)
  const [coats, setCoats] = useState(2)
  const [coverage, setCoverage] = useState(10)
  const [bucketLitres, setBucketLitres] = useState(15)
  const [days, setDays] = useState(5)
  const [workers, setWorkers] = useState(2)
  const [budget, setBudget] = useState(0)
  const [client, setClient] = useState('Cliente da obra')
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: 1, category: 'Material', description: 'Tinta — estimativa inicial', amount: 0 },
    { id: 2, category: 'Mão de obra', description: 'Equipe da obra', amount: 0 },
  ])
  const [payments, setPayments] = useState<Payment[]>([])
  const [nextExpense, setNextExpense] = useState({ category: 'Material', description: '', amount: '' })

  const calculation = useMemo(() => {
    const litres = coverage > 0 ? (area * coats) / coverage : 0
    const buckets = bucketLitres > 0 ? Math.ceil(litres / bucketLitres) : 0
    const workerDays = Math.max(0, workers) * Math.max(0, days)
    return { litres, buckets, workerDays }
  }, [area, coats, coverage, bucketLitres, days, workers])

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const received = payments.filter(payment => payment.paid).reduce((sum, payment) => sum + payment.amount, 0)
  const outstanding = Math.max(0, budget - received)
  const projectedProfit = budget - totalExpenses
  const margin = budget > 0 ? (projectedProfit / budget) * 100 : 0

  function createPaymentPlan() {
    const percentages = [40, 30, 30]
    setPayments(percentages.map((percentage, index) => ({
      id: index + 1,
      label: ['Entrada / início da obra', 'Parcela / meio da obra', 'Saldo / conclusão'][index],
      percentage,
      amount: budget * percentage / 100,
      invoice: 'FAT-' + String(index + 1).padStart(3, '0'),
      paid: false,
    })))
  }

  function togglePaid(id: number) {
    setPayments(current => current.map(payment => payment.id === id ? { ...payment, paid: !payment.paid } : payment))
  }

  function addExpense() {
    const amount = Number(nextExpense.amount.replace(',', '.'))
    if (!nextExpense.description.trim() || !Number.isFinite(amount) || amount <= 0) return
    setExpenses(current => [...current, { id: Date.now(), category: nextExpense.category, description: nextExpense.description.trim(), amount }])
    setNextExpense({ category: 'Material', description: '', amount: '' })
  }

  return <>
    <PageHead title="Obras & Orçamentos" text="Gestão de obras de reforma, pintura, orçamento, faturação, custos e margem.">
      <span className={styles.live}><i/>SIMULATION</span>
    </PageHead>

    <div className={styles.kpis}>
      <Kpi label="Orçamento da obra" value={formatMoney(budget)} icon={<CircleDollarSign/>}/>
      <Kpi label="Recebido" value={formatMoney(received)} icon={<Receipt/>}/>
      <Kpi label="Gastos registrados" value={formatMoney(totalExpenses)} icon={<Wallet/>}/>
      <Kpi label="Lucro projetado" value={formatMoney(projectedProfit)} icon={<Calculator/>}/>
      <Kpi label="Margem" value={budget > 0 ? margin.toFixed(1) + '%' : '—'} icon={<Hammer/>}/>
    </div>

    <section className={styles.module}>
      <section className={styles.panel}>
        <header className={styles.panelHead}><div><small>OBRA / PLANEJAMENTO</small><h2>Exemplo — pintura residencial</h2></div></header>
        <div className={styles.kpis}>
          <Field label="Cliente" value={client} onChange={setClient} type="text"/>
          <Field label="Área total (m²)" value={area} onChange={setArea}/>
          <Field label="Número de mãos" value={coats} onChange={setCoats}/>
          <Field label="Rendimento (m²/L/mão)" value={coverage} onChange={setCoverage}/>
          <Field label="Cubo / balde (L)" value={bucketLitres} onChange={setBucketLitres}/>
          <Field label="Prazo (dias)" value={days} onChange={setDays}/>
          <Field label="Pessoas" value={workers} onChange={setWorkers}/>
          <Field label="Orçamento (€)" value={budget} onChange={setBudget}/>
        </div>
        <div className={styles.callout}><Calculator size={18}/><span>Estimativa: <b>{calculation.litres.toFixed(1)} L</b> de tinta para {coats} mãos, equivalente a <b>{calculation.buckets} cubos de {bucketLitres} L</b>. O rendimento é editável porque varia conforme a tinta e a superfície.</span></div>
        <div className={styles.row}><div><Users size={16}/></div><span><b>Planejamento de equipe</b><small>{workers} pessoas × {days} dias = {calculation.workerDays} jornadas-pessoa</small></span><strong>{days <= 5 ? 'DENTRO DO PRAZO' : 'REVISAR PRAZO'}</strong></div>
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHead}><div><small>FATURAÇÃO</small><h2>3 pagamentos do cliente</h2></div><button onClick={createPaymentPlan}><FileText size={13}/> Gerar plano</button></header>
        {payments.length === 0 ? <div className={styles.callout}><FileText size={17}/><span>Informe o orçamento e gere as três faturas: início, meio e conclusão. O sistema mantém cada recebimento vinculado à obra.</span></div> :
          payments.map(payment => <div className={styles.row} key={payment.id}><div><Receipt size={16}/></div><span><b>{payment.invoice} · {payment.label}</b><small>{client} · {payment.percentage}% · {formatMoney(payment.amount)}</small></span><button className={styles.secondary} onClick={() => togglePaid(payment.id)}>{payment.paid ? 'Recebido' : 'Marcar recebido'}</button></div>)}
        {payments.length > 0 && <div className={styles.callout}><CircleDollarSign size={17}/><span>Em aberto: <b>{formatMoney(outstanding)}</b>. Todas as faturas são simuladas nesta fase.</span></div>}
      </section>
    </section>

    <section className={styles.module}>
      <section className={styles.panel}>
        <header className={styles.panelHead}><div><small>CONTROLE DE GASTOS</small><h2>Materiais, equipe e outros custos</h2></div></header>
        {expenses.map(expense => <div className={styles.row} key={expense.id}><div><Wallet size={16}/></div><span><b>{expense.category}</b><small>{expense.description}</small></span><strong>{formatMoney(expense.amount)}</strong></div>)}
        <div className={styles.kpis}>
          <Field label="Categoria" value={nextExpense.category} onChange={value => setNextExpense(current => ({ ...current, category: String(value) }))} type="text"/>
          <Field label="Descrição" value={nextExpense.description} onChange={value => setNextExpense(current => ({ ...current, description: String(value) }))} type="text"/>
          <Field label="Valor (€)" value={nextExpense.amount} onChange={value => setNextExpense(current => ({ ...current, amount: String(value) }))} type="text"/>
        </div>
        <button className={styles.primary} onClick={addExpense}><Plus size={15}/> Registrar gasto</button>
      </section>
      <aside className={styles.panel}>
        <small>RESULTADO DA OBRA</small>
        <h2>{formatMoney(projectedProfit)}</h2>
        <p>Lucro projetado = orçamento − gastos registrados.</p>
        <hr/>
        <p>Recebido <b>{formatMoney(received)}</b></p>
        <p>A receber <b>{formatMoney(outstanding)}</b></p>
        <p>Gastos <b>{formatMoney(totalExpenses)}</b></p>
        <div className={styles.callout}><CheckCircle2 size={16}/><span>O resultado fica associado à obra e pode alimentar o Finance Agent, Company Brain e o histórico de execução.</span></div>
      </aside>
    </section>
  </>
}

function PageHead({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return <div className={styles.pageHead}><div><small className={styles.eyebrow}>BUSINESS / CONSTRUCTION</small><h1>{title}</h1><p>{text}</p></div><div className={styles.headActions}>{children}</div></div>
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className={styles.kpi}><header><span>{label}</span>{icon}</header><b>{value}</b></div>
}

function Field({ label, value, onChange, type = 'number' }: { label: string; value: string | number; onChange: (value: string | number) => void; type?: string }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 11, opacity: .7 }}>{label}</span><input type={type} value={value} onChange={event => onChange(type === 'number' ? Number(event.target.value) : event.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)', color: 'inherit' }}/></label>
}
