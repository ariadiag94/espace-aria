import { createClient } from '@supabase/supabase-js'
import { buildChatSystemPrompt } from '@/lib/chat-knowledge'

// Chatbot « Une question ? » : accompagne les utilisateurs connectés ayant
// accès à DiagAssist (pros validés + staff). Garde-fous :
// - session obligatoire + has_assistant_access() ;
// - quota quotidien par utilisateur (CHAT_DAILY_LIMIT messages / 24 h),
//   compté dans public.chat_messages (migration 026) ;
// - historique et contexte bornés en taille ;
// - la clé Anthropic ne quitte jamais le serveur.

const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT || 40)
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'
const MAX_HISTORY = 12
const MAX_MESSAGE = 1500

type ChatTurn = { role: 'user' | 'assistant'; content: string }

// Indique seulement si le chat est activé (clé présente), sans rien exposer.
export async function GET() {
  return Response.json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return Response.json({ error: 'Connectez-vous pour utiliser l’assistant.' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!supabaseUrl || !supabaseKey) return Response.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  if (!apiKey) return Response.json({ error: 'L’assistant n’est pas encore activé. Appelez-nous au 06 15 70 36 70.' }, { status: 503 })

  const body = await request.json().catch(() => null)
  const rawMessages: unknown[] = Array.isArray(body?.messages) ? body.messages : []
  const messages: ChatTurn[] = rawMessages
    .filter((m): m is ChatTurn => !!m && typeof m === 'object' && ((m as ChatTurn).role === 'user' || (m as ChatTurn).role === 'assistant') && typeof (m as ChatTurn).content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE) }))
    .filter((m) => m.content)
    .slice(-MAX_HISTORY)
  // L'API exige un premier message "user" et une alternance stricte.
  while (messages.length && messages[0].role !== 'user') messages.shift()
  const last = messages[messages.length - 1]
  if (!last || last.role !== 'user') return Response.json({ error: 'Message vide.' }, { status: 400 })
  const context = typeof body?.context === 'string' ? body.context.slice(0, 1500) : ''
  const page = typeof body?.page === 'string' ? body.page.slice(0, 80) : null

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return Response.json({ error: 'Session expirée, reconnectez-vous.' }, { status: 401 })
  const { data: hasAccess } = await supabase.rpc('has_assistant_access')
  if (!hasAccess) return Response.json({ error: 'Accès réservé aux comptes validés.' }, { status: 403 })

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userData.user.id)
    .eq('role', 'user')
    .gte('created_at', since)
  if (countError) return Response.json({ error: 'Assistant momentanément indisponible.' }, { status: 503 })
  if ((count || 0) >= DAILY_LIMIT) {
    return Response.json({ error: 'Vous avez atteint la limite de questions pour aujourd’hui. Appelez-nous au 06 15 70 36 70.' }, { status: 429 })
  }

  await supabase.from('chat_messages').insert({ role: 'user', content: last.content, page })

  const anthropic = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 700, system: buildChatSystemPrompt(context), messages }),
  })
  const data = await anthropic.json().catch(() => ({}))
  if (!anthropic.ok) {
    console.error('Anthropic error', anthropic.status, data?.error?.message)
    return Response.json({ error: 'L’assistant n’a pas pu répondre. Réessayez ou appelez le 06 15 70 36 70.' }, { status: 502 })
  }
  const reply = Array.isArray(data?.content)
    ? data.content.filter((c: { type?: string }) => c?.type === 'text').map((c: { text?: string }) => c.text || '').join('\n').trim()
    : ''
  if (!reply) return Response.json({ error: 'Réponse vide, réessayez.' }, { status: 502 })

  await supabase.from('chat_messages').insert({ role: 'assistant', content: reply.slice(0, 8000), page })

  return Response.json({ reply, remaining: Math.max(0, DAILY_LIMIT - (count || 0) - 1) })
}
