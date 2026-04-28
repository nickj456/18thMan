export const EMAIL_CATEGORIES = [
  { key: 'dm', label: 'Direct messages', group: 'Notifications' },
  { key: 'drill_rating', label: 'Drill ratings & comments', group: 'Notifications' },
  { key: 'club_invite', label: 'Club & group invites', group: 'Notifications' },
  { key: 'new_follower', label: 'New followers', group: 'Notifications' },
  { key: 'session_scheduled', label: 'Sessions scheduled', group: 'Notifications' },
  { key: 'weekly_focus', label: 'Weekly focus published', group: 'Club & Content' },
  { key: 'new_public_drill', label: 'New public drills', group: 'Club & Content' },
  { key: 'podcast', label: 'New podcast episodes', group: 'Club & Content' },
  { key: 'wellbeing', label: 'New wellbeing resources', group: 'Club & Content' },
  { key: 'announcement', label: 'Feature announcements & polls', group: 'Platform' },
] as const

export type EmailCategoryKey = (typeof EMAIL_CATEGORIES)[number]['key']
