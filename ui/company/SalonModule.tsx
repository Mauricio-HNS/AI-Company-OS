'use client'

import { useMemo, useState } from 'react'
import { Activity, CalendarDays, Camera, CheckCircle2, CircleDollarSign, ClipboardList, Clock3, FileText, Package, Scissors, ShieldCheck, Sparkles, TrendingUp, Users, WalletCards } from 'lucide-react'
import styles from './SalonModule.module.css'

type Section = 'overview'|'agenda'|'staff'|'commissions'|'fiscal'|'cameras'|'inventory'|'marketing'

const services = [
  { name: 'Corte feminino', price: 32, commission: 0.4 },
  { name: 'Corte masculino', price: 20, commission: 0.4 },
  { name: 'Coloração', price: 75, commission: 0.35 },
  { name: 'Mechas', price: 120, commission: 0.35 },
  { name: 'Tratamento capilar', price: 45, commission: 0.3 },
]

const staff = [
  { name: 'Marina', role: 'Cabeleireira', sales: 4820, commission: 1928, hours: '38h' },
  { name: 'Carlos', role: 'Barbeiro', sales: 3650, commission: 1460, hours: '36h' },
  { name: 'Sofia', role: 'Colorista', sales: 5210, commission: 1824, hours: '39h' },
  { name: 'Ana', role: 'Recepção', sales: 1280, commission: 256, hours: '32h' },
]

const appointments = [
  ['09:00','Marina','Corte + escova','Laura M.'],
  ['10:00','Sofia','Coloração','Patricia R.'],
  ['11:30','Carlos','Corte masculino','Miguel A.'],
  ['14:00','Marina','Corte feminino','Carolina S.'],
  ['15:30','Sofia','Mechas','Beatriz L.'],
  ['17:00','Carlos','Corte + barba','Daniel P.'],
]

export default function SalonModule() {
  const [section, setSection] = useState<Section>('overview')
  const [ai, setAi] = useState(true)

  const totalSales = useMemo(() => staff.reduce((sum, x) => sum + x.sales, 0), [])
  const totalCommission = useMemo(() => staff.reduce((sum, x) => sum + x.commission, 0), [])

  const tabs: Array<[Section,string]> = [
    ['overview','Visão geral'], ['agenda','Agenda'], ['staff','Profissionais'], ['commissions','Comissões'],
    ['fiscal','Hacienda / Fiscal'], ['cameras','Câmeras & Intelligence'], ['inventory','Estoque'], ['marketing','Marketing AI'],
  ]

  return <div className={styles.shell}>
    <header className={styles.head}>
      <div>
        <small>AI COMPANY OS / SALÃO</small>
        <h1>Salão inteligente</h1>
        <p>Operação, pessoas, clientes, financeiro e automação em um único comando.</p>
      </div>
      <div className={styles.headActions}>
        <span className={styles.live}><i/>AI {ai ? 'ATIVA' : 'PAUSADA'}</span>
        <button onClick={() => setAi(!ai)}>{ai ? 'Pausar IA' : 'Ativar IA'}</button>
      </div>
    </header>

    <nav className={styles.tabs}>{tabs.map(([key,label]) => <button key={key} className={section===key ? styles.active : ''} onClick={() => setSection(key)}>{label}</button>)}</nav>

    {section === 'overview' && <Overview totalSales={totalSales} totalCommission={totalCommission} onSection={setSection}/>}
    {section === 'agenda' && <Agenda/>}
    {section === 'staff' && <Staff/>}
    {section === 'commissions' && <Commissions totalSales={totalSales} totalCommission={totalCommission}/>}
    {section === 'fiscal' && <Fiscal/>}
    {section === 'cameras' && <Cameras/>}
    {section === 'inventory' && <Inventory/>}
    {section === 'marketing' && <Marketing/>}
  </div>
}

function Overview({ totalSales,totalCommission,onSection }:{totalSales:number;totalCommission:number;onSection:(x:Section)=>void}) {
  return <>
    <div className={styles.kpis}>
      <Kpi icon={<CircleDollarSign/>} label="Faturamento do mês" value={money(totalSales)} note="+12,4% vs. mês anterior"/>
      <Kpi icon={<Users/>} label="Clientes atendidos" value="428" note="86 clientes recorrentes"/>
      <Kpi icon={<CalendarDays/>} label="Ocupação" value="82%" note="Pico: 16h–19h"/>
      <Kpi icon={<WalletCards/>} label="Comissões" value={money(totalCommission)} note="Fechamento em 8 dias"/>
    </div>
    <div className={styles.grid}>
      <Panel title="AI DIRECTOR" icon={<Sparkles/>}>
        <div className={styles.aiBox}><b>O que precisa acontecer agora?</b><p>Existem 11 horários vazios amanhã. A IA pode segmentar clientes que não visitam o salão há mais de 60 dias e preparar uma campanha para preencher esses horários.</p><button onClick={() => onSection('marketing')}>Criar campanha</button></div>
      </Panel>
      <Panel title="OPERAÇÃO DE HOJE" icon={<Activity/>}>
        <List items={[['Agenda','28 atendimentos confirmados'],['Recepção','4 confirmações pendentes'],['Estoque','2 produtos abaixo do mínimo'],['Financeiro','Fechamento diário disponível']]}/>
      </Panel>
    </div>
    <div className={styles.grid}>
      <Panel title="SINAL COMERCIAL" icon={<TrendingUp/>}><div className={styles.signal}><strong>+18%</strong><span>receita de clientes recorrentes</span><div className={styles.bar}><i style={{width:'78%'}}/></div><small>Meta mensal: +20%</small></div></Panel>
      <Panel title="DECISÕES DO PROPRIETÁRIO" icon={<ShieldCheck/>}><div className={styles.approval}><b>1 decisão recomendada</b><p>Aprovar €150 de orçamento para preencher os horários ociosos de amanhã.</p><button onClick={() => onSection('marketing')}>Revisar</button></div></Panel>
    </div>
  </>
}

function Agenda(){ return <><div className={styles.kpis}><Kpi icon={<CalendarDays/>} label="Hoje" value="28" note="atendimentos"/><Kpi icon={<Clock3/>} label="Horários livres" value="11" note="amanhã"/><Kpi icon={<CheckCircle2/>} label="Confirmados" value="25" note="89% da agenda"/><Kpi icon={<Users/>} label="Lista de espera" value="7" note="clientes"/></div><Panel title="AGENDA DE HOJE" icon={<CalendarDays/>}><div className={styles.table}>{appointments.map(a=><div className={styles.tableRow} key={a.join('-')}><b>{a[0]}</b><span>{a[1]}</span><span>{a[2]}</span><span>{a[3]}</span><em>CONFIRMADO</em></div>)}</div></Panel></> }

function Staff(){ return <><div className={styles.kpis}><Kpi icon={<Users/>} label="Profissionais" value="4" note="2 especialistas / 2 atendimento"/><Kpi icon={<TrendingUp/>} label="Produção" value={money(14960)} note="este mês"/><Kpi icon={<Activity/>} label="Atendimento" value="94%" note="índice operacional"/><Kpi icon={<ClipboardList/>} label="Metas" value="3/4" note="em andamento"/></div><Panel title="EQUIPE" icon={<Users/>}><div className={styles.table}>{staff.map(x=><div className={styles.tableRow} key={x.name}><b>{x.name}</b><span>{x.role}</span><span>{money(x.sales)}</span><span>{money(x.commission)}</span><span>{x.hours}</span><em>ATIVO</em></div>)}</div></Panel></> }

function Commissions({totalSales,totalCommission}:{totalSales:number;totalCommission:number}){ return <><div className={styles.kpis}><Kpi icon={<CircleDollarSign/>} label="Produção" value={money(totalSales)} note="base de comissão"/><Kpi icon={<WalletCards/>} label="Comissões" value={money(totalCommission)} note="a pagar"/><Kpi icon={<TrendingUp/>} label="Ticket médio" value="€52,40" note="+6,2%"/><Kpi icon={<CheckCircle2/>} label="Fechamento" value="92%" note="período atual"/></div><Panel title="REGRAS DE COMISSÃO" icon={<WalletCards/>}><div className={styles.rules}>{services.map(s=><div key={s.name}><span>{s.name}</span><b>{s.commission*100}%</b><small>ex.: {money(s.price)} → {money(s.price*s.commission)} profissional</small></div>)}</div><div className={styles.note}>A folha pode combinar salário fixo + comissão + bônus + gorjetas. O sistema registra a regra aplicada e mantém o histórico do fechamento.</div></Panel></> }

function Fiscal(){ return <><div className={styles.kpis}><Kpi icon={<FileText/>} label="Faturado" value={money(14960)} note="mês atual"/><Kpi icon={<WalletCards/>} label="Despesas" value="€5.420" note="classificadas"/><Kpi icon={<CircleDollarSign/>} label="IVA" value="€2.617" note="estimativa configurada"/><Kpi icon={<ShieldCheck/>} label="Conformidade" value="94%" note="documentos organizados"/></div><div className={styles.grid}><Panel title="CENTRO FISCAL" icon={<FileText/>}><List items={[['Faturas emitidas','124 documentos'],['Despesas','68 documentos classificados'],['IVA','Período mensal configurado'],['IRPF','Conforme regime cadastrado'],['Asesor fiscal','Relatório pronto para revisão']]}/></Panel><Panel title="CONTROLE" icon={<ShieldCheck/>}><div className={styles.aiBox}><b>Fiscal não é decisão automática</b><p>O OS organiza dados, calcula conforme as regras cadastradas e gera relatórios para o asesor. O regime e os critérios fiscais devem ser validados pelo profissional responsável.</p><button>Gerar relatório</button></div></Panel></div></> }

function Cameras(){ return <><div className={styles.kpis}><Kpi icon={<Camera/>} label="Câmeras" value="6" note="conectadas"/><Kpi icon={<Activity/>} label="Ocupação" value="76%" note="área de atendimento"/><Kpi icon={<Clock3/>} label="Espera média" value="8 min" note="tempo operacional"/><Kpi icon={<ShieldCheck/>} label="Privacidade" value="Ativa" note="políticas configuradas"/></div><div className={styles.grid}><Panel title="COMPUTER VISION" icon={<Camera/>}><List items={[['Fluxo de clientes','pico entre 16h e 19h'],['Filas','nenhuma fila crítica'],['Ocupação','área de corte 82%'],['Espera','média de 8 minutos']]}/></Panel><Panel title="ANÁLISE DE EQUIPE" icon={<Users/>}><div className={styles.aiBox}><b>Métricas operacionais, não vigilância invasiva</b><p>O módulo pode cruzar horários, atendimentos, tempos e feedbacks para identificar gargalos. Qualquer monitoramento de pessoas deve respeitar transparência, finalidade e proteção de dados.</p><button>Ver inteligência</button></div></Panel></div></> }

function Inventory(){ return <><div className={styles.kpis}><Kpi icon={<Package/>} label="Itens" value="184" note="SKUs ativos"/><Kpi icon={<ClipboardList/>} label="Abaixo do mínimo" value="7" note="reposição sugerida"/><Kpi icon={<CircleDollarSign/>} label="Valor em estoque" value="€8.420" note="custo"/><Kpi icon={<TrendingUp/>} label="Giro" value="4,8x" note="mensal"/></div><Panel title="ESTOQUE INTELIGENTE" icon={<Package/>}><div className={styles.table}>{[['Tinta 6.0','12','20','REPOR'],['Shampoo profissional','31','15','OK'],['Máscara capilar','8','12','REPOR'],['Luvas descartáveis','140','80','OK']].map(x=><div className={styles.tableRow} key={x[0]}><b>{x[0]}</b><span>Atual: {x[1]}</span><span>Mínimo: {x[2]}</span><em>{x[3]}</em></div>)}</div></Panel></> }

function Marketing(){ return <><div className={styles.kpis}><Kpi icon={<TrendingUp/>} label="Leads" value="186" note="+21%"/><Kpi icon={<Users/>} label="Clientes reativáveis" value="64" note="sem visita >60 dias"/><Kpi icon={<Sparkles/>} label="Campanhas AI" value="5" note="3 ativas"/><Kpi icon={<CircleDollarSign/>} label="Receita atribuída" value="€3.840" note="este mês"/></div><div className={styles.grid}><Panel title="AI MARKETING DIRECTOR" icon={<Sparkles/>}><div className={styles.aiBox}><b>Campanha sugerida: preencher horários vazios</b><p>Público: 64 clientes inativos. Oferta: benefício para horários de menor ocupação. Orçamento sugerido: €150. O agente prepara texto, público, calendário e acompanhamento.</p><button>Preparar campanha</button></div></Panel><Panel title="CICLO AUTÔNOMO" icon={<Activity/>}><List items={[['Detectar','horários vazios'],['Segmentar','clientes adequados'],['Criar','campanha'],['Pedir aprovação','se houver orçamento'],['Medir','conversão e retorno']]}/></Panel></div></> }

function Panel({title,icon,children}:{title:string;icon:React.ReactNode;children:React.ReactNode}){return <section className={styles.panel}><header><div>{icon}<small>{title}</small></div></header>{children}</section>}
function Kpi({icon,label,value,note}:{icon:React.ReactNode;label:string;value:string;note:string}){return <div className={styles.kpi}><header>{icon}<small>{label}</small></header><b>{value}</b><span>{note}</span></div>}
function List({items}:{items:string[][]}){return <div className={styles.list}>{items.map(([a,b])=><div key={a}><b>{a}</b><span>{b}</span></div>)}</div>}
function money(value:number){return new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(value)}
