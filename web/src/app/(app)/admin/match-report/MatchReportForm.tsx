'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Send, CheckCircle } from 'lucide-react'
import { generateAndSendReport } from './actions'
import {
  RUGBY_LEAGUE_POSITIONS,
  DEFAULT_STATS,
  type ServiceType,
  type PlayerReport,
  type TeamSummary,
  type MatchReportData,
} from './types'

// ── Local form state types ────────────────────────────────────────────────────

interface PlayerDraft extends PlayerReport {
  _id: string
  _collapsed: boolean
}

function newPlayer(index: number): PlayerDraft {
  return {
    _id: crypto.randomUUID(),
    _collapsed: false,
    name: '',
    position: '',
    stats: { ...DEFAULT_STATS },
    strengths: '',
    areasToImprove: '',
    actionPoints: '',
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-widest uppercase text-[#e8560a] mb-3">
      {children}
    </p>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">
        {label}
        {required && <span className="text-[#e8560a] ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#e8560a]/40'

const textareaCls =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#e8560a]/40 resize-none'

function StatInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-zinc-500 text-center leading-tight">{label}</p>
      <input
        type="number"
        min="0"
        max="999"
        value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-center text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#e8560a]/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  )
}

function StatsSection({
  stats,
  onChange,
}: {
  stats: PlayerReport['stats']
  onChange: (field: keyof PlayerReport['stats'], value: number) => void
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-5">
      <div>
        <SectionHeading>Attack</SectionHeading>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <StatInput label="Carries"     value={stats.carries}     onChange={v => onChange('carries', v)} />
          <StatInput label="Metres Made" value={stats.metresMade}  onChange={v => onChange('metresMade', v)} />
          <StatInput label="Line Breaks" value={stats.lineBreaks}  onChange={v => onChange('lineBreaks', v)} />
          <StatInput label="Offloads"    value={stats.offloads}    onChange={v => onChange('offloads', v)} />
          <StatInput label="Tries"       value={stats.tries}       onChange={v => onChange('tries', v)} />
          <StatInput label="Try Assists" value={stats.tryAssists}  onChange={v => onChange('tryAssists', v)} />
        </div>
      </div>
      <div>
        <SectionHeading>Defence &amp; Errors</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatInput label="Tackles Made"    value={stats.tacklesMade}    onChange={v => onChange('tacklesMade', v)} />
          <StatInput label="Missed Tackles"  value={stats.missedTackles}  onChange={v => onChange('missedTackles', v)} />
          <StatInput label="Handling Errors" value={stats.handlingErrors} onChange={v => onChange('handlingErrors', v)} />
          <StatInput label="Penalties"       value={stats.penalties}      onChange={v => onChange('penalties', v)} />
        </div>
      </div>
    </div>
  )
}

function CommentsSection({
  player,
  onChange,
}: {
  player: PlayerDraft
  onChange: (field: 'strengths' | 'areasToImprove' | 'actionPoints', value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <label className="text-sm font-semibold">Strengths</label>
        </div>
        <textarea
          rows={3}
          value={player.strengths}
          onChange={e => onChange('strengths', e.target.value)}
          placeholder="Describe the player's strengths observed in this match…"
          className={textareaCls}
        />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
          <label className="text-sm font-semibold">Areas to Improve</label>
        </div>
        <textarea
          rows={3}
          value={player.areasToImprove}
          onChange={e => onChange('areasToImprove', e.target.value)}
          placeholder="What areas need development based on this performance…"
          className={textareaCls}
        />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
          <label className="text-sm font-semibold">Action Points for Training</label>
        </div>
        <textarea
          rows={3}
          value={player.actionPoints}
          onChange={e => onChange('actionPoints', e.target.value)}
          placeholder="Specific drills or focus areas to work on in training…"
          className={textareaCls}
        />
      </div>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function MatchReportForm() {
  const [serviceType, setServiceType] = useState<ServiceType>('match-review')
  const [customerEmail, setCustomerEmail] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [opposition, setOpposition] = useState('')
  const [competition, setCompetition] = useState('')

  const [teamSummary, setTeamSummary] = useState<TeamSummary>({
    overallShape: '',
    defensivePatterns: '',
    attackingThreats: '',
    setPieceNotes: '',
  })

  const [players, setPlayers] = useState<PlayerDraft[]>([newPlayer(0)])

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  // ── Player helpers ──────────────────────────────────────────────────────────

  function updatePlayer(idx: number, patch: Partial<PlayerDraft>) {
    setPlayers(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  function updateStat(idx: number, field: keyof PlayerReport['stats'], value: number) {
    setPlayers(prev =>
      prev.map((p, i) =>
        i === idx ? { ...p, stats: { ...p.stats, [field]: value } } : p,
      ),
    )
  }

  function addPlayer() {
    setPlayers(prev => {
      const collapsed = prev.map(p => ({ ...p, _collapsed: true }))
      return [...collapsed, newPlayer(prev.length)]
    })
  }

  function removePlayer(idx: number) {
    setPlayers(prev => prev.filter((_, i) => i !== idx))
  }

  function toggleCollapse(idx: number) {
    setPlayers(prev =>
      prev.map((p, i) => (i === idx ? { ...p, _collapsed: !p._collapsed } : p)),
    )
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const data: MatchReportData = {
      serviceType,
      customerEmail,
      matchDate,
      opposition,
      competition,
      players: players.map(({ _id, _collapsed, ...rest }) => rest),
      teamSummary: serviceType === 'opposition-scouting' ? teamSummary : undefined,
    }

    startTransition(async () => {
      setStatus('sending')
      const result = await generateAndSendReport(data)
      if (result.success) {
        setStatus('sent')
      } else {
        setStatus('error')
        setErrorMsg(result.error ?? 'Something went wrong. Please try again.')
      }
    })
  }

  // ── Success state ────────────────────────────────────────────────────────────

  if (status === 'sent') {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-10 text-center space-y-4">
        <CheckCircle className="mx-auto text-emerald-400" size={44} strokeWidth={1.5} />
        <div>
          <h2 className="text-xl font-bold mb-1">Report sent.</h2>
          <p className="text-zinc-400 text-sm">
            The PDF has been emailed to{' '}
            <span className="text-white font-semibold">{customerEmail}</span>.
          </p>
        </div>
        <button
          onClick={() => {
            setStatus('idle')
            setCustomerEmail('')
            setMatchDate('')
            setOpposition('')
            setCompetition('')
            setPlayers([newPlayer(0)])
            setTeamSummary({ overallShape: '', defensivePatterns: '', attackingThreats: '', setPieceNotes: '' })
          }}
          className="mt-2 text-sm text-[#e8560a] hover:underline"
        >
          Start a new report
        </button>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Service type toggle */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <SectionHeading>Report Type</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'match-review' as ServiceType,       label: 'Match Review',        sub: 'Individual player analysis' },
            { value: 'opposition-scouting' as ServiceType, label: 'Opposition Scouting', sub: 'Full team breakdown' },
          ]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setServiceType(opt.value)
                setPlayers([newPlayer(0)])
              }}
              className={`text-left rounded-lg border p-3 transition-colors ${
                serviceType === opt.value
                  ? 'border-[#e8560a] bg-[rgba(232,86,10,0.08)]'
                  : 'border-zinc-700 hover:border-zinc-500'
              }`}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Match details */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
        <SectionHeading>Match Details</SectionHeading>

        <Field label="Customer Email" required>
          <input
            type="email"
            required
            value={customerEmail}
            onChange={e => setCustomerEmail(e.target.value)}
            placeholder="coach@example.com"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Match Date" required>
            <input
              type="date"
              required
              value={matchDate}
              onChange={e => setMatchDate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Opposition" required>
            <input
              type="text"
              required
              value={opposition}
              onChange={e => setOpposition(e.target.value)}
              placeholder="e.g. St Helens U18s"
              className={inputCls}
            />
          </Field>
          <Field label="Competition" required>
            <input
              type="text"
              required
              value={competition}
              onChange={e => setCompetition(e.target.value)}
              placeholder="e.g. NW Counties U18s"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Team summary (opposition scouting only) */}
      {serviceType === 'opposition-scouting' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <SectionHeading>Team Summary</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { field: 'overallShape'      as const, label: 'Overall Shape',       placeholder: 'Describe the team\'s general structure and shape in attack and defence…' },
              { field: 'defensivePatterns' as const, label: 'Defensive Patterns',  placeholder: 'How do they defend — blitz line, rush, man-to-man…' },
              { field: 'attackingThreats'  as const, label: 'Attacking Threats',   placeholder: 'Key attacking weapons, play patterns, dangerous players…' },
              { field: 'setPieceNotes'     as const, label: 'Set Piece Notes',     placeholder: 'Scrum, lineout, kick-off and restart patterns…' },
            ]).map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className="block text-sm font-semibold mb-1.5">{label}</label>
                <textarea
                  rows={4}
                  value={teamSummary[field]}
                  onChange={e => setTeamSummary(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className={textareaCls}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Players */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeading>
            {serviceType === 'match-review' ? 'Player Analysis' : `Players (${players.length})`}
          </SectionHeading>
          {serviceType === 'opposition-scouting' && (
            <button
              type="button"
              onClick={addPlayer}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#e8560a] hover:text-[#d14d09] transition-colors"
            >
              <Plus size={14} />
              Add Player
            </button>
          )}
        </div>

        {players.map((player, idx) => (
          <div key={player._id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            {/* Player card header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <button
                type="button"
                onClick={() => toggleCollapse(idx)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <span className="text-xs font-bold text-zinc-500 w-6 shrink-0">
                  {serviceType === 'opposition-scouting' ? `#${idx + 1}` : ''}
                </span>
                <span className="text-sm font-semibold text-white">
                  {player.name || (serviceType === 'match-review' ? 'Player Details' : `Player ${idx + 1}`)}
                </span>
                {player.position && (
                  <span className="text-xs text-zinc-500">· {player.position}</span>
                )}
                {player._collapsed
                  ? <ChevronDown size={14} className="text-zinc-600 ml-auto" />
                  : <ChevronUp   size={14} className="text-zinc-600 ml-auto" />
                }
              </button>
              {serviceType === 'opposition-scouting' && players.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlayer(idx)}
                  className="ml-3 text-zinc-600 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Player card body */}
            {!player._collapsed && (
              <div className="p-5 space-y-6">
                {/* Name + Position */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Player Name" required>
                    <input
                      type="text"
                      required
                      value={player.name}
                      onChange={e => updatePlayer(idx, { name: e.target.value })}
                      placeholder="e.g. Jamie Thompson"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Position" required>
                    <select
                      required
                      value={player.position}
                      onChange={e => updatePlayer(idx, { position: e.target.value })}
                      className={`${inputCls} cursor-pointer`}
                    >
                      <option value="">Select position…</option>
                      {RUGBY_LEAGUE_POSITIONS.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Stats */}
                <div>
                  <SectionHeading>Match Stats</SectionHeading>
                  <StatsSection
                    stats={player.stats}
                    onChange={(field, value) => updateStat(idx, field, value)}
                  />
                </div>

                {/* Comments */}
                <div>
                  <SectionHeading>Coach Analysis</SectionHeading>
                  <CommentsSection
                    player={player}
                    onChange={(field, value) => updatePlayer(idx, { [field]: value })}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {serviceType === 'opposition-scouting' && (
          <button
            type="button"
            onClick={addPlayer}
            className="w-full rounded-xl border border-dashed border-zinc-700 py-3 text-sm text-zinc-500 hover:border-[#e8560a] hover:text-[#e8560a] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            Add another player
          </button>
        )}
      </div>

      {/* Error */}
      {status === 'error' && (
        <p className="text-sm text-destructive rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5">
          {errorMsg}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || status === 'sending'}
        className="w-full rounded-xl bg-[#e8560a] hover:bg-[#d14d09] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 text-sm transition-colors flex items-center justify-center gap-2"
      >
        <Send size={15} />
        {status === 'sending' ? 'Generating & sending report…' : 'Send Report to Customer'}
      </button>

      <p className="text-xs text-center text-zinc-600">
        A branded PDF will be generated and emailed directly to the customer.
      </p>
    </form>
  )
}
