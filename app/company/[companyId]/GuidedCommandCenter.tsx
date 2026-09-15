'use client'

import { useState } from 'react'
import { ArrowUp, BrainCircuit, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'

type GuidedCommandCenterProps = {
  objective: string
  expectedOutcome: string
  onSubmitIntent?: (intent: string) => void
}

const suggestions = [
  'Quero aumentar minhas vendas.',
  'O que você faria se fosse você?',
  'Mostre o que a equipe está fazendo.',
  'Quanto podemos gastar este mês?',
]

export default function GuidedCommandCenter({ objective, expectedOutcome, onSubmitIntent }: GuidedCommandCenterProps) {
  const [intent, setIntent] = useState('')
  const [submitted, setSubmitted] = useState('')

  function submit(value = intent) {
    const normalized = value.trim()
    if (!normalized) return
    setSubmitted(normalized)
    setIntent('')
    onSubmitIntent?.(normalized)
  }

  return (
    <section className="guidedCenter">
      <div className="guidedIntro">
        <div className="guidedEyebrow"><Sparkles size={14} /> YOUR AI COMPANY TEAM</div>
        <h2>Vamos conduzir sua empresa na direção certa.</h2>
        <p>Você define a intenção. A equipe de IA transforma isso em um plano, avalia riscos e apresenta o próximo passo.</p>
      </div>

      <div className="guidedObjective">
        <span>OBJETIVO ATUAL</span>
        <strong>{objective}</strong>
        <p>{expectedOutcome}</p>
      </div>

      <div className="guidedConversation">
        <div className="guidedMessage guidedMessageAi">
          <div className="guidedAvatar"><BrainCircuit size={16} /></div>
          <div><strong>Company Intelligence</strong><p>O que você quer que sua empresa faça agora?</p></div>
        </div>
        {submitted && <div className="guidedMessage guidedMessageUser"><span>Você</span><p>{submitted}</p></div>}
        <div className="guidedSuggestions">
          {suggestions.map(suggestion => <button key={suggestion} onClick={() => submit(suggestion)}>{suggestion}</button>)}
        </div>
        <form className="guidedComposer" onSubmit={event => { event.preventDefault(); submit() }}>
          <input value={intent} onChange={event => setIntent(event.target.value)} placeholder="Diga o que você quer realizar..." aria-label="Comando para a empresa" />
          <button type="submit" aria-label="Enviar comando"><ArrowUp size={17} /></button>
        </form>
      </div>

      <div className="guidedTrust">
        <div><CheckCircle2 size={15} /><span>Planos baseados em evidências</span></div>
        <div><ShieldCheck size={15} /><span>Ações externas continuam protegidas</span></div>
      </div>
    </section>
  )
}
