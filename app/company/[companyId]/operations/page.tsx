import { getCompany } from '../../../../infrastructure/company/company-catalog'

export function generateStaticParams() {
  return ['alpha', 'beta', 'gamma'].map(companyId => ({ companyId }))
}

export default function OperationsPage({ params }: { params: { companyId: string } }) {
  const company = getCompany(params.companyId)
  return <main style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}><span style={{ color: '#C2A46A', letterSpacing: '0.14em', fontSize: 12 }}>OPERATIONS</span><h1 style={{ margin: '10px 0 8px' }}>A empresa em execução</h1><p style={{ opacity: .72, maxWidth: 700 }}>O AI Company OS transforma intenções em operações, agenda recursos, acompanha eventos e intervém apenas quando existe uma decisão humana.</p><section style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}><Card title="Em execução" value="12" text="operações monitoradas agora" /><Card title="Próximas" value="8" text="eventos previstos" /><Card title="Exceções" value="2" text="precisam de atenção" /></section><section style={{ marginTop: 24, padding: 24, border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, background: 'rgba(255,255,255,.03)' }}><b>Runtime operacional</b><p style={{ opacity: .65 }}>Empresa: {company.name}. Agendamento, recursos, serviços e eventos operacionais ficam coordenados pelo runtime da empresa.</p></section></main>
}
function Card({ title, value, text }: { title: string; value: string; text: string }) { return <div style={{ padding: 22, border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, background: 'rgba(255,255,255,.03)' }}><small style={{ opacity: .6 }}>{title}</small><div style={{ fontSize: 30, fontWeight: 700, marginTop: 8 }}>{value}</div><span style={{ opacity: .6 }}>{text}</span></div> }
