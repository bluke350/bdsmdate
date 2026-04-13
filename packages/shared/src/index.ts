export type Role = "dom" | "sub" | "switch" | "exploring";

export interface UserProfile {
  id: string;
  displayName: string;
  age: number;
  role: Role;
  bio: string;
  verified: boolean;
  intent?: "play_only" | "relationship" | "exploring";
  experienceLevel?: "new" | "some" | "experienced";
  aftercare?: "light" | "medium" | "high";
  sceneTypes?: string[];
  hardLimits?: string[];
  kinkTags?: string[];
  safeword?: string;
  boundaries?: string;
  relationshipStyle?: "monogamous" | "open" | "poly" | "kink_only" | "casual";
  availability?: "weeknights" | "weekends" | "flexible";
  playLocation?: "private" | "club" | "outdoors" | "travel";
  aftercarePreferences?: string[];
  aftercareNotes?: string;
  softLimits?: string[];
  limitsNotes?: string;
  lastActiveAt?: string;
  boostedUntil?: string;
  photoKey?: string;
  photoKeys?: string[];
  compatibilityScore?: number;
  smartPrompts?: string[];
  seenToday?: boolean;
}

export interface SubscriptionStatus {
  userId: string;
  status: "active" | "canceled";
  startedAt: string;
  weeklyCredits: number;
  nextWeeklyCreditAt: string;
  boostBalance: number;
}

export interface Match {
  userId: string;
  matchedUserId: string;
  matchedAt: string;
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  body: string;
  priority?: boolean;
  sentAt: string;
}
