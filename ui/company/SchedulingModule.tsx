'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, MapPin, Plus, Sparkles, Users, Wrench } from 'lucide-react'
import type { SchedulingEvent, SchedulingEventType, SchedulingResource } from '../../domain/scheduling/scheduling'
import { hasSchedulingConflict } from '../../domain/scheduling/scheduling'
import styles from './SchedulingModule.module.css'

const resources: SchedulingResource[] = [
  { id: 'employee-ana', name: 'Ana · Técnica', type: 'EMPLOYEE', available: true },
  { id: 'employee-carlos', name: 'Carlos · Técnico', type: 'EMPLOYEE', available: true },
  { id: 'room-1', name: 'Sala 1', type: 'ROOM', available: true },
  { id: 'vehicle-1', name: 'Veículo de serviço', type: 'VEHICLE', available: true },
]

const seedEvents = (companyId: string): SchedulingEvent[] => [
  { id: 'evt-1', companyId, title: 'Visita ao cliente · García', type: 'VISIT', startsAt: '2026-09-22T10:00:00', endsAt: '2026-09-22T11:00:00', customer: 'García & Asociados', resourceIds: ['employee-ana', 'vehicle-1'], status: 'CONFIRMED', source: 'HUMAN', linkedEntityType: 'CUSTOMER', linkedEntityId: 'customer-garcia' },
  { id: 'evt-2', companyId, title: 'Manutenção preventiva', type: 'SERVICE', startsAt: '2026-09-22T14:00:00', endsAt: '2026-09-22T15:30:00', customer: 'Cafetería Madrid Centro', resourceIds: ['employee-carlos'], status: 'PLANNED', source: 'AI', linkedEntityType: 'SERVICE', linkedEntityId: 'service-maintenance' },
  { id: 'evt-3', companyId, title: 'Reunião comercial', type: 'MEETING', startsAt: '2026-09-23T09:30:00', endsAt: '2026-09-23T10:00:00', customer: 'Madrid Centro', resourceIds: ['room-1'], status: 'CONFIRMED', source: 'INTEGRATION', linkedEntityType: 'CUSTOMER', linkedEntityId: 'customer-madrid' },
]

function labelType(type: SchedulingEventType) { return ({ APPOINTMENT: 'Agendamento', RESERVATION: 'Reserva', DELIVERY: 'Entrega', VISIT: 'Visita', SERVICE: 'Serviço', MEETING: 'Reunião', TASK: 'Tarefa' })[type] }
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }

export default function SchedulingModule({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [events, setEvents] = useState(() => seedEvents(companyId))
  const [title, setTitle] = useState('')
  const [customer, setCustomer] = useState('')
  const [type, setType] = useState<SchedulingEventType>('SERVICE')
  const [start, setStart] = useState('2026-09-22T16:00')
  const [duration, setDuration] = useState(60)
  const [aiMessage, setAiMessage] = useState('')

  const nextEvents = useMemo(() => [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [events])
  const conflicts = useMemo(() => events.filter(event => event.status !== 'CANCELLED'), [events])

  function createEvent(source: 'HUMAN' | 'AI' = 'HUMAN') {
    if (!title.trim()) return
    const startDate = new Date(start)
    const endDate = new Date(startDate.getTime() + duration * 60_000)
    const resourceIds = source === 'AI' ? ['employee-carlos'] : ['employee-ana']
    const event: SchedulingEvent = { id: `evt-${Date.now()}`, companyId, title: title.trim(), type, startsAt: startDate.toISOString(), endsAt: endDate.toISOString(), customer: customer.trim() || undefined, resourceIds, status: 'PLANNED', source }
    const conflict = hasSchedulingConflict(event, conflicts)
    if (conflict) {
      setAiMessage('Conflito detectado: o recurso selecionado já possui um compromisso nesse intervalo.')
      return
    }
    setEvents(current => [...current, event])
    setAiMessage(source === 'AI' ? 'A IA criou o compromisso, verificou conflito e reservou o recurso disponível.' : 'Compromisso criado no motor operacional.')
    setTitle('')
  }

  function interpretIntent() {
    setTitle('Visita ao cliente')
    setType('VISIT')
    setCustomer('Novo cliente')
    setAiMessage('Entendi a intenção. Preparei uma visita para 16:00, com técnico disponível. Revise antes de confirmar.')
  }

  return <div className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>OPERATIONS / SCHEDULING ENGINE</span><h1>Tempo operacional</h1><p>{companyName} · compromissos, reservas, visitas, entregas, serviços e tarefas em uma única camada.</p></div>
      <button className={styles.aiButton} onClick={interpretIntent}><Sparkles size={16}/> Interpretar com IA</button>
    </header>

    <div className={styles.metrics}>
      <div><CalendarDays size={18}/><b>{events.length}</b><span>eventos</span></div>
      <div><Clock3 size={18}/><b>{events.filter(e => e.status === 'PLANNED').length}</b><span>planejados</span></div>
      <div><Users size={18}/><b>{resources.filter(r => r.type === 'EMPLOYEE').length}</b><span>recursos</span></div>
      <div><CheckCircle2 size={18}/><b>0</b><span>conflitos ativos</span></div>
    </div>

    <div className={styles.grid}>
      <section className={styles.panel}>
        <div className={styles.panelHead}><div><span>AGENDA UNIVERSAL</span><h2>Próximos compromissos</h2></div><button onClick={() => setTitle('Novo compromisso')}><Plus size={15}/> Novo</button></div>
        <div className={styles.events}>{nextEvents.map(event => <article className={styles.event} key={event.id}><div className={styles.time}>{formatDate(event.startsAt)}<small>{Math.round((new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 60000)} min</small></div><div className={styles.eventBody}><b>{event.title}</b><span>{labelType(event.type)}{event.customer ? ` · ${event.customer}` : ''}</span><small>{event.source === 'AI' ? 'Criado pela IA' : event.source === 'INTEGRATION' ? 'Integração' : 'Criado manualmente'}</small></div><i className={styles.status}>{event.status}</i></article>)}</div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}><div><span>QUICK SCHEDULING</span><h2>Criar compromisso</h2></div><Wrench size={18}/></div>
        <label>Título<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: manutenção do cliente"/></label>
        <label>Cliente / contexto<input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Opcional"/></label>
        <div className={styles.two}><label>Tipo<select value={type} onChange={e => setType(e.target.value as SchedulingEventType)}>{(['APPOINTMENT','RESERVATION','DELIVERY','VISIT','SERVICE','MEETING','TASK'] as SchedulingEventType[]).map(x => <option key={x} value={x}>{labelType(x)}</option>)}</select></label><label>Duração<select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={30}>30 min</option><option value={60}>1 h</option><option value={90}>1h30</option><option value={120}>2 h</option></select></label></div>
        <label>Início<input type="datetime-local" value={start} onChange={e => setStart(e.target.value)}/></label>
        <div className={styles.resource}><MapPin size={15}/><span>Recurso sugerido: <b>{resources.find(r => r.id === 'employee-ana')?.name}</b></span></div>
        <button className={styles.primary} onClick={() => createEvent('HUMAN')}><Plus size={16}/> Criar compromisso</button>
        <button className={styles.secondary} onClick={() => createEvent('AI')}><Sparkles size={15}/> Criar e otimizar com IA</button>
        {aiMessage && <div className={styles.message}>{aiMessage}</div>}
      </section>
    </div>

    <section className={styles.aiPanel}><Sparkles size={18}/><div><b>Camada inteligente de tempo</b><p>Uma ordem de serviço, entrega ou pedido do usuário pode gerar automaticamente os compromissos e recursos necessários. O calendário é consequência do processo, não o processo inteiro.</p></div></section>
  </div>
}
