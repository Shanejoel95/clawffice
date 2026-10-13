// Pixel crabs for the office floor. Body grid and walk cycle adapted from
// savvy-progress (MIT, johnnyvizz/claude-kit), which took Clawd from DockCrab.
// Each staff member wears a costume; a working crab walks and animates its prop.

import type { Desk, Headline, Meeting } from '../types'

export const CLAY = '#D97757'
const INK = '#1F1E1D'
export const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"

export const ACCENT: Record<string, string> = {
  manager: '#C9A227',
  'product': '#E36FA0',
  'architect': '#3D7FD9',
  'developer': '#6C5CE7',
  'qa': '#2FA36B',
  'devops': '#E8863A',
  'security': '#4A5568',
  'ux': '#D64550',
  'data': '#16A3B8',
  'support': '#8E6CCF',
}

type Fill = (x: number, y: number, w: number, h: number, c: string, cls?: string) => void

const stamp = (f: Fill, x: number, y: number, rows: string[], map: Record<string, string>, cls?: string): void =>
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => map[ch] && f(x + dx, y + dy, 1, 1, map[ch] ?? '', cls)))

const body = (f: Fill, armFront = 0, armCls?: string): void => {
  f(7, 10, 16, 12, CLAY)
  f(3, 14, 4, 4, CLAY)
  f(23, 14 + armFront, 4, 4, CLAY, armCls)
  f(9, 12, 2, 2, INK)
  f(19, 12, 2, 2, INK)
  f(7, 22, 2, 4, CLAY, 'la')
  f(17, 22, 2, 4, CLAY, 'la')
  f(11, 22, 2, 4, CLAY, 'lb')
  f(21, 22, 2, 4, CLAY, 'lb')
}

const COSTUMES: Record<string, (f: Fill, t: string) => void> = {
  // Manager: gold crown, necktie, clipboard that taps.
  manager: (f, t) => {
    body(f, -4, 'it')
    stamp(f, 9, 4, ['g...g...g...', 'gg.ggg.gg...', 'gggggggggg..', 'grgggbgggg..', 'gggggggggg..'], { g: t, r: '#D64550', b: '#3D7FD9' })
    f(14, 15, 2, 1, '#2B4C7E'); f(14, 16, 2, 4, '#3D5A99')
    f(24, 5, 5, 7, '#C9A27A', 'it'); f(25, 4, 3, 1, '#8E929A', 'it'); f(25, 7, 3, 1, '#fff', 'it'); f(25, 9, 3, 1, '#fff', 'it')
  },
  // Product: backwards cap, sticky notes that flutter.
  'product': (f, t) => {
    body(f)
    stamp(f, 7, 5, ['...cccccccccc...', '..cccccccccccc..', '.cccccccccccccc.', 'ccccccccccccccccbbb'], { c: t, b: '#B4527E' })
    f(25, 4, 4, 4, '#F5D547', 'it'); f(0, 6, 4, 4, '#7FD1E8', 'it2')
  },
  // Architect: round glasses, blueprint roll that swings.
  'architect': (f, t) => {
    body(f, -4, 'it')
    stamp(f, 8, 11, ['kkkk..kkkk', 'k..kkkk..k', 'kkkk..kkkk'], { k: INK })
    stamp(f, 7, 6, ['..hhhhhhhhhhhh..', '.hhhhhhhhhhhhhh.', 'hhhhhhhhhhhhhhhh', 'hh............hh'], { h: '#5A3A28' })
    f(23, 3, 3, 10, t, 'it'); f(23, 3, 3, 1, '#fff', 'it'); f(23, 7, 3, 1, '#9CC3F0', 'it')
  },
  // Developer: hoodie hood, laptop whose screen flickers.
  'developer': (f, t) => {
    body(f)
    stamp(f, 6, 5, ['....hhhhhhhhhh....', '..hhhhhhhhhhhhhh..', '.hhh..........hhh.', '.hh............hh.', 'hh..............hh'], { h: t })
    f(8, 17, 14, 1, t); f(13, 18, 1, 3, '#E8E8E8'); f(16, 18, 1, 3, '#E8E8E8')
    f(18, 15, 11, 7, '#4A4A48'); f(19, 16, 9, 5, '#8FE3B0', 'scr'); f(17, 22, 13, 1, '#8E929A')
  },
  // QA: green visor, magnifier that sweeps, a bug that hops.
  'qa': (f, t) => {
    body(f, -4, 'it')
    stamp(f, 6, 7, ['..vvvvvvvvvvvvvv..', 'vvvvvvvvvvvvvvvvvv', '.................'], { v: t })
    stamp(f, 23, 1, ['.kkk.', 'k...k', 'k...k', 'k...k', '.kkk.'], { k: '#3A3A3C' }, 'it')
    f(24, 2, 3, 3, 'rgba(169,214,245,.7)', 'it'); f(25, 6, 1, 4, '#7A4A26', 'it')
    stamp(f, 0, 6, ['.k.k', 'gggg', 'kggk'], { g: '#6BC46D', k: INK }, 'bug')
  },
  // DevOps: hard hat, a gear that turns.
  'devops': (f, t) => {
    body(f)
    stamp(f, 6, 4, ['.....yyyyyyyy.....', '...yyyyyhhyyyyy...', '..yyyyyyhhyyyyyy..', '.yyyyyyyhhyyyyyyy.', 'dddddddddddddddddd'], { y: t, h: '#F7C48E', d: '#B8642A' })
    stamp(f, 23, 1, ['.g.g.', 'ggggg', '.g.g.', 'ggggg', '.g.g.'], { g: '#8E929A' }, 'gear')
    f(25, 2, 1, 3, '#4A4A48', 'gear')
  },
  // Security: dark shades, a shield that pulses.
  'security': (f, t) => {
    body(f, -4, 'it')
    f(8, 11, 14, 1, INK); f(8, 12, 5, 2, INK); f(17, 12, 5, 2, INK)
    stamp(f, 7, 6, ['..ssssssssssss..', '.ssssssssssssss.', 'ssssssssssssssss'], { s: '#2E2E30' })
    stamp(f, 23, 3, ['sssss', 'swwws', 'swcws', 'swwws', '.sss.', '..s..'], { s: t, w: '#A9B4C2', c: '#3B9C5F' }, 'it')
  },
  // UX: beret, a paintbrush that strokes.
  'ux': (f, t) => {
    body(f, -4, 'it')
    stamp(f, 7, 5, ['......bb..........', '..bbbbbbbbbbbb....', '.bbbbbbbbbbbbbbb..', 'bbbbbbbbbbbbbbbbb.'], { b: t })
    f(26, 2, 1, 8, '#7A4A26', 'it'); f(25, 0, 3, 3, '#F5C542', 'it')
    f(0, 9, 2, 2, '#3D7FD9', 'dot'); f(2, 7, 2, 2, '#2FA36B', 'dot')
  },
  // Data: visor, a bar chart whose bars grow.
  'data': (f, t) => {
    body(f)
    stamp(f, 7, 7, ['vvvvvvvvvvvvvvvv', '.vvvvvvvvvvvvvvvvvv'], { v: t })
    f(23, 11, 7, 1, '#8E929A')
    f(24, 7, 1, 4, t, 'b1'); f(26, 5, 1, 6, '#F5C542', 'b2'); f(28, 3, 1, 8, '#D64550', 'b3')
  },
  // Support: headset with a mic, a speech bubble that blinks.
  'support': (f, t) => {
    body(f)
    stamp(f, 6, 6, ['....kkkkkkkkkk....', '..kk..........kk..', '.k..............k.', 'tt..............tt', 'tt..............tt'], { k: '#3A3A3C', t })
    f(6, 11, 1, 4, '#3A3A3C'); f(7, 15, 3, 1, '#3A3A3C')
    stamp(f, 23, 2, ['wwwwww', 'wkwkww', 'wwwwww', 'ww....'], { w: '#F8F6F1', k: t }, 'say')
  },
}

const CSS = `<style>
.t{fill:#0e0e10}.s{fill:#6b6b70}.m{fill:#8e8e94}.k{fill:#ededf0}.ln{stroke:#ededf0}.tile{fill:#f5f5f7}.desk{fill:#ececef}
@media (prefers-color-scheme: dark){.t{fill:#f2f2f4}.s{fill:#a1a1a8}.m{fill:#7a7a82}.k{fill:#2a2a2e}.ln{stroke:#2a2a2e}.tile{fill:#1c1c1f}.desk{fill:#26262a}}
.live{animation:p 1.6s ease-in-out infinite}@keyframes p{50%{opacity:.3}}
.run .la{animation:st .5s steps(1) infinite}.run .lb{animation:st .5s steps(1) infinite -.25s}
.run .bd{animation:bob .5s steps(1) infinite -.125s}
.run g{transform-box:fill-box}
@keyframes st{50%{transform:translateY(-1px)}}@keyframes bob{50%{transform:translateY(1px)}}
@keyframes blink{50%{opacity:.15}}
.c-manager.run .it{animation:tap .5s steps(1) infinite}@keyframes tap{50%{transform:translateY(-2px)}}
.c-product.run .it,.c-product.run .it2{animation:flut .5s steps(1) infinite}.c-product.run .it2{animation-delay:-.25s}
@keyframes flut{50%{transform:translateY(-2px) rotate(8deg)}}
.c-architect.run .it{transform-origin:50% 100%;animation:sw 1s ease-in-out infinite}@keyframes sw{50%{transform:rotate(-20deg)}}
.c-developer.run .scr{animation:blink .5s steps(1) infinite}
.c-qa.run .it{animation:scan 1s steps(1) infinite}.c-qa.run .bug{animation:hop .5s steps(1) infinite}
@keyframes scan{25%{transform:translate(-1px,1px)}50%{transform:translate(-2px,2px)}75%{transform:translate(-1px,1px)}}
@keyframes hop{50%{transform:translateY(-2px)}}
.c-devops.run .gear{transform-origin:50% 50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.c-security.run .it{transform-origin:50% 50%;animation:pulse 1s ease-in-out infinite}@keyframes pulse{50%{transform:scale(1.15)}}
.c-ux.run .it{transform-origin:50% 100%;animation:sw 1s ease-in-out infinite}.c-ux.run .dot{animation:blink 1s steps(1) infinite}
.c-data.run .b1{transform-origin:50% 100%;animation:grow 1s ease-in-out infinite}
.c-data.run .b2{transform-origin:50% 100%;animation:grow 1s ease-in-out infinite -.33s}
.c-data.run .b3{transform-origin:50% 100%;animation:grow 1s ease-in-out infinite -.66s}
@keyframes grow{50%{transform:scaleY(.5)}}
.c-support.run .say{animation:blink 1s steps(1) infinite}
@media (prefers-reduced-motion: reduce){.run,.run g,.live{animation:none!important}}
</style>`

export const xml = (s: string): string =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

const charEm = (ch: string): number => (/[\s.,:;'|!il1()[\]]/.test(ch) ? 0.3 : /[A-Z@%mw]/.test(ch) ? 0.72 : 0.56)
const textWidth = (s: string, size: number): number => [...s].reduce((w, ch) => w + charEm(ch) * size, 0)
export const fitText = (s: string, size: number, maxW: number): string => {
  if (textWidth(s, size) <= maxW) return s
  let out = ''
  for (const ch of s) {
    if (textWidth(out + ch + '…', size) > maxW) break
    out += ch
  }
  return out + '…'
}

export const fmtCost = (usd: number): string => `$${usd < 10 ? usd.toFixed(2) : usd.toFixed(1)}`
export const fmtTokens = (n: number): string =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${Math.round(n)}`
export const fmtTime = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
export const modelName = (id: string): string => {
  const m = /(fable|opus|sonnet|haiku)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(id)
  if (!m) return id || '—'
  const [, fam = '', major = '', minor] = m
  return `${fam.charAt(0).toUpperCase()}${fam.slice(1)} ${major}${minor ? '.' + minor : ''}`
}

// One crab at (x, y); body and props nest in `bd` so props ride the bob.
export const crab = (x: number, y: number, slug: string, dim = false, isWorking = false, scale = 1.1): string => {
  const groups = new Map<string, string[]>([['bd', []]])
  const f: Fill = (cx, cy, w, h, c, cls = 'bd') => {
    if (!groups.has(cls)) groups.set(cls, [])
    groups.get(cls)?.push(`<rect x="${cx}" y="${cy}" width="${w}" height="${h}" fill="${c}"/>`)
  }
  ;(COSTUMES[slug] ?? (g => body(g)))(f, ACCENT[slug] ?? CLAY)
  const group = (cls: string) => `<g class="${cls}">${(groups.get(cls) ?? []).join('')}</g>`
  const props = [...groups.keys()].filter(k => k !== 'bd' && k !== 'la' && k !== 'lb')
  const bd = `<g class="bd">${(groups.get('bd') ?? []).join('')}${props.map(group).join('')}</g>`
  return `<g transform="translate(${x},${y}) scale(${scale})" opacity="${dim ? 0.55 : 1}" shape-rendering="crispEdges"><g class="c-${slug}${isWorking ? ' run' : ''}">${bd}${group('la')}${group('lb')}</g></g>`
}

const svg = (W: number, H: number, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CSS}${inner}</svg>`

const mark = (x: number, y: number, status: Desk['status'], color: string): string => {
  if (status === 'working') return `<circle class="live" cx="${x}" cy="${y}" r="4" fill="${color}"/>`
  if (status === 'done') return `<path d="M${x - 5} ${y}l3.5 3.5 6.5-7" fill="none" stroke="#3B9C5F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
  if (status === 'failed') return `<path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" stroke="#D0453F" stroke-width="1.8" stroke-linecap="round"/>`
  return `<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="#9a9a96" stroke-width="1.2"/>`
}

export type Staff = { slug: string; name: string; role: string }

const tag = (s: Staff) => `${s.name}(${s.role})`

// Greedy word wrap into at most `lines` lines that fit `maxW` pixels.
export const wrap = (s: string, size: number, maxW: number, lines: number): string[] => {
  const out: string[] = []
  let cur = ''
  for (const word of s.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word
    if (textWidth(next, size) <= maxW) {
      cur = next
      continue
    }
    if (cur) out.push(cur)
    cur = word
    if (out.length === lines) break
  }
  if (cur && out.length < lines) out.push(cur)
  if (out.length === lines && out.join(' ').length < s.trim().length) {
    out[lines - 1] = fitText(`${out[lines - 1]} …`, size, maxW)
  }
  return out.map(l => fitText(l, size, maxW))
}

export const elapsedOf = (d: Desk, at: number): number =>
  d.startedAt ? (d.status === 'working' ? Math.max(at, d.startedAt) : d.endedAt ?? d.startedAt) - d.startedAt : 0

// The headline: who is doing what right now, actor crab → target crab.
export const HEADLINE_H = 64
export const headlineSvg = (W: number, h: Headline, team: Staff[], at: number): string => {
  const actor = team.find(s => s.slug === h.slug)
  const target = h.to ? team.find(s => s.slug === h.to) : undefined
  const color = ACCENT[h.slug] ?? CLAY
  const crabs = target
    ? `${crab(14, 8, h.slug, false, true, 1.7)}<path d="M70 32h18m-6-6 6 6-6 6" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${crab(94, 8, target.slug, false, true, 1.7)}`
    : crab(14, 8, h.slug, false, true, 1.7)
  const x = target ? 160 : 82
  const lines = wrap(h.text, 15, W - x - 16, 2)
  return svg(
    W,
    HEADLINE_H,
    `<rect class="tile" x="0" y="0" width="${W}" height="${HEADLINE_H}" rx="10"/><rect x="0" y="0" width="5" height="${HEADLINE_H}" rx="2.5" fill="${color}"/>
${crabs}
<circle class="live" cx="${x}" cy="14" r="3.5" fill="${color}"/>
<text class="s" x="${x + 9}" y="18" font-family="${FONT}" font-size="11">NOW · ${xml(actor ? tag(actor) : '')} · ${fmtTime(at - h.at)}</text>
${lines.map((l, i) => `<text class="t" x="${x}" y="${38 + i * 18}" font-family="${FONT}" font-size="15" font-weight="700">${xml(l)}</text>`).join('')}`,
  )
}

// One desk card: crab, Name(Role), personality, model, task, time and cost.
export const DESK_H = 70
export const deskSvg = (W: number, s: Staff & { traits?: string }, d: Desk | undefined, at: number): string => {
  const color = ACCENT[s.slug] ?? CLAY
  const status = d?.status ?? 'idle'
  const textW = W - 60 - 22
  const meta = [modelName(d?.model ?? ''), status === 'idle' ? 'available' : status].filter(x => x && x !== '—')
  const stats = d && d.startedAt ? `${fmtTokens(d.tokens)} tok  ≈${fmtCost(d.cost)}  ${fmtTime(elapsedOf(d, at))}` : `${d?.jobs ?? 0} jobs`
  return svg(
    W,
    DESK_H,
    `${crab(0, 14, s.slug, status === 'idle', status === 'working', 1.6)}
<text class="t" x="60" y="17" font-family="${FONT}" font-size="14" font-weight="600">${xml(tag(s))}<tspan fill="${color}" font-weight="400" font-size="11">  ${xml(meta.join(' · '))}</tspan></text>
<text class="m" x="60" y="33" font-family="${FONT}" font-size="11" font-style="italic">${xml(fitText(s.traits ?? '', 11, textW))}</text>
<text class="${status === 'working' ? 't' : 's'}" x="60" y="52" font-family="${FONT}" font-size="12" font-weight="${status === 'working' ? 600 : 400}">${xml(fitText(d?.task ?? '—', 12, textW - 150))}</text>
<text class="s" x="${W - 22}" y="52" text-anchor="end" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${stats}</text>
${mark(W - 8, 16, status, color)}
<line class="ln" x1="0" y1="${DESK_H - 0.5}" x2="${W}" y2="${DESK_H - 0.5}"/>`,
  )
}

// The meeting room: the manager at the head, participants around the table,
// each with a speech bubble of their latest stance; the verdict underneath.
export const meetingHeight = (m: Meeting): number => 44 + Math.ceil(m.participants.length / 2) * 104 + (m.verdict ? 70 : 12)
export const meetingSvg = (W: number, m: Meeting, team: Staff[]): string => {
  const byslug = (slug: string) => team.find(s => s.slug === slug)
  const latest = (slug: string) => [...m.turns].reverse().find(t => t.slug === slug)
  const round = Math.max(0, ...m.turns.map(t => t.round))
  const half = W / 2
  const seats = m.participants
    .map((slug, i) => {
      const s = byslug(slug)
      if (!s) return ''
      const t = latest(slug)
      const isSpeaking = t?.status === 'speaking'
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = col * half + 6
      const y = 44 + row * 104
      const color = ACCENT[slug] ?? CLAY
      const bubbleX = x + 66
      const bw = half - 82
      const lines = t?.stance ? wrap(t.stance, 11, bw - 16, 4) : [isSpeaking ? 'thinking…' : 'waiting to speak']
      return `${crab(x, y + 18, slug, !t, isSpeaking, 1.8)}
<text class="t" x="${x + 27}" y="${y + 86}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="600">${xml(fitText(s.name, 11, 60))}</text>
<text x="${x + 27}" y="${y + 98}" text-anchor="middle" font-family="${FONT}" font-size="9" fill="${color}">${xml(s.role)}</text>
<rect class="tile" x="${bubbleX}" y="${y + 4}" width="${bw}" height="${18 + lines.length * 14}" rx="9" stroke="${isSpeaking ? color : 'none'}" stroke-width="1.5"/>
<path d="M${bubbleX} ${y + 22}l-7 6 7 2z" class="tile"/>
${lines.map((l, k) => `<text class="${t?.stance ? 't' : 'm'}" x="${bubbleX + 8}" y="${y + 20 + k * 14}" font-family="${FONT}" font-size="11"${t?.stance ? '' : ' font-style="italic"'}>${xml(l)}</text>`).join('')}
${isSpeaking ? `<circle class="live" cx="${bubbleX + bw - 8}" cy="${y + 12}" r="3.5" fill="${color}"/>` : ''}`
    })
    .join('')
  const top = 44 + Math.ceil(m.participants.length / 2) * 104
  const manager = byslug('manager')
  const verdict = m.verdict
    ? `<rect x="0" y="${top + 6}" width="${W}" height="58" rx="10" fill="${ACCENT.manager}" fill-opacity=".14" stroke="${ACCENT.manager}" stroke-width="1.2"/>
${crab(8, top + 14, 'manager', false, false, 1.4)}
<text class="s" x="58" y="${top + 24}" font-family="${FONT}" font-size="10" font-weight="600">DECISION · ${xml(manager ? tag(manager) : '')}</text>
${wrap(m.verdict, 13, W - 70, 2).map((l, k) => `<text class="t" x="58" y="${top + 42 + k * 16}" font-family="${FONT}" font-size="13" font-weight="700">${xml(l)}</text>`).join('')}`
    : ''
  return svg(
    W,
    meetingHeight(m),
    `<text class="s" x="0" y="13" font-family="${FONT}" font-size="10" font-weight="600">MEETING ROOM${round ? ` · ROUND ${round}` : ''}${m.isClosed ? ' · CLOSED' : ''}</text>
<text class="t" x="0" y="32" font-family="${FONT}" font-size="15" font-weight="700">${xml(fitText(m.topic, 15, W))}</text>
${seats}${verdict}`,
  )
}

// The band above the prompt: the whole team in a row, then the headline.
export const BAND_H = 42
export const bandSvg = (W: number, team: Staff[], desks: Record<string, Desk>, at: number, headline: Headline | null, summary: string, showCrew = true): string => {
  const step = 38
  const roomy = W - team.length * step > 300
  const shown = !showCrew ? [] : roomy ? team : team.filter(s => s.slug === 'manager' || desks[s.slug]?.status === 'working' || s.slug === headline?.to)
  const crew = shown
    .map((s, i) => crab(i * step, 3, s.slug, desks[s.slug]?.status !== 'working', desks[s.slug]?.status === 'working', 1.3))
    .join('')
  const x = shown.length * step + 10
  const live = headline !== null
  const color = ACCENT[headline?.slug ?? ''] ?? CLAY
  const text = live ? `${headline.text} · ${fmtTime(at - headline.at)}` : summary
  return svg(
    W,
    BAND_H,
    `${crew}${live ? `<circle class="live" cx="${x}" cy="21" r="4" fill="${color}"/>` : ''}
<text class="${live ? 't' : 's'}" x="${x + (live ? 11 : 0)}" y="26" font-family="${FONT}" font-size="14" font-weight="${live ? 700 : 400}">${xml(fitText(text, 14, Math.max(40, W - x - 16)))}</text>`,
  )
}

// The compact floor: everyone in one glance (5 across), each with name, role and
// what they are on; a working desk is lit in its owner's colour.
const C_ROW = 96
export const compactCols = (W: number, n: number): number => Math.min(n, W >= 420 ? 5 : W >= 300 ? 4 : 3)
export const compactHeight = (W: number, n: number): number => 26 + Math.ceil(n / compactCols(W, n)) * C_ROW
export const compactFloorSvg = (
  W: number,
  team: Staff[],
  desks: Record<string, Desk>,
  totals: { jobs: number; tokens: number; cost: number; time: number },
  at: number,
): string => {
  const cols = compactCols(W, team.length)
  const cw = W / cols
  const working = team.filter(s => desks[s.slug]?.status === 'working').length
  const cells = team
    .map((s, i) => {
      const d = desks[s.slug]
      const status = d?.status ?? 'idle'
      const isWorking = status === 'working'
      const color = ACCENT[s.slug] ?? CLAY
      const x = (i % cols) * cw
      const y = 26 + Math.floor(i / cols) * C_ROW
      const cx = x + cw / 2
      const note = isWorking ? d?.task ?? 'working' : status === 'done' ? `✓ ${d?.task ?? 'done'}` : status === 'failed' ? '✗ failed' : 'available'
      return `${isWorking ? `<rect x="${x + 2}" y="${y}" width="${cw - 4}" height="${C_ROW - 6}" rx="12" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="1.4"/>` : `<rect class="tile" x="${x + 2}" y="${y}" width="${cw - 4}" height="${C_ROW - 6}" rx="12"/>`}
${crab(cx - 21, y + 4, s.slug, status === 'idle', isWorking, 1.4)}
${isWorking ? `<circle class="live" cx="${x + cw - 12}" cy="${y + 11}" r="3.5" fill="${color}"/><text class="t" x="${x + 8}" y="${y + 14}" font-family="${FONT}" font-size="9" font-weight="600" font-variant-numeric="tabular-nums">${fmtTime(elapsedOf(d as Desk, at))}</text>` : status === 'done' ? mark(x + cw - 13, y + 11, 'done', '') : ''}
<text class="${isWorking ? 't' : 's'}" x="${cx}" y="${y + 56}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="${isWorking ? 700 : 600}">${xml(fitText(s.name, 12, cw - 8))}</text>
<text x="${cx}" y="${y + 68}" text-anchor="middle" font-family="${FONT}" font-size="9.5" fill="${color}">${xml(s.role)}</text>
<text class="${isWorking ? 't' : 'm'}" x="${cx}" y="${y + 82}" text-anchor="middle" font-family="${FONT}" font-size="9.5">${xml(fitText(note, 9.5, cw - 10))}</text>`
    })
    .join('')
  return svg(
    W,
    compactHeight(W, team.length),
    `<text class="s" x="0" y="15" font-family="${FONT}" font-size="11.5" font-variant-numeric="tabular-nums"><tspan class="t" font-weight="700">${working}/${team.length}</tspan> on the floor  ·  <tspan class="t" font-weight="600">${totals.jobs}</tspan> jobs  ·  <tspan class="t" font-weight="600">≈${fmtCost(totals.cost)}</tspan>  ·  ${fmtTokens(totals.tokens)} tokens  ·  ${fmtTime(totals.time)}</text>
${cells}`,
  )
}

// A one-line verdict strip for a closed meeting.
export const verdictSvg = (W: number, m: Meeting): string =>
  svg(
    W,
    40,
    `<rect x="0" y="0" width="${W}" height="40" rx="9" fill="${ACCENT.manager}" fill-opacity=".14" stroke="${ACCENT.manager}" stroke-width="1"/>
${crab(6, 6, 'manager', false, false, 1)}
<text class="s" x="42" y="16" font-family="${FONT}" font-size="9.5" font-weight="600">LAST MEETING · ${xml(fitText(m.topic.toUpperCase(), 9.5, W - 160))}</text>
<text class="t" x="42" y="31" font-family="${FONT}" font-size="12" font-weight="700">${xml(fitText(m.verdict ?? 'Closed without a decision', 12, W - 52))}</text>`,
  )

// The staff editor's team strip: every crab, the one being edited raised and lit.
export const teamStripSvg = (W: number, team: Staff[], selected: string): string => {
  const step = W / team.length
  const scale = Math.min(1.5, step / 32)
  return svg(
    W,
    62,
    team
      .map((s, i) => {
        const isSel = s.slug === selected
        const cx = i * step + step / 2
        const color = ACCENT[s.slug] ?? CLAY
        return `${isSel ? `<rect x="${i * step + 2}" y="0" width="${step - 4}" height="60" rx="9" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-width="1.4"/>` : ''}
${crab(cx - 15 * scale, isSel ? 3 : 6, s.slug, !isSel, isSel, scale)}
<text class="${isSel ? 't' : 's'}" x="${cx}" y="54" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="${isSel ? 700 : 400}">${xml(fitText(s.name, 10, step - 4))}</text>`
      })
      .join(''),
  )
}
