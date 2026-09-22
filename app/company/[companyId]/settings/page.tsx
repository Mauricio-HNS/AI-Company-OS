export function generateStaticParams() {
  return ['alpha', 'beta', 'gamma'].map(companyId => ({ companyId }))
}

export default function SettingsPage() {
  return <main style={{ padding: 40, maxWidth: 1000, margin: '0 auto' }}><span style={{ color: '#C2A46A', letterSpacing: '0.14em', fontSize: 12 }}>SYSTEM</span><h1 style={{ margin: '10px 0 8px' }}>Configurações da empresa</h1><p style={{ opacity: .72, maxWidth: 680 }}>Políticas, identidade, segurança e comportamento do AI Company OS. Configurações que afetam execução permanecem sob controle explícito.</p><div style={{ marginTop: 32, display: 'grid', gap: 12 }}><Setting title="Autonomia da IA" text="Define o que os agentes podem executar automaticamente e o que exige aprovação." /><Setting title="Segurança e isolamento" text="Dados, conexões e histórico permanecem vinculados à empresa atual." /><Setting title="Integrações" text="Conexões externas e suas permissões de execução." /></div></main>
}
function Setting({ title, text }: { title: string; text: string }) { return <section style={{ padding: 20, border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, background: 'rgba(255,255,255,.03)' }}><b>{title}</b><p style={{ margin: '7px 0 0', opacity: .62 }}>{text}</p></section> }
