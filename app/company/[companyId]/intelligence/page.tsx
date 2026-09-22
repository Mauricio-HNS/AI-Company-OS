export function generateStaticParams() {
  return ['alpha', 'beta', 'gamma'].map(companyId => ({ companyId }))
}

export default function IntelligencePage() {
  return <main style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}><span style={{ color: '#C2A46A', letterSpacing: '0.14em', fontSize: 12 }}>INTELLIGENCE</span><h1 style={{ margin: '10px 0 8px' }}>O que a empresa está aprendendo</h1><p style={{ opacity: .72, maxWidth: 700 }}>O sistema reúne sinais, histórico, conhecimento e resultados para melhorar as decisões dos agentes sem transformar isso em dezenas de telas manuais.</p><section style={{ marginTop: 32, padding: 24, border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, background: 'rgba(255,255,255,.03)' }}><b>Sinais relevantes</b><div style={{ marginTop: 18, display: 'grid', gap: 12 }}><Signal title="Conversão" text="A taxa de conversão está acima da média recente." /><Signal title="Demanda" text="Existe aumento de procura em um segmento monitorado." /><Signal title="Operação" text="Dois eventos exigem ajuste de capacidade." /></div></section></main>
}
function Signal({ title, text }: { title: string; text: string }) { return <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,.025)' }}><b>{title}</b><p style={{ margin: '6px 0 0', opacity: .62 }}>{text}</p></div> }
