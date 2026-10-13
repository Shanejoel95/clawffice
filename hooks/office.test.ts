import { expect, mock, test } from 'claude-code/testing'

import { costOf, duration, findMember, slugOf, stanceOf } from './register'
import { agentPrompt, resolveStaff } from './staff'

test('maps subagent types to staff', () => {
  expect(slugOf('shane-digital-studio:developer')).toBe('developer')
  expect(slugOf('shane-digital-studio:support')).toBe('support')
  expect(slugOf('general-purpose')).toBe(undefined)
})

test('applies the owner’s edits and builds the persona prompt', () => {
  const staff = resolveStaff({ developer: { name: 'Jordan', traits: 'Grumpy but brilliant.', model: 'opus' }, qa: { model: 'nonsense' } })
  const dev = findMember(staff, 'jordan')
  expect(dev?.slug).toBe('developer')
  expect(dev?.model).toBe('opus')
  expect(findMember(staff, 'qa')?.model).toBe('sonnet')
  expect(agentPrompt(dev!, staff)).toContain('You are Jordan(Developer)')
  expect(agentPrompt(dev!, staff)).toContain('Grumpy but brilliant.')
})

test('reads a meeting stance', () => {
  expect(stanceOf('STANCE: Ship the MVP first.\nBecause...')).toBe('Ship the MVP first.')
  expect(stanceOf('**STANCE:** Wait for security review.')).toBe('Wait for security review.')
  expect(stanceOf('We should cut scope. Then ship.')).toBe('We should cut scope.')
})

test('estimates cost per model family', () => {
  const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
  expect(costOf('claude-sonnet-5-5', usage)).toBe(18)
  expect(costOf('claude-haiku-5-5', usage)).toBe(6)
  expect(duration(192_000)).toBe('3m 12s')
})

const agentResult = (text: string) =>
  ({
    result: {
      agentId: 'a1',
      content: [{ type: 'text', text }],
      resolvedModel: 'claude-sonnet-5-5',
      totalToolUseCount: 1,
      totalDurationMs: 60_000,
      totalTokens: 100_000,
      usage: { input_tokens: 50_000, output_tokens: 10_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: null, service_tier: null, cache_creation: null },
    },
  }) as never

test('adds the office prompt and records an office job', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'base', scope: 'shared' }] }))
  let sawForeground = false
  on('tool.call', (_$, e) => {
    sawForeground = (e as { run_in_background?: boolean }).run_in_background === false
    return agentResult('done')
  })
  mock.clock(on, { now: Date.UTC(2026, 9, 13, 9, 0) })

  const composed = await $.prompt.compose({ model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: [], tools: [], outputStyle: null, traits: [] })
  expect(composed.sections.map(s => s.id)).toEqual(['intro', 'shane-digital-studio:office'])

  const ran = await $.tool.call({ tool: 'Agent', tool_use_id: 't1', description: 'Implement login API', prompt: 'go', subagent_type: 'shane-digital-studio:developer', run_in_background: true } as never)
  expect(sawForeground).toBe(true)
  expect(ran.context?.[0]).toContain('Joel(Developer)')
  expect(ran.context?.[0]).toContain('$0.30')
  const band = await $.ui.mount({ plugin: 'shane-digital-studio', surface: 'desktop', component: 'AbovePrompt', props: { bodyColumns: 200, hasSurvey: false } as never })
  const texts = JSON.stringify(await band.findAll({}))
  expect(texts).toContain('Implement login API')
  expect(texts).toContain('back to Shane(Manager)')
})

test('runs a meeting: stances and verdict reach the meeting room', async ($, on) => {
  on('tool.call', (_$, e) => ((e as { tool: string }).tool === 'Agent' ? agentResult('STANCE: Ship walk-only, it is the brand.\nMore words.') : ({ result: 'unused' } as never)))
  mock.clock(on, { now: Date.UTC(2026, 9, 13, 9, 0) })

  const started = await $.tool.call({ tool: 'mcp__shane-digital-studio__meeting', tool_use_id: 'm1', action: 'start', topic: 'Fallback unlocks?', participants: ['product', 'Omar', 'ux'] } as never)
  expect(String(started.result)).toContain('ok')
  await $.tool.call({ tool: 'Agent', tool_use_id: 't2', description: 'Debate R1: fallback unlocks', prompt: 'go', subagent_type: 'shane-digital-studio:product' } as never)
  const open = await $.ui.mount({ plugin: 'shane-digital-studio', surface: 'terminal', component: 'Pane', requestId: 'office-floor', props: { bodyColumns: 200 } as never } as never)
  expect((await open.findAll({ type: 'Text', text: /Omar\(Security\)/ })).length > 0).toBe(true)
  expect((await open.findAll({ type: 'Text', text: /Ship walk-only, it is the brand\./ })).length > 0).toBe(true)
  await $.tool.call({ tool: 'mcp__shane-digital-studio__meeting', tool_use_id: 'm2', action: 'verdict', decision: 'Walk-only stays.' } as never)

  const room = open
  expect((await room.findAll({ type: 'Text', text: /Walk-only stays\./ })).length > 0).toBe(true)
  expect((await room.findAll({ key: 'toggle-meeting' })).length).toBe(1)
})

test('draws the band, floor and staff editor on desktop and terminal', async ($, on) => {
  mock.store(on, { staff: { developer: { name: 'Jordan' } } })
  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ plugin: 'shane-digital-studio', surface, component: 'AbovePrompt', props: { bodyColumns: 120, hasSurvey: false } as never })
    expect((await band.findAll({ key: 'office-floor' })).length).toBe(1)
    const floor = await $.ui.mount({ plugin: 'shane-digital-studio', surface, component: 'Pane', requestId: 'office-floor', props: { bodyColumns: 60 } as never } as never)
    expect((await floor.findAll({ key: 'edit-staff' })).length).toBe(1)
    const editor = await $.ui.mount({ plugin: 'shane-digital-studio', surface, component: 'Pane', requestId: 'office-staff', props: { bodyColumns: 60 } as never } as never)
    expect((await editor.findAll({ key: 'name-manager' })).length).toBe(1)
    expect((await editor.findAll({ key: 'pick-developer' })).length).toBe(1)
  }
})

test('uses the studio name option in the office prompt', { options: { studioName: 'Acme Labs' } }, async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'base', scope: 'shared' }] }))
  const composed = await $.prompt.compose({ model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: [], tools: [], outputStyle: null, traits: [] })
  const office = composed.sections.find(s => s.id === 'shane-digital-studio:office')
  expect(office?.text).toContain('Office Manager of Acme Labs')
})

test('band option off hides the band', { options: { band: 'off' } }, async ($, on) => {
  on('ui.render', () => ({ type: 'Box', props: {}, children: [] }) as never)
  const band = await $.ui.mount({ plugin: 'shane-digital-studio', surface: 'terminal', component: 'AbovePrompt', props: { bodyColumns: 120, hasSurvey: false } as never })
  expect((await band.findAll({ key: 'office-floor' })).length).toBe(0)
})

test('without sequential agents the call is passed through unchanged', { options: { sequentialAgents: false } }, async ($, on) => {
  let background: unknown
  on('tool.call', (_$, e) => {
    background = (e as { run_in_background?: boolean }).run_in_background
    return { result: { status: 'async_launched', agentId: 'a9', description: 'x', prompt: 'go' } } as never
  })
  mock.clock(on, { now: Date.UTC(2026, 9, 13, 9, 0) })
  await $.tool.call({ tool: 'Agent', tool_use_id: 't9', description: 'Write docs', prompt: 'go', subagent_type: 'shane-digital-studio:support', run_in_background: true } as never)
  expect(background).toBe(true)
})
