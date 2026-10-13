import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register, RenderChildren } from 'claude-code'

import type { Desk, Headline, Job, Meeting, Member, MemberEdit } from '../types'
import {
  ACCENT,
  BAND_H,
  CLAY,
  DESK_H,
  HEADLINE_H,
  bandSvg,
  compactFloorSvg,
  compactHeight,
  deskSvg,
  elapsedOf,
  fmtCost,
  fmtTime,
  fmtTokens,
  headlineSvg,
  meetingHeight,
  meetingSvg,
  modelName,
  teamStripSvg,
  verdictSvg,
} from './crabs'
import { officePrompt, rosterTable } from './office-prompt'
import { DEBATE_PREFIX, DEFAULT_STAFF, MODELS, agentDescription, agentPrompt, label, memberFor, resolveStaff } from './staff'

const desks = atom({ plugin: 'clawffice', key: 'desks' } as const, {} as Record<string, Desk>)
const jobs = atom({ plugin: 'clawffice', key: 'jobs' } as const, [] as Job[])
const isOpen = atom({ plugin: 'clawffice', key: 'isOpen' } as const, true)
const now = atom({ plugin: 'clawffice', key: 'now' } as const, 0)
const autoOpened = atom({ plugin: 'clawffice', key: 'autoOpened' } as const, false)
const staffAtom = atom({ plugin: 'clawffice', key: 'staff' } as const, resolveStaff({}))
const headline = atom({ plugin: 'clawffice', key: 'headline' } as const, null as Headline | null)
const meeting = atom({ plugin: 'clawffice', key: 'meeting' } as const, null as Meeting | null)
const editing = atom({ plugin: 'clawffice', key: 'editing' } as const, 'manager')
const showDetails = atom({ plugin: 'clawffice', key: 'showDetails' } as const, false)
const showMeeting = atom({ plugin: 'clawffice', key: 'showMeeting' } as const, false)

const DEPARTMENTS = [
  { title: 'Leadership', slugs: ['manager'] },
  { title: 'Product & design', slugs: ['product', 'ux'] },
  { title: 'Engineering', slugs: ['architect', 'developer', 'qa', 'devops'] },
  { title: 'Risk & data', slugs: ['security', 'data'] },
  { title: 'Customers', slugs: ['support'] },
] as const

const DEFAULT_STUDIO = 'Clawffice'
// The studio's display name, from the plugin's options; set when the module registers.
let STUDIO = DEFAULT_STUDIO

const PANE = 'office-floor'
const EDITOR = 'office-staff'
const LOG = '.office/log.md'
const TIMESHEET = '.office/timesheet.md'
const RATES = '.office/rates.json'
const MEETING_TOOL = /^mcp__clawffice__meeting$/
const STAFF_TOOL = /^mcp__clawffice__staff$/

// USD per million tokens, [input, output]. Approximate; override in .office/rates.json.
const DEFAULT_RATES: Record<string, [number, number]> = {
  fable: [15, 75],
  opus: [5, 25],
  sonnet: [3, 15],
  haiku: [1, 5],
}

type Usage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number | null
  cache_read_input_tokens: number | null
}

export const slugOf = (subagentType: string) => memberFor(resolveStaff({}), subagentType)?.slug

export const costOf = (model: string, usage: Usage, rates = DEFAULT_RATES) => {
  const family = Object.keys(rates).find(f => model.includes(f)) ?? 'sonnet'
  const [inRate, outRate] = rates[family] ?? [3, 15]
  const input =
    usage.input_tokens +
    (usage.cache_creation_input_tokens ?? 0) * 1.25 +
    (usage.cache_read_input_tokens ?? 0) * 0.1

  return (input * inRate + usage.output_tokens * outRate) / 1_000_000
}

const tokensOf = (u: Usage) =>
  u.input_tokens + u.output_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const duration = (ms: number) => {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${pad(s % 60)}s`
}

// The STANCE line a colleague opens a meeting reply with, else its first sentence.
export const stanceOf = (text: string) => {
  const line = /^\s*\**STANCE:?\**:?\s*(.+)$/im.exec(text)?.[1]
  const first = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s/)[0] ?? ''
  return (line ?? first).replace(/\*\*/g, '').trim().slice(0, 300)
}

const blank = (): Desk => ({ status: 'idle', tokens: 0, cost: 0, jobs: 0 })

const setDesk = ($: Engine, slug: string, fn: (d: Desk) => Desk) =>
  update($, desks, all => ({ ...all, [slug]: fn(all[slug] ?? blank()) }))

const say = async ($: Engine, h: Omit<Headline, 'at' | 'isLive'> & { isLive?: boolean }) => {
  const at = await $.clock.now()
  await update($, headline, () => ({ isLive: true, ...h, at }))
  await update($, now, () => at)
}

const appendTo = async ($: Engine, path: string, header: string, line: string) => {
  const existing = (await $.fs.exists(path)) ? await $.fs.read(path) : header
  await $.fs.write(path, `${existing.replace(/\n*$/, '\n')}${line}\n`)
}

const ensureOffice = async ($: Engine) => {
  if (!(await $.fs.exists(LOG))) {
    await $.fs.write(LOG, `# ${STUDIO} — Office Log\n\n- ${stamp(await $.clock.now())} office opened.\n`)
  }
  if (!(await $.fs.exists('.office/tickets'))) {
    await $.fs.write('.office/tickets/.keep', '')
  }
}

const log = async ($: Engine, line: string) => {
  try {
    await ensureOffice($)
    await appendTo($, LOG, `# ${STUDIO} — Office Log\n`, `- ${stamp(await $.clock.now())} ${line}`)
  } catch {
    // The office log is best effort; the floor still shows it.
  }
}

const loadRates = async ($: Engine) => {
  try {
    return { ...DEFAULT_RATES, ...(JSON.parse(await $.fs.read(RATES)) as Record<string, [number, number]>) }
  } catch {
    return DEFAULT_RATES
  }
}

// --- staff: the owner's edits live in the store (every project), agents are registered from them.

const loadEdits = async ($: Engine) => ((await $.store.get('staff')) ?? {}) as Record<string, MemberEdit>

const registerAgents = async ($: Engine, staff: Member[]) => {
  for (const m of staff) {
    if (m.slug === 'manager') continue
    await $.agent.register({
      name: m.slug,
      description: agentDescription(m),
      prompt: agentPrompt(m, staff, STUDIO),
      tools: m.tools,
      model: m.model,
    })
  }
}

const applyEdits = async ($: Engine, edits: Record<string, MemberEdit>) => {
  await $.store.set('staff', edits)
  const staff = resolveStaff(edits)
  await update($, staffAtom, () => staff)
  await registerAgents($, staff)
  return staff
}

export const findMember = (staff: Member[], who: string) => {
  const w = who.trim().toLowerCase().replace(/\(.*\)$/, '')
  return staff.find(m => m.slug === w || m.name.toLowerCase() === w || m.role.toLowerCase() === w)
}

// --- panes

const openPane = async ($: Engine, id: string, title: string) => {
  const at = await $.clock.now()
  await update($, now, () => at)
  try {
    await $.ui.open({ id, title })
  } catch {
    // No surface to draw it (headless, tests): the band and the log still say it.
  }
}

const togglePane = async ($: Engine, id: string, title: string) => {
  if ((await $.ui.panes()).some(p => p.id === id)) {
    await $.ui.close({ id })
    return false
  }
  await openPane($, id, title)
  return true
}

const totalsOf = (list: Job[], all: Record<string, Desk>, at: number) => {
  const live = Object.entries(all).filter(([slug, d]) => slug !== 'manager' && d.status === 'working')
  return {
    jobs: list.length,
    tokens: list.reduce((s, j) => s + j.tokens, 0) + live.reduce((s, [, d]) => s + d.tokens, 0),
    cost: list.reduce((s, j) => s + j.cost, 0) + live.reduce((s, [, d]) => s + d.cost, 0) + (all.manager?.cost ?? 0),
    time: list.reduce((s, j) => s + j.ms, 0) + live.reduce((s, [, d]) => s + elapsedOf(d, at), 0),
  }
}

const GLYPH: Record<Desk['status'], string> = { working: '●', done: '✓', failed: '✗', idle: '○' }
const rank = (d: Desk | undefined) => ({ working: 0, done: 1, failed: 1, idle: 2 })[d?.status ?? 'idle']

export const register: Register = (on, options) => {
  STUDIO = String(options.studioName ?? '').trim() || DEFAULT_STUDIO
  const BAND = String(options.band ?? 'full')
  const AUTO_OPEN = options.autoOpenFloor !== false
  const SEQUENTIAL = options.sequentialAgents !== false

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const staff = resolveStaff(await loadEdits($))
    await update($, staffAtom, () => staff)
    await registerAgents($, staff)

    await $.command.register({
      name: 'office',
      description: `${STUDIO}: floor, staff editor, debate <topic>, roster, timesheet, on/off`,
      argumentHint: '[floor|staff|debate <topic>|roster|timesheet|on|off]',
    })
    await $.tool.register({
      name: 'meeting',
      description:
        `${STUDIO} meeting room. Call with action "start" (topic, participants: 3-5 staff slugs or names) before a debate, ' +
        'and with action "verdict" (decision: one sentence) once the Manager decides. Draws the meeting on the office floor.`,
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['start', 'verdict', 'end'] },
          topic: { type: 'string' },
          participants: { type: 'array', items: { type: 'string' } },
          decision: { type: 'string' },
        },
        required: ['action'],
      },
    })
    await $.tool.register({
      name: 'staff',
      description:
        `Rename a ${STUDIO} staff member or change their personality/rules or model, only when the owner asks. ` +
        'member: slug, name or role. reset: true restores the defaults for that member.',
      inputSchema: {
        type: 'object',
        properties: {
          member: { type: 'string' },
          name: { type: 'string', description: 'New first name, letters only.' },
          traits: { type: 'string', description: 'Personality and house rules, a few sentences.' },
          model: { type: 'string', enum: [...MODELS] },
          reset: { type: 'boolean' },
        },
        required: ['member'],
      },
    })

    const stored = await $.store.get('isOpen')
    await update($, isOpen, () => stored !== false)
    $.ui.status(stored === false ? undefined : `${STUDIO} · office open`)

    // Ticks the clocks on the floor while anyone works; quiet otherwise.
    $.clock.every(1000, () => {
      void (async () => {
        const all = await read($, desks)
        const hl = await read($, headline)
        if (!Object.values(all).some(d => d.status === 'working') && !hl?.isLive) return
        const at = await $.clock.now()
        await update($, now, () => at)
      })()
    })

    return started
  })

  on('command.run', { command: 'office' }, async ($, e) => {
    const raw = e.args.trim()
    const [verb = '', ...rest] = raw.split(/\s+/)
    const arg = verb.toLowerCase()
    const staff = await read($, staffAtom)

    if (arg === 'on' || arg === 'off') {
      const open = arg === 'on'
      await $.store.set('isOpen', open)
      await update($, isOpen, () => open)
      $.ui.status(open ? `${STUDIO} · office open` : undefined)
      return {
        text: open
          ? `${STUDIO} is open. The Manager runs the office from the next message.`
          : `${STUDIO} is closed. The office prompt is off until /office on.`,
      }
    }

    if (arg === 'timesheet') {
      const sheet = (await $.fs.exists(TIMESHEET)) ? await $.fs.read(TIMESHEET) : 'No office jobs logged yet.'
      return { text: sheet }
    }

    if (arg === 'staff') {
      const shown = await togglePane($, EDITOR, 'Studio staff')
      return { text: shown ? 'Staff editor opened.' : 'Staff editor closed.' }
    }

    if (arg === 'debate' || arg === 'meeting') {
      const topic = rest.join(' ').trim()
      if (!topic) return { text: 'Usage: /office debate <topic>' }
      // A command.run hook can't submit a prompt (it would wait on itself), so
      // queue it from a timer once the command has answered.
      $.clock.after(50, () => {
        void $.prompt.submit({
          text: `Hold an office meeting (debate) on: ${topic}\nPick the 3-5 staff whose roles and personalities give the most useful disagreement, run two rounds, then decide.`,
        })
      })
      return { text: `Meeting called: ${topic}` }
    }

    if (arg === '' || arg === 'floor') {
      const shown = await togglePane($, PANE, STUDIO)
      return { text: shown ? 'Office floor opened.' : 'Office floor closed.' }
    }

    await ensureOffice($)
    return {
      text: `**${STUDIO} — roster**\n\n${rosterTable($.plugin.name, staff)}\n\nOffice files: ${LOG}, .office/tickets/, ${TIMESHEET}. Rates (approximate, editable): ${RATES}. Edit staff with /office staff.`,
    }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!(await read($, isOpen))) {
      return composed
    }

    return {
      sections: [
        ...composed.sections,
        { id: `${$.plugin.name}:office`, text: officePrompt($.plugin.name, await read($, staffAtom), STUDIO), scope: 'session' as const },
      ],
    }
  })

  // The Manager is at work whenever the main session runs a turn.
  on('prompt.submit', async ($, e, next) => {
    const ran = await next(e)
    if (await read($, isOpen)) {
      const at = await $.clock.now()
      const mgr = (await read($, staffAtom))[0] as Member
      await setDesk($, 'manager', d => ({ ...d, status: 'working', task: 'Reviewing your request', startedAt: at, endedAt: undefined }))
      await say($, { slug: 'manager', text: `${label(mgr)} is reviewing your request` })
    }
    return ran
  })

  // Live tokens and cost: a subagent's steps go to its desk, the main session's to the Manager's.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const usage = result.usage
    if (!usage) return result

    const model = usage.model || e.model
    const all = await read($, desks)
    const slug = e.agentId ? Object.keys(all).find(k => all[k]?.agentId === e.agentId) : 'manager'
    if (slug && (slug !== 'manager' || all.manager?.status === 'working')) {
      const rates = await loadRates($)
      await setDesk($, slug, d => ({ ...d, model, tokens: d.tokens + tokensOf(usage), cost: d.cost + costOf(model, usage, rates) }))
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) {
      // A specialist that ran in the background finishes here.
      const all = await read($, desks)
      const slug = Object.keys(all).find(k => k !== 'manager' && all[k]?.agentId === e.agentId && all[k]?.status === 'working')
      const d = slug ? all[slug] : undefined
      if (slug && d) {
        const at = await $.clock.now()
        const staff = await read($, staffAtom)
        const m = staff.find(x => x.slug === slug) as Member
        const ms = at - (d.startedAt ?? at)
        await update($, jobs, list => [...list, { agent: label(m), task: d.task ?? '', model: d.model ?? 'unknown', ms, tokens: d.tokens, cost: d.cost }])
        await setDesk($, slug, x => ({ ...x, status: e.reason === 'answer' ? 'done' : 'failed', endedAt: at, jobs: x.jobs + 1 }))
        await log($, `${label(m)} finished "${d.task ?? ''}" in the background (${duration(ms)}, $${d.cost.toFixed(2)} approx).`)
      }
    } else {
      const at = await $.clock.now()
      const mgr = (await read($, staffAtom))[0] as Member
      await update($, desks, all => {
        const m = all.manager
        return m?.status === 'working' ? { ...all, manager: { ...m, status: 'done' as const, task: 'Reported back to you', endedAt: at } } : all
      })
      await update($, headline, h => (h?.isLive ? { ...h, isLive: false, text: `${label(mgr)} reported back to you`, slug: 'manager', to: undefined, at } : h))
    }
    return next(e)
  })

  // Links a spawned office agent to its desk, so its live steps find it.
  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    const m = memberFor(await read($, staffAtom), e.subagentType)
    if (m && started.deny === undefined) {
      await setDesk($, m.slug, d => ({ ...d, agentId: started.agentId, model: started.model }))
      if (!(await read($, autoOpened))) {
        await update($, autoOpened, () => true)
        if (AUTO_OPEN) await openPane($, PANE, STUDIO)
      }
    }
    return started
  })

  on('tool.call', { tool: MEETING_TOOL }, async ($, e) => {
    const input = e as unknown as { action?: string; topic?: string; participants?: string[]; decision?: string }
    const staff = await read($, staffAtom)
    const mgr = staff[0] as Member
    const at = await $.clock.now()

    if (input.action === 'start') {
      const topic = (input.topic ?? '').trim() || 'Untitled meeting'
      const participants = [...new Set((input.participants ?? []).map(p => findMember(staff, p)?.slug).filter((s): s is string => !!s && s !== 'manager'))].slice(0, 6)
      if (participants.length < 2) return { result: `error: name at least 2 participants from: ${staff.slice(1).map(m => m.slug).join(', ')}` }
      await update($, meeting, () => ({ topic, participants, turns: [], startedAt: at, isClosed: false }))
      await say($, { slug: 'manager', text: `${label(mgr)} called a meeting: ${topic}` })
      await log($, `${label(mgr)} called a meeting on "${topic}" with ${participants.map(s => label(staff.find(m => m.slug === s) as Member)).join(', ')}.`)
      if (AUTO_OPEN) await openPane($, PANE, STUDIO)
      return { result: `ok: meeting started with ${participants.join(', ')}. Use Agent descriptions "Debate R1: …" then "Debate R2: …".` }
    }

    if (input.action === 'verdict' || input.action === 'end') {
      const m = await read($, meeting)
      if (!m) return { result: 'error: no meeting in progress' }
      const decision = (input.decision ?? '').trim()
      await update($, meeting, prev => (prev ? { ...prev, verdict: decision || prev.verdict, isClosed: true } : prev))
      if (decision) {
        await say($, { slug: 'manager', text: `${label(mgr)} decided: ${decision}` })
        await log($, `Meeting "${m.topic}" decided by ${label(mgr)}: ${decision}`)
      }
      return { result: 'ok: meeting closed' }
    }

    return { result: 'error: action must be start, verdict or end' }
  })

  on('tool.call', { tool: STAFF_TOOL }, async ($, e) => {
    const input = e as unknown as { member?: string; name?: string; traits?: string; model?: string; reset?: boolean }
    const staff = await read($, staffAtom)
    const m = findMember(staff, input.member ?? '')
    if (!m) return { result: `error: no staff member "${input.member}". Use one of: ${staff.map(s => `${s.slug} (${label(s)})`).join(', ')}` }
    const edits = await loadEdits($)
    const name = input.name?.trim().replace(/[^\p{L}\p{N} '-]/gu, '').slice(0, 24)
    const next: MemberEdit = input.reset ? {} : { ...edits[m.slug], ...(name ? { name } : {}), ...(input.traits ? { traits: input.traits.slice(0, 1200) } : {}), ...(input.model ? { model: input.model } : {}) }
    const updated = await applyEdits($, { ...edits, [m.slug]: next })
    const now = updated.find(s => s.slug === m.slug) as Member
    await log($, `Staff change: ${label(m)} is now ${label(now)} (${now.model}); traits: ${now.traits}`)
    return { result: `ok: ${label(now)} · model ${now.model} · traits: ${now.traits}` }
  })

  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    const staff = await read($, staffAtom)
    const m = e.subagent_type ? memberFor(staff, e.subagent_type) : undefined
    if (m === undefined) {
      return next(e)
    }
    const slug = m.slug
    const name = label(m)
    const mgr = staff[0] as Member
    const isMeeting = DEBATE_PREFIX.test(e.description)
    const round = Number(/\bR(\d)/i.exec(e.description)?.[1] ?? 1)

    const startedAt = await $.clock.now()
    await setDesk($, slug, d => ({
      ...d,
      status: 'working',
      task: e.description,
      toolUseId: e.tool_use_id,
      startedAt,
      endedAt: undefined,
      tokens: 0,
      cost: 0,
    }))
    if (isMeeting) {
      const mt = await read($, meeting)
      await update($, meeting, prev =>
        prev && !prev.isClosed
          ? { ...prev, participants: prev.participants.includes(slug) ? prev.participants : [...prev.participants, slug], turns: [...prev.turns, { slug, round, stance: '', status: 'speaking' as const }] }
          : prev,
      )
      await say($, { slug, text: `${name} has the floor${mt ? `: ${mt.topic}` : ''}` })
    } else {
      await setDesk($, 'manager', d => (d.status === 'working' ? { ...d, task: `Delegated to ${name}` } : d))
      await say($, { slug: 'manager', to: slug, text: `${label(mgr)} assigned "${e.description}" to ${name}` })
    }

    let isOk = false
    let isLaunched = false
    try {
      // Office handoffs are sequential, and the timesheet needs the finished job.
      const ran = await next(SEQUENTIAL ? { ...e, run_in_background: false } : e)
      if (ran.deny !== undefined || ran.isError === true || !('usage' in ran.result)) {
        // A background launch: the desk stays busy until the subagent's own turn completes.
        isLaunched = ran.deny === undefined && ran.isError !== true
        return ran
      }
      isOk = true

      const out = ran.result
      const model = out.resolvedModel ?? out.modelsUsed?.[0] ?? 'unknown'
      const ms = out.totalDurationMs || (await $.clock.now()) - startedAt
      const cost = costOf(model, out.usage, await loadRates($))
      const job: Job = { agent: name, task: e.description, model, ms, tokens: out.totalTokens, cost }
      await update($, jobs, list => [...list, job])
      await setDesk($, slug, d => ({ ...d, model, tokens: job.tokens, cost }))

      if (isMeeting) {
        const text = out.content.map(c => c.text).join('\n')
        const stance = stanceOf(text)
        await update($, meeting, prev => {
          if (!prev) return prev
          const turns = [...prev.turns]
          const i = turns.map(t => t.slug === slug && t.status === 'speaking').lastIndexOf(true)
          if (i >= 0) turns[i] = { ...(turns[i] as Meeting['turns'][number]), stance, status: 'done' }
          return { ...prev, turns }
        })
        await say($, { slug, text: `${name}: “${stance}”` })
      } else {
        await say($, { slug, to: 'manager', text: `${name} handed "${e.description}" back to ${label(mgr)}` })
      }

      const line = `| ${stamp(startedAt)} | ${name} | ${model} | ${e.description} | ${duration(ms)} | ${job.tokens.toLocaleString('en-US')} | $${cost.toFixed(2)} |`
      try {
        await ensureOffice($)
        await appendTo(
          $,
          TIMESHEET,
          '# Office timesheet (cost approximate)\n\n| Started | Agent | Model | Task | Time | Tokens | Est. cost |\n|---|---|---|---|---:|---:|---:|\n',
          line,
        )
        await appendTo($, LOG, `# ${STUDIO} — Office Log\n`, `- ${stamp(await $.clock.now())} ${name} finished "${e.description}" (${duration(ms)}, $${cost.toFixed(2)} approx).`)
      } catch {
        $.ui.toast(`${STUDIO}: could not write .office/timesheet.md`)
      }

      return {
        ...ran,
        context: [
          ...(ran.context ?? []),
          `Office timesheet: ${name} · model ${model} · ${duration(ms)} · ${job.tokens} tokens · estimated cost $${cost.toFixed(2)} (approximate: list rates per MTok, cache reads at 0.1×). Use these figures in the ticket.`,
        ],
      }
    } finally {
      const at = await $.clock.now()
      if (!isLaunched) {
        await setDesk($, slug, d => ({ ...d, status: isOk ? 'done' : 'failed', endedAt: at, jobs: d.jobs + (isOk ? 1 : 0) }))
      }
      await setDesk($, 'manager', d => (d.status === 'working' ? { ...d, task: isMeeting ? 'Chairing the meeting' : 'Reviewing the handoff' } : d))
      await update($, now, () => at)
    }
  }).catch(($, e, next) => next(e))

  // --- the office floor: headline, meeting, everyone at a glance; desk cards on demand.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const staff = await read($, staffAtom)
    const all = await read($, desks)
    const list = await read($, jobs)
    const at = await read($, now)
    const hl = await read($, headline)
    const mt = await read($, meeting)
    const isDetailed = await read($, showDetails)
    const isMeetingShown = await read($, showMeeting)
    const t = totalsOf(list, all, at)
    const order = [...staff].sort((a, b) => rank(all[a.slug]) - rank(all[b.slug]))
    const isFullMeeting = mt !== null && (!mt.isClosed || isMeetingShown)
    const buttons = (
      <Box key="actions" flexDirection="row" flexWrap="wrap" gap={2}>
        <Button key="details" label={isDetailed ? '▾ Desk details' : '▸ Desk details'} plain onPress={() => update($, showDetails, v => !v)} />
        <Button key="edit-staff" label="Edit staff" plain onPress={() => void openPane($, EDITOR, 'Studio staff')} />
        {mt?.isClosed && <Button key="toggle-meeting" label={isMeetingShown ? 'Hide meeting' : 'Show meeting'} plain onPress={() => update($, showMeeting, v => !v)} />}
        {mt && <Button key="clear-meeting" label="Clear meeting" plain onPress={() => update($, meeting, () => null)} />}
      </Box>
    )

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(280, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      return (
        <Box flexDirection="column" gap={1}>
          {hl && <Svg key="headline" source={headlineSvg(W, hl, staff, at)} alt={hl.text} width={W} height={HEADLINE_H} />}
          {mt && isFullMeeting && <Svg key="meeting" source={meetingSvg(W, mt, staff)} alt={`Meeting: ${mt.topic}${mt.verdict ? `. Decision: ${mt.verdict}` : ''}`} width={W} height={meetingHeight(mt)} />}
          {mt && !isFullMeeting && <Svg key="verdict" source={verdictSvg(W, mt)} alt={`Last meeting: ${mt.topic}. Decision: ${mt.verdict ?? 'none'}`} width={W} height={40} />}
          <Svg
            key="floor"
            source={compactFloorSvg(W, staff, all, t, at)}
            alt={staff.map(s => `${label(s)}: ${all[s.slug]?.status === 'working' ? all[s.slug]?.task : all[s.slug]?.status ?? 'available'}`).join('; ')}
            width={W}
            height={compactHeight(W, staff.length)}
          />
          {buttons}
          {isDetailed && (
            <Box key="desk-cards" flexDirection="column">
              {order.map(s => (
                <Svg
                  key={s.slug}
                  source={deskSvg(W, s, all[s.slug], at)}
                  alt={`${label(s)}: ${all[s.slug]?.status ?? 'idle'}${all[s.slug]?.task ? `, ${all[s.slug]?.task}` : ''}`}
                  width={W}
                  height={DESK_H}
                />
              ))}
            </Box>
          )}
        </Box>
      )
    }

    // Terminal: the same floor in text, one line per person.
    return (
      <Box flexDirection="column">
        {hl && (
          <Text bold color={ACCENT[hl.slug] ?? CLAY} wrap="wrap">
            {hl.isLive ? '● NOW ' : 'LAST '}
            {hl.text} · {fmtTime(at - hl.at)}
          </Text>
        )}
        {mt && isFullMeeting && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Meeting: {mt.topic}</Text>
            {mt.participants.map(slug => {
              const s = staff.find(x => x.slug === slug)
              const turn = [...mt.turns].reverse().find(x => x.slug === slug)
              return (
                <Text key={`mt-${slug}`} wrap="truncate-end">
                  <Text color={ACCENT[slug] ?? CLAY}>▣ {s ? label(s) : slug}</Text>
                  <Text dimColor={!turn?.stance}> {turn?.status === 'speaking' ? 'speaking…' : turn?.stance || 'waiting'}</Text>
                </Text>
              )
            })}
            {mt.verdict && <Text bold>Decision: {mt.verdict}</Text>}
          </Box>
        )}
        {mt && !isFullMeeting && (
          <Text wrap="truncate-end">
            <Text dimColor>Last meeting: {mt.topic} — </Text>
            <Text bold>{mt.verdict ?? 'no decision'}</Text>
          </Text>
        )}
        <Text dimColor>
          {staff.filter(s => all[s.slug]?.status === 'working').length}/{staff.length} on the floor · {t.jobs} jobs · ≈{fmtCost(t.cost)} · {fmtTime(t.time)}
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {staff.map(s => {
            const d = all[s.slug]
            const status = d?.status ?? 'idle'
            return (
              <Text key={s.slug} wrap="truncate-end">
                <Text color={ACCENT[s.slug] ?? CLAY}>▣ </Text>
                <Text bold={status === 'working'} dimColor={status === 'idle'}>
                  {label(s).padEnd(18)}
                </Text>
                <Text dimColor={status !== 'working'}>
                  {GLYPH[status]} {status === 'working' ? `${d?.task ?? ''} · ${fmtTime(elapsedOf(d as Desk, at))}` : status === 'idle' ? 'available' : d?.task ?? status}
                  {isDetailed && d?.startedAt ? ` · ${modelName(d.model ?? '')} · ${fmtTokens(d.tokens)} · ≈${fmtCost(d.cost)}` : ''}
                </Text>
              </Text>
            )
          })}
        </Box>
        {buttons}
      </Box>
    )
  })

  // --- staff editor: the team by department, then one person's profile in sections.
  on('ui.render', { component: 'Pane', requestId: EDITOR }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const staff = await read($, staffAtom)
    const slug = await read($, editing)
    const m = staff.find(s => s.slug === slug) ?? (staff[0] as Member)
    const base = DEFAULT_STAFF.find(b => b.slug === m.slug)
    const edits = await loadEdits($)
    const isEdited = Object.keys(edits[m.slug] ?? {}).length > 0
    const W = Math.max(280, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
    const save = async (edit: MemberEdit) => {
      const current = await loadEdits($)
      const updated = await applyEdits($, { ...current, [m.slug]: { ...current[m.slug], ...edit } })
      const saved = updated.find(s => s.slug === m.slug) as Member
      $.ui.toast(`Saved ${label(saved)}`)
      await log($, `Staff change (editor): ${label(saved)} · ${saved.model} · ${saved.traits}`)
    }
    const color = ACCENT[m.slug] ?? CLAY
    const section = (key: string, title: string, hint: string, body: RenderChildren) => (
      <Box key={key} flexDirection="column" borderStyle="round" borderColor={key === 'sec-traits' ? color : undefined} paddingX={1}>
        <Text bold>{title}</Text>
        <Text dimColor>{hint}</Text>
        {body}
      </Box>
    )

    const departments = DEPARTMENTS.map(dep => (
      <Box key={`dep-${dep.title}`} flexDirection="row" flexWrap="wrap" gap={1}>
        <Text dimColor>{dep.title.padEnd(17)}</Text>
        {dep.slugs.map(sl => {
          const s = staff.find(x => x.slug === sl)
          if (!s) return null
          const isSel = s.slug === m.slug
          return <Button key={`pick-${s.slug}`} label={isSel ? `● ${label(s)}` : label(s)} plain={!isSel || undefined} onPress={() => update($, editing, () => s.slug)} />
        })}
      </Box>
    ))

    const strip =
      e.surface === 'desktop' && 'Svg' in ui ? <ui.Svg key="strip" source={teamStripSvg(W, staff, m.slug)} alt={`Editing ${label(m)}`} width={W} height={62} /> : null

    return (
      <Box flexDirection="column" gap={1}>
        <Box key="intro" flexDirection="column">
          <Text bold>Studio staff</Text>
          <Text dimColor>Pick a person, edit a field and press Enter to save. Changes apply in every project from the next task.</Text>
        </Box>
        {strip}
        <Box key="team" flexDirection="column">
          {departments}
        </Box>

        <Box key="profile" flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
          <Text bold color={color}>
            {label(m)} — {m.title}
            {isEdited ? '  (customised)' : ''}
          </Text>
          <Text dimColor>
            Default: {base ? `${base.name}(${base.role})` : '—'} · model {m.model}
            {m.slug === 'manager' ? ' (the main session)' : ` · subagent ${$.plugin.name}:${m.slug}`}
          </Text>
        </Box>

        {'Input' in ui ? (
          <>
            {section(
              'sec-name',
              'Name',
              `First name only, shown as ${m.name}(${m.role}). Letters, up to 24.`,
              <ui.Input key={`name-${m.slug}`} label="Name" value={m.name} placeholder={base?.name} submitLabel="save" onSubmit={value => void save({ name: value.trim().replace(/[^\p{L}\p{N} '-]/gu, '').slice(0, 24) })} />,
            )}
            {section(
              'sec-traits',
              'Personality & rules',
              'How they think, argue in meetings and behave. Up to 1200 characters.',
              <ui.Input key={`traits-${m.slug}`} label="Traits" value={m.traits} placeholder={base?.traits} submitLabel="save" onSubmit={value => void save({ traits: value.slice(0, 1200) })} />,
            )}
          </>
        ) : (
          <Text key="no-input" dimColor>
            This surface has no text fields; ask the Manager to change staff instead.
          </Text>
        )}

        {section(
          'sec-model',
          'Model',
          m.slug === 'manager' ? 'The Manager is this session; change its model in the app.' : 'Bigger models think harder and cost more.',
          <Box key="models" flexDirection="row" flexWrap="wrap" gap={1}>
            {(m.slug === 'manager' ? (['inherit'] as const) : MODELS).map(model => (
              <Button key={`model-${model}`} label={model === m.model ? `● ${model}` : model} plain={model !== m.model || undefined} onPress={() => void save({ model })} />
            ))}
          </Box>,
        )}

        {section(
          'sec-remit',
          'Responsibilities (fixed by role)',
          `Tools: ${m.tools.join(', ')}`,
          <Text key="remit" dimColor wrap="wrap">
            {m.remit}
          </Text>,
        )}

        <Box key="footer" flexDirection="row" gap={2}>
          <Button
            key="reset-one"
            label={`Reset ${m.name} to default`}
            plain
            onPress={async () => {
              const current = await loadEdits($)
              await applyEdits($, { ...current, [m.slug]: {} })
              $.ui.toast(`${label(m)} reset to default`)
            }}
          />
          <Button key="close-editor" label="Close" plain onPress={() => void $.ui.close({ id: EDITOR })} />
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (BAND === 'off' || !(await read($, isOpen)) || e.props.hasSurvey) {
      return next(e)
    }

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const staff = await read($, staffAtom)
    const all = await read($, desks)
    const list = await read($, jobs)
    const at = await read($, now)
    const hl = await read($, headline)
    const t = totalsOf(list, all, at)
    const summary = `${STUDIO} · ${t.jobs} job${t.jobs === 1 ? '' : 's'} · ≈${fmtCost(t.cost)} · ${fmtTime(t.time)}`
    const live = hl?.isLive ? hl : null
    const floorButton = <Button key="office-floor" label="Floor" plain onPress={() => void togglePane($, PANE, STUDIO)} />

    if ('Svg' in ui) {
      const { Svg } = ui
      const width = Math.max(320, Math.min(1600, (e.props.bodyColumns || 100) * 8 - 80))
      return (
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Svg source={bandSvg(width, staff, all, at, live, summary, BAND !== 'compact')} alt={live?.text ?? summary} width={width} height={BAND_H} />
          {floorButton}
        </Box>
      )
    }

    return (
      <Box flexDirection="row" gap={1}>
        {BAND !== 'compact' &&
          staff.map(s => (
            <Text key={s.slug} color={ACCENT[s.slug] ?? CLAY} dimColor={all[s.slug]?.status !== 'working'}>
              ▣
            </Text>
          ))}
        <Text wrap="truncate-end" bold={!!live} dimColor={!live} color={live ? ACCENT[live.slug] : undefined}>
          {live ? `● ${live.text} · ${fmtTime(at - live.at)}` : summary}
        </Text>
        {floorButton}
      </Box>
    )
  })
}
