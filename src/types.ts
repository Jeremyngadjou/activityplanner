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
  monthKey?: string; // e.g. '2026-11' (defaults to '2026-11' if unspecified)
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

export interface SlotParticipant {
  name: string;
  contact?: string;
  note?: string;
  joinedAt: string;
}

export interface ScheduleSlot {
  id?: string;
  date: string; // YYYY-MM-DD
  slot: SlotType;
  proposalId: string;
  activityId: string;
  activityTitle: string;
  friendName: string;
  participants?: SlotParticipant[];
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

export interface ActivitySuggestion {
  id: string;
  title: string;
  description: string;
  suggestedBy: string;
  friendContact?: string;
  category?: Category;
  duration?: string;
  locationType?: string;
  preferredDate?: string;
  preferredSlot?: SlotType;
  monthKey?: string;
  status: 'pending' | 'converted_to_activity' | 'accepted_duo' | 'declined';
  createdAt: string;
  adminNote?: string;
  resultingActivityId?: string;
  resultingSlotDate?: string;
  resultingSlotType?: SlotType;
}

export type AppView = 'friend' | 'organizer';
export type OrganizerTab = 'inbox' | 'suggestions' | 'calendar' | 'activities' | 'ai-studio';
