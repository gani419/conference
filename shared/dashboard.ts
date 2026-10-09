export const dashboardTabs = [
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar' },
  { id: 'recent', label: 'Recent', icon: 'clock' },
  { id: 'invitations', label: 'Invitations', icon: 'inbox' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
] as const;
export type DashboardTab = (typeof dashboardTabs)[number]['id'];
