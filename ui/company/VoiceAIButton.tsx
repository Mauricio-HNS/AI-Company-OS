'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Mic, Square, X } from 'lucide-react'
import styles from './VoiceAIButton.module.css'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: any) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export default function VoiceAIButton({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => () => recognitionRef.current?.stop(), [])

  function startRecording() {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Constructor) {
      setError('Seu navegador não oferece reconhecimento de voz. Use Chrome ou Edge.')
      return
    }

    setError('')
    const recognition = new Constructor()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript ?? ''
      }
      if (transcript.trim()) setText(current => `${current} ${transcript}`.trim())
    }
    recognition.onerror = () => {
      setRecording(false)
      setError('Não foi possível capturar a voz. Tente novamente.')
    }
    recognition.onend = () => setRecording(false)

    recognitionRef.current = recognition
    setRecording(true)
    recognition.start()
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setRecording(false)
  }

  function close() {
    stopRecording()
    setOpen(false)
    setError('')
  }

  function confirmInstruction() {
    const value = text.trim()
    if (!value) return

    const key = `company-os:voice-instructions:${companyId}`
    const current = JSON.parse(localStorage.getItem(key) ?? '[]')
    current.push({
      id: crypto.randomUUID(),
      companyId,
      text: value,
      source: 'voice',
      status: 'PENDING_INTERPRETATION',
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem(key, JSON.stringify(current.slice(-100)))
    close()
  }

  return (
    <>
      <button className={styles.voiceButton} type="button" onClick={() => setOpen(true)}>
        <Mic size={17} />
        <span>Falar com a IA</span>
      </button>

      {open && (
        <div className={styles.backdrop} role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) close()
        }}>
          <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="voice-title">
            <div className={styles.header}>
              <div><small>COMPANY OS</small><h2 id="voice-title">Falar com a IA</h2></div>
              <button className={styles.close} type="button" onClick={close} aria-label="Fechar"><X size={18} /></button>
            </div>

            <p className={styles.help}>Informe fatos, novas regras, diretrizes, pedidos ou decisões da empresa.</p>

            <textarea
              value={text}
              onChange={event => setText(event.target.value)}
              placeholder="Ex.: A partir de agora, compras acima de 500 euros precisam da minha aprovação."
              aria-label="Mensagem para a IA"
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button className={`${styles.record} ${recording ? styles.recording : ''}`} type="button" onClick={recording ? stopRecording : startRecording}>
                {recording ? <Square size={16} /> : <Mic size={16} />}
                {recording ? 'Parar gravação' : 'Falar'}
              </button>
              <button className={styles.confirm} type="button" disabled={!text.trim()} onClick={confirmInstruction}>
                <Check size={16} /> Confirmar informação
              </button>
            </div>

            <small className={styles.note}>A informação fica pendente de interpretação antes de alterar regras ou permissões da empresa.</small>
          </section>
        </div>
      )}
    </>
  )
}
