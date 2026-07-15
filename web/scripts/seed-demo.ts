/**
 * Seeds the local Supabase instance with a realistic demo club for screen
 * recording. Always run after a fresh reset:
 *
 *   supabase db reset && npm run seed:demo
 */
import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const CLUB_SLUG = 'ashfield-rhinos'
const CLUB_NAME = 'Ashfield Rhinos RLFC'
const DEMO_PASSWORD = 'Demo1234!'

interface DemoUser {
  key: string
  email: string
  username: string
  displayName: string
  coachingLevel: string
  bio: string
  clubRole: 'admin' | 'member' | null
  inClub: boolean
}

const DEMO_USERS: DemoUser[] = [
  {
    key: 'headCoach',
    email: 'demo.headcoach@18thman.local',
    username: 'sam-ashfield',
    displayName: 'Sam Ashfield',
    coachingLevel: 'Level 3',
    bio: 'Head coach at Ashfield Rhinos. 12 years in junior and open-age rugby league.',
    clubRole: 'admin',
    inClub: true,
  },
  {
    key: 'assistant1',
    email: 'demo.assistant1@18thman.local',
    username: 'jordan-pike',
    displayName: 'Jordan Pike',
    coachingLevel: 'Level 2',
    bio: 'Assistant coach focused on attack structure and ball skills.',
    clubRole: 'member',
    inClub: true,
  },
  {
    key: 'assistant2',
    email: 'demo.assistant2@18thman.local',
    username: 'priya-shah',
    displayName: 'Priya Shah',
    coachingLevel: 'Level 2',
    bio: 'Defence and conditioning coach.',
    clubRole: 'member',
    inClub: true,
  },
  {
    key: 'assistant3',
    email: 'demo.assistant3@18thman.local',
    username: 'tom-reilly',
    displayName: 'Tom Reilly',
    coachingLevel: 'Level 1',
    bio: 'Runs the junior pathway squads.',
    clubRole: 'member',
    inClub: true,
  },
  {
    key: 'freeCoach',
    email: 'demo.freecoach@18thman.local',
    username: 'casey-morgan',
    displayName: 'Casey Morgan',
    coachingLevel: 'Level 1',
    bio: 'Independent coach exploring 18th Man before joining a club.',
    clubRole: null,
    inClub: false,
  },
]

interface DrillSpec {
  title: string
  description: string
  categorySlug: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  ageGroup: string
  playerCount: string
  authorKey: string
}

const DRILL_SPECS: DrillSpec[] = [
  { title: 'Passing Grid Warm-Up', description: 'Four-corner passing grid to build handling under light pressure.', categorySlug: 'warm-up', difficulty: 'beginner', ageGroup: 'U12-U14', playerCount: '8-12', authorKey: 'headCoach' },
  { title: 'Dynamic Stretch Circuit', description: 'Movement-based warm-up covering hips, hamstrings, and change of direction.', categorySlug: 'warm-up', difficulty: 'beginner', ageGroup: 'U12-U14', playerCount: 'Any', authorKey: 'assistant3' },
  { title: 'Two-on-One Handling', description: 'Overload handling drill developing offload timing and support lines.', categorySlug: 'handling', difficulty: 'intermediate', ageGroup: 'U14-U16', playerCount: '3-6', authorKey: 'assistant1' },
  { title: 'Offload Under Pressure', description: 'Contact handling drill forcing quick offloads before the tackle completes.', categorySlug: 'handling', difficulty: 'advanced', ageGroup: 'U16-Open', playerCount: '4-8', authorKey: 'assistant1' },
  { title: 'Flat-Line Defensive Shape', description: 'Walk-through drill for maintaining a flat defensive line under lateral movement.', categorySlug: 'defence', difficulty: 'intermediate', ageGroup: 'U14-U16', playerCount: '6-10', authorKey: 'assistant2' },
  { title: 'Scramble Defence Game', description: 'Small-sided conditioned game rewarding fast defensive reads after a broken line.', categorySlug: 'defence', difficulty: 'advanced', ageGroup: 'U16-Open', playerCount: '8-12', authorKey: 'assistant2' },
  { title: 'Tackle Technique Progression', description: 'Progressive tackle technique drill from static to live pace.', categorySlug: 'defence', difficulty: 'beginner', ageGroup: 'U12-U14', playerCount: '4-8', authorKey: 'assistant2' },
  { title: 'Set-Piece Tip-On Play', description: 'Structured tip-on move off a play-the-ball, with timing cues for the link runner.', categorySlug: 'set-plays', difficulty: 'intermediate', ageGroup: 'U14-U16', playerCount: '6-10', authorKey: 'headCoach' },
  { title: 'Short-Side Scrum Play', description: 'Scrum-base short-side strike play exploiting a narrow defensive edge.', categorySlug: 'set-plays', difficulty: 'advanced', ageGroup: 'U16-Open', playerCount: '8-13', authorKey: 'headCoach' },
  { title: 'Broken-Field Running Lines', description: 'Running-line drill teaching support angles once the defensive line is broken.', categorySlug: 'attack', difficulty: 'intermediate', ageGroup: 'U14-U16', playerCount: '6-10', authorKey: 'assistant1' },
  { title: 'Attacking Shape vs Drift Defence', description: 'Full-width attacking shape drill designed to beat a drifting defensive line.', categorySlug: 'attack', difficulty: 'advanced', ageGroup: 'U16-Open', playerCount: '10-13', authorKey: 'headCoach' },
  { title: 'Support Play Triangles', description: 'Small-group triangle passing pattern building support-play habits.', categorySlug: 'attack', difficulty: 'beginner', ageGroup: 'U12-U14', playerCount: '3-6', authorKey: 'assistant3' },
  { title: 'Bomb Chase & Contest', description: 'High-ball chase and contest drill for the chasing line and the catcher.', categorySlug: 'kicking', difficulty: 'intermediate', ageGroup: 'U14-U16', playerCount: '4-8', authorKey: 'assistant3' },
  { title: 'Grubber Kick & Recovery', description: 'Grubber kick technique drill paired with a recovery-and-regather race.', categorySlug: 'kicking', difficulty: 'beginner', ageGroup: 'U12-U14', playerCount: '4-6', authorKey: 'assistant3' },
  { title: 'Kick-Return Structure', description: 'Kick-return shape drill covering catcher, first receiver, and support lines.', categorySlug: 'kicking', difficulty: 'advanced', ageGroup: 'U16-Open', playerCount: '8-12', authorKey: 'headCoach' },
  { title: 'Conditioned Fitness Game', description: 'High-intensity conditioned game combining ball skills with repeated effort.', categorySlug: 'fitness', difficulty: 'advanced', ageGroup: 'U16-Open', playerCount: '10-16', authorKey: 'assistant2' },
  { title: 'Interval Shuttle Runs', description: 'Structured shuttle-run interval set for aerobic conditioning.', categorySlug: 'fitness', difficulty: 'beginner', ageGroup: 'U12-U14', playerCount: 'Any', authorKey: 'assistant3' },
  { title: 'Full Contact Wrestle Drill', description: 'Controlled wrestle drill building contact strength and tackle-technique carryover.', categorySlug: 'fitness', difficulty: 'intermediate', ageGroup: 'U14-U16', playerCount: '6-10', authorKey: 'assistant1' },
]

interface CanvasElement {
  id: string
  type: string
  x: number
  y: number
  label?: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

function cone(id: string, x: number, y: number): CanvasElement {
  return { id, type: 'cone', x, y, color: '#f59e0b', size: 'sm' }
}
function attacker(id: string, x: number, y: number, label: string): CanvasElement {
  return { id, type: 'attacker', x, y, label, color: '#3b82f6', size: 'md' }
}
function defender(id: string, x: number, y: number, label: string): CanvasElement {
  return { id, type: 'defender', x, y, label, color: '#ef4444', size: 'md' }
}
function arrow(id: string, x1: number, y1: number, x2: number, y2: number): CanvasElement {
  return { id, type: 'arrow', x: x1, y: y1, x1, y1, x2, y2, color: '#18181b' }
}

function buildDemoCanvas(seed: number): { background: string; elements: CanvasElement[] } {
  const baseX = 150 + (seed % 3) * 150
  const baseY = 150 + (Math.floor(seed / 3) % 3) * 150
  return {
    background: 'full',
    elements: [
      cone(`${seed}-c1`, baseX, baseY),
      cone(`${seed}-c2`, baseX + 200, baseY),
      attacker(`${seed}-a1`, baseX, baseY + 100, '1'),
      defender(`${seed}-d1`, baseX + 200, baseY + 100, '1'),
      arrow(`${seed}-ar1`, baseX, baseY + 100, baseX + 200, baseY + 20),
    ],
  }
}

async function main() {
  // ── Idempotency guard ──────────────────────────────────────────────
  const { data: existingClub } = await supabase
    .from('clubs')
    .select('id')
    .eq('slug', CLUB_SLUG)
    .maybeSingle()
  if (existingClub) {
    console.error(`Demo club "${CLUB_NAME}" already exists. Run "supabase db reset" first, then re-run this script.`)
    process.exit(1)
  }

  // ── Create auth users + basic profile fields ──────────────────────
  const userIds: Record<string, string> = {}
  for (const demoUser of DEMO_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: demoUser.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) {
      console.error(`Failed to create auth user ${demoUser.email}:`, error?.message)
      process.exit(1)
    }
    userIds[demoUser.key] = data.user.id

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        username: demoUser.username,
        display_name: demoUser.displayName,
        bio: demoUser.bio,
        coaching_level: demoUser.coachingLevel,
        role: 'coach',
      })
      .eq('id', data.user.id)
    if (profileError) {
      console.error(`Failed to update profile for ${demoUser.email}:`, profileError.message)
      process.exit(1)
    }
  }
  const headCoachId = userIds.headCoach

  // ── Create the club ─────────────────────────────────────────────────
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .insert({
      name: CLUB_NAME,
      slug: CLUB_SLUG,
      created_by: headCoachId,
      subscription_tier: 'club',
      max_members: 25,
      max_groups: 5,
    })
    .select('id')
    .single()
  if (clubError || !club) {
    console.error('Failed to create demo club:', clubError?.message)
    process.exit(1)
  }
  const clubId = club.id

  // ── Attach club members ─────────────────────────────────────────────
  for (const demoUser of DEMO_USERS.filter(u => u.inClub)) {
    const { error } = await supabase
      .from('profiles')
      .update({ club_id: clubId, club_role: demoUser.clubRole, subscription_tier: 'club' })
      .eq('id', userIds[demoUser.key])
    if (error) {
      console.error(`Failed to attach ${demoUser.email} to the club:`, error.message)
      process.exit(1)
    }
  }

  // ── Fetch category ids ───────────────────────────────────────────────
  const categorySlugs = [...new Set(DRILL_SPECS.map(d => d.categorySlug))]
  const { data: categories, error: categoriesError } = await supabase
    .from('drill_categories')
    .select('id, slug')
    .in('slug', categorySlugs)
  if (categoriesError || !categories) {
    console.error('Failed to fetch drill categories:', categoriesError?.message)
    process.exit(1)
  }
  const categoryIdBySlug = Object.fromEntries(categories.map(c => [c.slug, c.id]))

  // ── Seed drills ───────────────────────────────────────────────────────
  const drillIds: string[] = []
  for (let i = 0; i < DRILL_SPECS.length; i++) {
    const spec = DRILL_SPECS[i]
    const { data: drill, error } = await supabase
      .from('drills')
      .insert({
        title: spec.title,
        description: spec.description,
        category_id: categoryIdBySlug[spec.categorySlug],
        canvas_json: buildDemoCanvas(i),
        author_id: userIds[spec.authorKey],
        difficulty: spec.difficulty,
        age_group: spec.ageGroup,
        player_count: spec.playerCount,
        is_public: true,
        club_id: clubId,
        approval_status: 'approved',
      })
      .select('id')
      .single()
    if (error || !drill) {
      console.error(`Failed to create drill "${spec.title}":`, error?.message)
      process.exit(1)
    }
    drillIds.push(drill.id)
  }

  // ── Seed a few drill ratings ─────────────────────────────────────────
  const ratings = [
    { drillIndex: 0, raterKey: 'assistant1', rating: 5, comment: 'Great way to open a session, kids love it.' },
    { drillIndex: 2, raterKey: 'headCoach', rating: 4, comment: 'Works well once they know the pattern.' },
    { drillIndex: 5, raterKey: 'assistant3', rating: 5, comment: 'Best scramble drill we run.' },
    { drillIndex: 9, raterKey: 'assistant2', rating: 4, comment: 'Good for building support lines.' },
  ]
  for (const r of ratings) {
    const { error } = await supabase.from('drill_ratings').insert({
      drill_id: drillIds[r.drillIndex],
      user_id: userIds[r.raterKey],
      rating: r.rating,
      comment: r.comment,
    })
    if (error) {
      console.error('Failed to create drill rating:', error.message)
      process.exit(1)
    }
  }

  // ── Seed session plans ────────────────────────────────────────────────
  const { error: plan1Error } = await supabase.from('session_plans').insert({
    title: 'Week 1 — Ball Handling & Passing',
    coach_id: headCoachId,
    drills_order: [
      { drill_id: drillIds[0], duration_minutes: 15, notes: 'Focus on quick hands.' },
      { drill_id: drillIds[2], duration_minutes: 25, notes: 'Progress to live defenders after 10 minutes.' },
      { drill_id: drillIds[3], duration_minutes: 20, notes: '' },
    ],
    total_duration: 60,
    is_shared: false,
  })
  if (plan1Error) {
    console.error('Failed to create session plan 1:', plan1Error.message)
    process.exit(1)
  }

  // ── Seed coaching group + membership ─────────────────────────────────
  const { data: group, error: groupError } = await supabase
    .from('coaching_groups')
    .insert({ name: 'Rhinos Coaching Staff', club_id: clubId, created_by: headCoachId })
    .select('id')
    .single()
  if (groupError || !group) {
    console.error('Failed to create coaching group:', groupError?.message)
    process.exit(1)
  }
  const groupId = group.id

  const groupMembers = [
    { key: 'headCoach', role: 'admin' as const },
    { key: 'assistant1', role: 'member' as const },
    { key: 'assistant2', role: 'member' as const },
    { key: 'assistant3', role: 'member' as const },
  ]
  for (const member of groupMembers) {
    const { error } = await supabase.from('group_invitations').insert({
      group_id: groupId,
      user_id: userIds[member.key],
      invited_by: headCoachId,
      status: 'accepted',
      group_role: member.role,
    })
    if (error) {
      console.error(`Failed to add ${member.key} to the coaching group:`, error.message)
      process.exit(1)
    }
  }

  // ── Seed a shared group session plan ──────────────────────────────────
  const { error: plan2Error } = await supabase.from('session_plans').insert({
    title: 'Pre-Season Full Run',
    coach_id: headCoachId,
    group_id: groupId,
    drills_order: [
      { drill_id: drillIds[7], duration_minutes: 20, notes: 'Walk through twice before live.' },
      { drill_id: drillIds[10], duration_minutes: 25, notes: '' },
      { drill_id: drillIds[15], duration_minutes: 30, notes: 'Finish with this — high intensity.' },
    ],
    total_duration: 75,
    is_shared: true,
  })
  if (plan2Error) {
    console.error('Failed to create shared session plan:', plan2Error.message)
    process.exit(1)
  }

  // ── Seed a community thread ───────────────────────────────────────────
  const { data: communityThread, error: threadError } = await supabase
    .from('conversations')
    .insert({ title: 'Pre-season conditioning ideas?', type: 'community', created_by: headCoachId })
    .select('id')
    .single()
  if (threadError || !communityThread) {
    console.error('Failed to create community thread:', threadError?.message)
    process.exit(1)
  }
  const communityThreadId = communityThread.id

  const communityParticipants = ['headCoach', 'assistant1', 'assistant2', 'assistant3']
  for (const key of communityParticipants) {
    const { error } = await supabase.from('conversation_participants').insert({
      conversation_id: communityThreadId,
      user_id: userIds[key],
    })
    if (error) {
      console.error(`Failed to add ${key} to community thread:`, error.message)
      process.exit(1)
    }
  }

  const communityMessages = [
    { senderKey: 'headCoach', content: 'Kicking off preseason planning — thoughts on conditioning blocks?' },
    { senderKey: 'assistant2', content: "I'd like to trial the interval shuttle runs twice a week." },
    { senderKey: 'assistant1', content: "Agreed, let's pair it with the wrestle drill for contact prep." },
  ]
  for (const msg of communityMessages) {
    const { error } = await supabase.from('messages').insert({
      conversation_id: communityThreadId,
      sender_id: userIds[msg.senderKey],
      content: msg.content,
    })
    if (error) {
      console.error('Failed to create community message:', error.message)
      process.exit(1)
    }
  }

  // ── Seed a DM ─────────────────────────────────────────────────────────
  const { data: dm, error: dmError } = await supabase
    .from('conversations')
    .insert({ type: 'dm', created_by: headCoachId })
    .select('id')
    .single()
  if (dmError || !dm) {
    console.error('Failed to create DM conversation:', dmError?.message)
    process.exit(1)
  }
  const dmId = dm.id

  for (const key of ['headCoach', 'assistant1']) {
    const { error } = await supabase.from('conversation_participants').insert({
      conversation_id: dmId,
      user_id: userIds[key],
    })
    if (error) {
      console.error(`Failed to add ${key} to DM:`, error.message)
      process.exit(1)
    }
  }

  const dmMessages = [
    { senderKey: 'headCoach', content: 'Can you run the two-on-one handling drill with the U15s Thursday?' },
    { senderKey: 'assistant1', content: "Yep, I'll set it up at 4:30." },
    { senderKey: 'headCoach', content: "Perfect, I'll bring the session plan PDF." },
    { senderKey: 'assistant1', content: 'Sounds good, see you there.' },
  ]
  for (const msg of dmMessages) {
    const { error } = await supabase.from('messages').insert({
      conversation_id: dmId,
      sender_id: userIds[msg.senderKey],
      content: msg.content,
    })
    if (error) {
      console.error('Failed to create DM message:', error.message)
      process.exit(1)
    }
  }

  // ── Done — print credentials ──────────────────────────────────────────
  console.log('\nDemo data seeded successfully.\n')
  console.log('Login credentials (password is the same for all):')
  console.log(`  Password: ${DEMO_PASSWORD}\n`)
  for (const demoUser of DEMO_USERS) {
    console.log(`  ${demoUser.displayName.padEnd(16)} ${demoUser.email}`)
  }
  console.log(`\nClub: ${CLUB_NAME} (${drillIds.length} drills, 2 session plans, 1 coaching group)\n`)
}

main().catch(err => {
  console.error('Seed script failed:', err)
  process.exit(1)
})
