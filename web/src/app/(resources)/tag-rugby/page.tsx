import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Try Tag Rugby Rules — 18th Man',
  description: 'Official Try Tag Rugby (TTR) playing rules. Field dimensions, mode of play, scoring, defence, attacking, kicking, penalties, and referee duties.',
  openGraph: {
    title: 'Try Tag Rugby Rules — 18th Man',
    description: 'Official Try Tag Rugby (TTR) playing rules from the Rugby Football League.',
  },
}

interface RuleItem {
  text: string
  bold?: boolean
  sub?: string[]
}

interface RulesSection {
  id: string
  number: string
  title: string
  intro?: string
  rules: RuleItem[]
}

const sections: RulesSection[] = [
  {
    id: 'introduction',
    number: '1',
    title: 'Introduction',
    rules: [
      { text: 'A game of Try Tag Rugby shall be played on a field with dimensions 50m wide and 70m long.' },
    ],
  },
  {
    id: 'ball',
    number: '2',
    title: 'Ball',
    rules: [
      { text: 'Size 5 ball.' },
    ],
  },
  {
    id: 'players-equipment',
    number: '3',
    title: 'Players & Playing Equipment',
    rules: [
      { text: 'The maximum number of players per team on the field at any one time is determined by the league but is typically 7. Unlimited interchange is allowed — the leaving player must exit before the replacement influences play.' },
      { text: 'Minimum players: 3 per side for 6-a-side, 4 for 7-a-side, and 5 for 8-a-side. In mixed competitions the maximum male players on field is 3 (6-a-side) or 4 (7/8-a-side).' },
      { text: 'A bleeding player must leave the field for medical attention before re-joining.' },
      { text: 'Equipment: authorised shorts, plastic studded boots (no metal studs) or runners, and authorised tags. Prescription glasses are permitted.' },
      { text: 'The referee inspects equipment before the game and may exclude a player whose equipment is deemed dangerous.' },
      { text: 'If the ball bursts during a try or restart, the try stands or play is re-taken. During general play, a tag is counted, the ball is replaced, and play resumes with a play-the-ball. A burst on the sixth tag awards a changeover to the defending team.' },
    ],
  },
  {
    id: 'mode-of-play',
    number: '4',
    title: 'Mode of Play',
    rules: [
      { text: 'The objective is to ground the ball on or over the opponent\'s try line. The team without the ball prevents this by removing a tag from the ball carrier.' },
      { text: 'The attacking team has 6 "plays" or "tags". After 6 tags, a changeover occurs and the defending team becomes the attacking team.' },
      { text: 'Captains toss for choice of ends. The opposition team kick-off from the centre of the field to start.' },
      { text: 'An on-side attacking player may run with the ball, kick in any direction, or throw/knock the ball in any direction other than towards the opponent\'s try line.' },
      { text: 'A player not in possession — defender or attacker — cannot be tagged or obstructed during play.' },
      { text: 'Tag is a non-tackling / minimal-contact game. Accidental contact may occur but the onus is on the attacking team to avoid it.' },
    ],
  },
  {
    id: 'length',
    number: '5',
    title: 'Length of the Game',
    rules: [
      { text: 'TTR games last 40 minutes.' },
    ],
  },
  {
    id: 'scoring',
    number: '6',
    title: 'Scoring Tries',
    rules: [
      { text: '1 point for a try. In mixed games, a female try scores 2 points.' },
      { text: 'Bonus Box: a 5m-wide, 3m-deep box in the middle of the try line. A try scored directly in the bonus box earns an extra point (total 2 pts; 3 pts for a female try in mixed). The bonus box may only be accessed from the front — back or side entry scores the try but not the bonus.' },
      { text: 'The game is won by the team scoring the most points. Equal scores = draw.' },
      { text: 'Drawn knockout games are decided by: (a) Golden Try — first to score wins, right of reply if try comes on the first set; (b) Drop-Off — both sides reduce to 5 players, same right-of-reply rule; or (c) First Try Scorer — team that scored first in normal time wins.' },
      { text: 'A try is awarded when the attacking team grounds the ball on or over the try line.' },
      { text: 'A penalty try may be awarded if foul play prevents an inevitable try. It carries the same points as the try that would have been scored.' },
      { text: 'A try can be scored from a kick if the ball is re-gathered or controlled before it touches the ground beyond the try line.' },
      { text: 'If the ball bounces on or beyond the try line, the ball is dead.' },
      { text: 'A player cannot pass or kick the ball after crossing the try line. Doing so counts as a tag 5m out from where the incident occurred. On the sixth tag, a changeover is awarded 5m out.' },
      { text: 'A player may dive in the air from the field of play to score a try as long as no defender is within tagging distance.' },
    ],
  },
  {
    id: 'defence',
    number: '7',
    title: 'Defence Rules',
    rules: [
      { text: 'The ball carrier\'s progress is halted only when a defender removes one or both tags. If both are removed, the point of the first removal is where the ball is played.' },
      { text: 'After making a tag, the defender must hold the tag in the air, drop it, then either take up a marker position (directly in front, no more than 1m away) or return to the defensive line. The ball carrier returns to the tag point and plays the ball.' },
      { text: 'The defensive line sets 7m back from the play-the-ball. One defender may act as a marker (optional).' },
      { text: 'The marker and defensive line may only move forward once the ball is touched by the dummy half. If the dummy half baulks, the referee calls "play on" — the line may advance but the marker stays.' },
      { text: 'If the attacking side fails to score before the sixth tag, a changeover is awarded to the defending team at the point of the sixth tag.' },
      { text: 'A player may defend with one or no tags. If they receive a kicked/dropped ball, they must immediately play-the-ball and a tag is counted. A player pre- or late-tagged with one tag can only be stopped by removing that remaining tag. With no tags, a player is deemed "tagged" when a defender comes within tagging distance.' },
    ],
  },
  {
    id: 'attacking',
    number: '8',
    title: 'Attacking Rules',
    rules: [
      { text: 'The ball carrier may run, kick, or pass. An attacker can only progress the ball with two tags on, unless advantage is being played due to a late/pre tag.' },
      { text: 'The attacking team has 6 successive tags before a changeover.' },
      { text: 'When tagged, the ball carrier returns to the point of the first tag removed and plays the ball without delay.' },
      { text: 'Play-the-ball: the ball player places the ball under one foot and rolls it backward to the dummy half, who initiates the next play. The ball player then replaces their tag before joining the attack again.' },
      { text: 'If there is no marker, the ball player may replace their tag, tap the ball with the foot, and continue play. With a missing tag they may only pass or kick, taking no more than one step.' },
      { text: 'On the sixth tag, the attacking player places the ball down and a changeover is awarded to the defending team.' },
      { text: 'If the ball carrier falls to the ground with a defender within tagging distance, a tag is deemed effected — including when attempting to cross for a try. If any part of the body (other than the feet) touches the ground before the ball is grounded over the try line, no try is awarded if a defender is close enough to tag. The ball carrier plays the ball 5m out. On the last tag, a changeover is awarded 5m out.' },
      { text: 'The dummy half may pass or kick with one or no tags on, taking no more than one step. More than one step = called back, next tag counted.' },
      { text: 'Simultaneous tag/offload: referee calls "Play-on, Simultaneous." Benefit of the doubt goes to the attacking team. The tagged player must replace their tag(s) before progressing the ball again.' },
      { text: 'A player cannot touch their own tag whilst in possession. Doing so = referee calls "Tag".' },
      { text: 'Shirt out while a defender is within tagging distance = referee calls "Tag". Repeated infringements may result in a penalty.' },
      { text: 'Forward pass / knock-on: referee considers advantage play. A knock-on within 10m of the try line results in a changeover 10m out from the try line.' },
    ],
  },
  {
    id: 'kickoff',
    number: '9',
    title: 'Kick-Off Rules',
    intro: 'No kicking team player can dive on the ball from any kick unless nobody from the non-kicking team is within 2m of the ball or the referee deems there is a risk of collision. SAFETY RULE.',
    rules: [
      { text: 'The team winning the toss chooses direction; the other team kick-off. Reversed for the second half.' },
      { text: 'The kick-off is a place kick from the centre of the halfway line. No kicking tee.' },
      { text: 'After a try is scored, the scoring team kick-off to restart play (once the referee has whistled).' },
      { text: 'The ball must travel 10m toward the non-kicking team\'s try line before any player may touch it.' },
      { text: 'The ball must bounce within the field of play before crossing the touch or try line.' },
      { text: 'The kicking team must not cross the kick-off line until the ball is kicked — instant penalty if they do.' },
      { text: 'The receiving team must be at least 10m from the kick-off line at the time of the kick.' },
      { text: '50/10 rule: if the ball bounces in the field and crosses the touchline within 10m of the opponents\' try line, the kicking team receives a play-the-ball 10m in from touch and 10m out from the try line.' },
      { text: 'Dropout: a drop kick from the centre of the try line. Ball must cross the 10m line from the try line before any player may touch it. All dropout infringements result in a penalty 10m out from the try line centre field.' },
    ],
  },
  {
    id: 'knockon',
    number: '10',
    title: 'Knock-On & Knock Back',
    rules: [
      { text: 'A knock-on occurs when a player propels the ball forward with hand or arm and it contacts the ground, an opponent, or the referee. A changeover is awarded to the non-offending team. The referee may allow advantage.' },
      { text: 'Propelling the ball backward = "play-on."' },
      { text: 'If no advantage is gained by the defending team from a knock-on, the ball returns to the point of the knock-on and the defending team receive the changeover.' },
      { text: 'A ball bouncing off the body or head unintentionally is not a knock-on. Intentional propulsion with head or body = contrary to the spirit of the game and the referee may award a penalty.' },
      { text: 'The ball carrier cannot deliberately throw or tap the ball forward past a defender to re-gather — penalty.' },
    ],
  },
  {
    id: 'penalties',
    number: '11',
    title: 'Penalties',
    intro: 'Penalties are taken by a tap kick in any direction after the referee has indicated the mark. A tap kick can travel higher than shoulder height.',
    rules: [
      { text: 'A penalty is awarded for misconduct, provided it is not to the disadvantage of the non-offending team.' },
      { text: 'Tap kick must be taken on the referee\'s mark — if not, the referee stops play and asks the team to retake it.' },
      { text: 'The offending team must retire 10m from the penalty mark (or to the try line if nearer).' },
      { text: 'Further misconduct allows the referee to advance the mark once by 10m (or to the try line).' },
    ],
  },
  {
    id: 'misconduct',
    number: '12',
    title: 'Misconduct, Sin Bin & Send-Offs',
    rules: [
      { text: 'A player is guilty of misconduct if they: trip/kick/strike another player; make intentional/reckless/careless contact when effecting a tag; deliberately break the rules; use offensive language; dispute the referee\'s decision; re-enter without permission; behave contrary to the spirit of the game; deliberately obstruct a player not in possession; or deliberately waste time.' },
      { text: 'Sin bin (yellow card) is used for: blatant disregard of rules, continued infringements, dissent/sledging, repeated contact infringements, fighting, or professional foul. Max suspension: 10 minutes. A sin-binned player cannot be replaced and must stand behind the opposition\'s try line.' },
      { text: 'A dismissed player (red card) results in the team losing 5 points from their game score. A dismissed coach/manager also triggers a mandatory minimum 1-game suspension.' },
      { text: 'If a referee is assaulted or harassed, they must submit a report to the appropriate authority.' },
    ],
  },
  {
    id: 'referee',
    number: '13',
    title: 'Duties of a Referee',
    rules: [
      { text: 'Ensuring the rules are adhered to — the referee is the sole judge of fact.' },
      { text: 'Checking the playing field is safe before play.' },
      { text: 'Inspecting players\' equipment.' },
      { text: 'Recording the score and keeping time (unless delegated).' },
      { text: 'The referee may temporarily suspend or prematurely terminate a game due to adverse weather, spectator interference, player misbehaviour, or any cause they deem necessary.' },
      { text: 'Must carry a whistle and use it to: signal a try, signal the ball out of play, indicate a rule infringement, or when play is irregularly affected.' },
    ],
  },
]

const accentMap: Record<string, string> = {
  '1': 'border-emerald-500',
  '2': 'border-emerald-500',
  '3': 'border-sky-500',
  '4': 'border-indigo-500',
  '5': 'border-violet-500',
  '6': 'border-amber-500',
  '7': 'border-rose-500',
  '8': 'border-orange-500',
  '9': 'border-teal-500',
  '10': 'border-cyan-500',
  '11': 'border-yellow-500',
  '12': 'border-red-500',
  '13': 'border-purple-500',
}

export default function TagRugbyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">

        {/* Header */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-emerald-400 uppercase mb-2">Official Rules</p>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Try Tag Rugby Playing Rules</h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
            The official TTR playing rules as published by the Rugby Football League. Use these as a coaching reference or to
            explain the game to new players. The AI coaching assistant also has full knowledge of these rules — ask it anything.
          </p>
        </div>

        {/* YouTube Video */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Video Overview</h2>
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
            <iframe
              src="https://www.youtube.com/embed/S41yp2DYrvg"
              title="Try Tag Rugby — How to Play"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>

        {/* Quick Reference */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Field', value: '50m × 70m' },
            { label: 'Ball', value: 'Size 5' },
            { label: 'Duration', value: '40 minutes' },
            { label: 'Tags per set', value: '6' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-base font-bold text-emerald-400">{value}</p>
            </div>
          ))}
        </div>

        {/* Rules Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className={`bg-zinc-900 border-l-4 ${accentMap[section.number] ?? 'border-zinc-700'} rounded-r-xl border border-zinc-800 border-l-4 overflow-hidden`}
            >
              <div className="px-5 py-4 border-b border-zinc-800 flex items-baseline gap-3">
                <span className="text-2xl font-black text-zinc-600 tabular-nums">{section.number}</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">{section.title}</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                {section.intro && (
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide bg-amber-400/10 rounded px-2 py-1.5">
                    {section.intro}
                  </p>
                )}
                <ol className="space-y-2 list-none">
                  {section.rules.map((rule, i) => (
                    <li key={i} className="flex gap-3 text-sm text-zinc-300 leading-relaxed">
                      <span className="shrink-0 text-zinc-600 tabular-nums text-xs pt-0.5 w-4">{i + 1}.</span>
                      <span>{rule.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTAs */}
        <div className="border-t border-zinc-800 pt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/chat/ai"
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 transition-colors text-white text-sm font-semibold rounded-lg px-4 py-3 text-center"
          >
            Ask the AI Coaching Assistant
          </Link>
          <Link
            href="/drills"
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-200 text-sm font-semibold rounded-lg px-4 py-3 text-center"
          >
            Browse the Drill Library
          </Link>
        </div>

        <p className="text-xs text-zinc-600 text-center">
          Rules sourced from the official Try Tag Rugby Playing Rules document published by the Rugby Football League.
        </p>
      </div>
    </div>
  )
}
