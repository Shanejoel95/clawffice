export type Desk = {
  status: 'idle' | 'working' | 'done' | 'failed'
  task?: string
  model?: string
  agentId?: string
  toolUseId?: string
  startedAt?: number
  endedAt?: number
  tokens: number
  cost: number
  jobs: number
}

export type Job = {
  agent: string
  task: string
  model: string
  ms: number
  tokens: number
  cost: number
}

export type Member = {
  slug: string
  name: string
  role: string
  title: string
  model: string
  tools: readonly string[]
  traits: string
  remit: string
}

export type MemberEdit = { name?: string; traits?: string; model?: string }

export type Headline = { text: string; slug: string; to?: string; at: number; isLive: boolean }

export type MeetingTurn = { slug: string; round: number; stance: string; status: 'speaking' | 'done' }

export type Meeting = {
  topic: string
  participants: string[]
  turns: MeetingTurn[]
  verdict?: string
  startedAt: number
  isClosed: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'clawffice': {
      desks: Record<string, Desk>
      jobs: Job[]
      isOpen: boolean
      now: number
      autoOpened: boolean
      staff: Member[]
      headline: Headline | null
      meeting: Meeting | null
      editing: string
      showDetails: boolean
      showMeeting: boolean
    }
  }
}
