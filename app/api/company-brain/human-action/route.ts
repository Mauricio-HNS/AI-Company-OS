import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const cloudEndpoint = process.env.COMPANY_BRAIN_API_URL ?? 'http://127.0.0.1:5000'
  const adminKey = process.env.BRAIN_ADMIN_API_KEY
  if (!adminKey) return NextResponse.json({ recorded: false, reason: 'Brain admin key is not configured on the server.' }, { status: 503 })

  const body = await request.json()
  const companyId = String(body.companyId ?? '')
  const decisionId = String(body.decisionId ?? '')
  const action = String(body.action ?? '')
  const reason = body.reason ? String(body.reason) : undefined
  const optionId = body.optionId ? String(body.optionId) : undefined
  const agentId = body.agentId ? String(body.agentId) : undefined
  const humanNote = body.humanNote ? String(body.humanNote) : undefined
  if (!companyId || !decisionId || !action) return NextResponse.json({ recorded: false, reason: 'companyId, decisionId and action are required.' }, { status: 400 })

  const response = await fetch(
    `${cloudEndpoint}/api/brain/v1/companies/${encodeURIComponent(companyId)}/decisions/${encodeURIComponent(decisionId)}/human-action`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Brain-Admin-Key': adminKey, 'X-Brain-Actor': 'company-os-ui' },
      body: JSON.stringify({ action, reason, optionId, agentId, humanNote }),
      cache: 'no-store',
    },
  )
  const payload = await response.json().catch(() => ({ recorded: false, reason: 'Invalid Brain response.' }))
  return NextResponse.json(payload, { status: response.status })
}
