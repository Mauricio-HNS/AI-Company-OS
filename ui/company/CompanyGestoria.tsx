'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileCheck2, FileText, Plus, ShieldCheck, UserPlus } from 'lucide-react'
import styles from '../../app/company/[companyId]/CompanyRuntimeWorkspace.module.css'

type Check = { label: string; ok: boolean; detail: string }

const checks: Check[] = [
  { label: 'Base imponible ↔ IVA calculado', ok: false, detail: 'Diferencia detectada: 0,01 €' },
  { label: 'IVA de facturas ↔ declaración', ok: true, detail: 'Sin diferencias' },
  { label: 'Total facturas ↔ libro de IVA', ok: true, detail: 'Conciliado' },
  { label: 'Campos obligatorios del período', ok: true, detail: 'Completos' },
]

export default function GestoriaModule() {
  const [section, setSection] = useState<'fiscal'|'company'|'employee'|'contract'>('fiscal')
  const [confirmed, setConfirmed] = useState(false)
  const [companyCreated, setCompanyCreated] = useState(false)
  const [employeeReady, setEmployeeReady] = useState(false)

  const riskCount = useMemo(() => checks.filter(x => !x.ok).length, [])

  return <MetricModule eyebrow="BUSINESS / GESTORÍA" title="Gestoría & Compliance" desc="Asistencia administrativa con validación cruzada y aprobación humana antes de cualquier trámite oficial.">
    <div className={styles.kpis}>
      <Kpi label="Validaciones" value="4" change="Período actual" />
      <Kpi label="Incidencias" value={String(riskCount)} change="Revisión necesaria" />
      <Kpi label="Documentos" value="12" change="Listos para revisar" />
      <Kpi label="Acciones externas" value="0" change="Siempre con aprobación" />
    </div>
    <div className={styles.module}>
      <section className={styles.panel}>
        <div className={styles.tabs}>
          <button className={section === 'fiscal' ? styles.primary : styles.secondary} onClick={() => setSection('fiscal')}><FileCheck2 size={15}/>Fiscal</button>
          <button className={section === 'company' ? styles.primary : styles.secondary} onClick={() => setSection('company')}><Plus size={15}/>Crear empresa</button>
          <button className={section === 'employee' ? styles.primary : styles.secondary} onClick={() => setSection('employee')}><UserPlus size={15}/>Alta trabajador</button>
          <button className={section === 'contract' ? styles.primary : styles.secondary} onClick={() => setSection('contract')}><FileText size={15}/>Contrato</button>
        </div>
        {section === 'fiscal' && <FiscalSection confirmed={confirmed} onConfirm={() => setConfirmed(true)}/>}
        {section === 'company' && <CompanySection created={companyCreated} onCreate={() => setCompanyCreated(true)}/>}
        {section === 'employee' && <EmployeeSection ready={employeeReady} onReady={() => setEmployeeReady(true)}/>}
        {section === 'contract' && <ContractSection/>}
      </section>
      <aside className={styles.panel}><small>CONTROL PLANE</small><h2>Human approval</h2><p>La IA puede preparar, comprobar y documentar el trámite. La presentación oficial queda bloqueada hasta que el responsable confirme.</p><div className={styles.callout}><ShieldCheck size={16}/><span>External side effects <b>OFF</b></span></div></aside>
    </div>
  </MetricModule>
}

function FiscalSection({ confirmed, onConfirm }: { confirmed: boolean; onConfirm: () => void }) {
  return <><small>FISCAL BRAIN / RECONCILIACIÓN</small><h2>Fechamento estruturado antes de presentar</h2><p>O Fiscal Brain recalcula neto, impuesto y total a partir das entradas registradas, compara o valor declarado e bloqueia o fechamento quando existe inconsistência.</p>{checks.map(x => <div className={styles.row} key={x.label}><div>{x.ok ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}</div><span><b>{x.label}</b><small>{x.detail}</small></span><strong className={x.ok ? styles.good : ''}>{x.ok ? 'OK' : 'CORREGIR'}</strong></div>)}<div className={styles.callout}><AlertTriangle size={16}/><span>O período fica bloqueado enquanto houver inconsistências; um fechamento sem alertas segue para aprovação humana.</span></div><div className={styles.callout}><FileCheck2 size={16}/><span>Fechamento mensal/trimestral persistido com diferença calculada e Audit Journal.</span></div><button className={styles.primary} disabled={confirmed} onClick={onConfirm}>{confirmed ? 'Revisión confirmada' : 'Confirmar revisión'}</button></>
}

function CompanySection({ created, onCreate }: { created: boolean; onCreate: () => void }) {
  return <><small>COMPANY FORMATION</small><h2>Creación de una Sociedad Limitada</h2><p>Flujo guiado para recopilar datos, preparar documentación y organizar los pasos ante los organismos correspondientes.</p>{['Datos de socios / administrador','Denominación y objeto social','Domicilio y actividad','Capital social','Documentación y autorizaciones'].map((x,i)=><div className={styles.row} key={x}><div><FileCheck2 size={16}/></div><span><b>{x}</b><small>{i < 2 ? 'Required' : 'Pending / guided'}</small></span><strong>{i < 2 ? 'READY' : 'PENDING'}</strong></div>)}<div className={styles.callout}><ShieldCheck size={16}/><span>La IA prepara el expediente; cualquier presentación oficial requiere autorización.</span></div><button className={styles.primary} onClick={onCreate}>{created ? 'Expediente preparado' : 'Preparar expediente'}</button></>
}

function EmployeeSection({ ready, onReady }: { ready: boolean; onReady: () => void }) {
  return <><small>EMPLOYEE ONBOARDING</small><h2>Alta de trabajador</h2><p>El asistente recopila únicamente los datos necesarios y valida la coherencia antes de preparar el alta.</p>{['Foto / documento de identidad','Número de Seguridad Social','Fecha de nacimiento y domicilio','Puesto, convenio y grupo de cotización','Jornada, horas y fecha de inicio','Salario bruto y pagas'].map((x,i)=><div className={styles.row} key={x}><div><UserPlus size={16}/></div><span><b>{x}</b><small>{i === 0 ? 'Documento' : 'Required field'}</small></span><strong>{i === 0 ? 'UPLOAD' : 'REQUIRED'}</strong></div>)}<button className={styles.primary} onClick={onReady}>{ready ? 'Datos validados' : 'Validar datos'}</button></>
}

function ContractSection() {
  return <><small>DOCUMENT GENERATOR</small><h2>Contrato listo para revisar, imprimir y firmar</h2><p>Plantilla en blanco para contrato indefinido a tiempo parcial. Los campos se rellenan después de validar empresa, trabajador, jornada, convenio y salario.</p><div className={styles.panel}><div className={styles.row}><div><FileText size={16}/></div><span><b>Contrato de trabajo indefinido a tiempo parcial</b><small>Empresa: ____________________ · Trabajador: ____________________</small></span><strong>PREVIEW</strong></div><p>Fecha de inicio: ____ / ____ / ______<br/>Puesto: ____________________<br/>Jornada: ______ horas semanales<br/>Salario bruto: __________ € / mes<br/>Convenio colectivo: ____________________</p><div className={styles.callout}><FileCheck2 size={16}/><span>El documento final se genera después de validar los datos y la normativa aplicable.</span></div><button className={styles.secondary}>Vista previa del contrato</button></div></>
}

function Kpi({ label, value, change }: { label: string; value: string; change: string }) { return <div className={styles.kpi}><header><span>{label}</span><FileCheck2 size={15}/></header><b>{value}</b><small>{change}</small></div> }
function MetricModule({ eyebrow, title, desc, children }: { eyebrow: string; title: string; desc: string; children: React.ReactNode }) { return <><div className={styles.pageHead}><div><small className={styles.eyebrow}>{eyebrow}</small><h1>{title}</h1><p>{desc}</p></div><div className={styles.headActions}><span className={styles.live}><i/>CONTROLLED</span></div></div>{children}</> }
