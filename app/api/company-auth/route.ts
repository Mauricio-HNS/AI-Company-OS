import { createHash, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

const USERS: Record<string, { displayName: string; role: 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'VIEWER' }> = {
  manager: { displayName: 'Gerente', role: 'MANAGER' },
  owner: { displayName: 'Proprietário', role: 'OWNER' },
  employee: { displayName: 'Funcionário', role: 'EMPLOYEE' },
  viewer: { displayName: 'Consulta', role: 'VIEWER' },
}

function safeEqual(left: string, right: string) {
  const a = createHash('sha256').update(left).digest()
  const b = createHash('sha256').update(right).digest()
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { companyId?: string; userId?: string; managerKey?: string }
  const userId = body.userId?.trim().toLowerCase()
  const configuredKey = process.env.COMPANY_MANAGER_KEY
  const user = userId ? USERS[userId] : undefined

  if (!configuredKey) return NextResponse.json({ ok: false, error: 'COMPANY_MANAGER_KEY is not configured.' }, { status: 503 })
  if (!body.companyId || !user || !body.managerKey || !safeEqual(body.managerKey, configuredKey)) {
    return NextResponse.json({ ok: false, error: 'Invalid company credentials.' }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    session: {
      companyId: body.companyId,
      userId,
      displayName: user.displayName,
      role: user.role,
      authenticatedAt: new Date().toISOString(),
      sessionId: `${body.companyId}-${userId}-${Date.now()}`,
    },
  })
}
