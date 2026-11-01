export type Category =
  | 'Gastronomie'
  | 'Sport'
  | 'Culture'
  | 'Soirée'
  | 'Plein Air'
  | 'Atelier'
  | 'Jeux'
  | 'Détente'
  | 'Insolite';

export type EnergyLevel = 'Chill' | 'Modéré' | 'Intense';

export type SlotType = 'morning' | 'afternoon' | 'evening';

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: Category;
  duration: string;
  locationType: string;
  energyLevel: EnergyLevel;
  imageUrl?: string;
  accentGradient: string;
  iconName: string;
  isOrganizerCustom?: boolean;
  bestSlots?: SlotType[];
  suggestedParticipants?: string;
}

export interface Proposal {
  id: string;
  activityId: string;
  activityTitle: string;
  friendName: string;
  friendContact?: string;
  note?: string;
  date: string; // YYYY-MM-DD (e.g. '2026-11-14')
  slot: SlotType;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  declineReason?: string;
}

export interface ScheduleSlot {
  date: string; // YYYY-MM-DD
  slot: SlotType;
  proposalId: string;
  activityId: string;
  activityTitle: string;
  friendName: string;
  note?: string;
}

export interface AppNotification {
  id: string;
  type: 'proposal_received' | 'proposal_accepted' | 'proposal_declined' | 'system';
  title: string;
  message: string;
  proposalId?: string;
  friendName?: string;
  activityTitle?: string;
  date?: string;
  slot?: SlotType;
  createdAt: string;
  read: boolean;
}

export interface AppSettings {
  targetYear: number;
  targetMonth: number;
}

export type AppView = 'friend' | 'organizer';
export type OrganizerTab = 'inbox' | 'calendar' | 'activities' | 'ai-studio';
