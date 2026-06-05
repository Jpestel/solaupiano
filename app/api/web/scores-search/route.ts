import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface ScoreResult { title: string; url: string; domain: string; isPdf: boolean; free: boolean }

// Sites connus de partitions libres / gratuites (priorisés)
const FREE_DOMAINS = [
  'imslp.org', 'mutopiaproject.org', 'free-scores.com', 'sheetmusicforfree.com',
  'cpdl.org', 'cantorion.org', '8notes.com', 'sheetmusicgo.com', 'partitionsdechansons.com',
  'partitions-domaine-public.fr', 'musopen.org',
]

function decodeEntities(s: string) {
  return s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

async function ddg(q: string): Promise<ScoreResult[]> {
  const body = `q=${encodeURIComponent(q)}&kl=fr-fr`
  const r = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
    body,
  })
  if (!r.ok) return []
  const html = await r.text()
  const re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g
  const out: ScoreResult[] = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < 12) {
    let url = decodeEntities(m[1])
    if (url.startsWith('//')) url = 'https:' + url
    if (!/^https?:\/\//.test(url)) continue
    let domain = ''
    try { domain = new URL(url).hostname.replace(/^www\./, '') } catch { continue }
    if (seen.has(url)) continue
    seen.add(url)
    const title = decodeEntities(m[2].replace(/<[^>]+>/g, '').trim())
    out.push({
      title,
      url,
      domain,
      isPdf: /\.pdf($|\?)/i.test(url),
      free: FREE_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d)),
    })
  }
  // Priorité : sites de partitions libres, puis PDF, puis le reste
  out.sort((a, b) => (Number(b.free) - Number(a.free)) || (Number(b.isPdf) - Number(a.isPdf)))
  return out.slice(0, 8)
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json({ results: [] })

  try {
    const results = await ddg(`${q} partition gratuite`)
    return NextResponse.json({ results })
  } catch (e) {
    console.error('scores search', e)
    return NextResponse.json({ results: [] })
  }
}
